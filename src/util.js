const { Request, Response, NextFunction } = require('express');
const jwt = require(`jsonwebtoken`);
const moment = require(`moment`);
const { exec } = require('child_process');
const lang = require(`../locales/en_us.json`);
const { existsSync } = require('fs');

module.exports = {

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */

    log(req, res, next) {
        const version = req.headers[`x-addon-version`] ? `Addon v${req.headers[`x-addon-version`]}` : `API`;
        const time = moment(new Date()).format(server.cfg.logTimeFormat);
    
        if(req.path != `/ping`) console.log(`[${time}] ${req.method.toUpperCase()} ${req.path} [${version}] [${!!req.headers.authorization ? `` : `NO `}AUTH] [${req.language.toUpperCase()}]`);
        next();
    },

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */

    i18n(req, res, next) {
        req.language = req.headers[`x-language`] || `en_us`;
        const locales = server.util.getLocales(req.language);
        req.i18n = (path) => server.util.getPathValue(locales, path);

        next();
    },

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {NextFunction} next 
     */

    catchError(req, res, next) {
        res.status(404).send({
            error: `404: Not Found`
        });
    },

    /**
     * 
     * @param {string} sessionId 
     * @param {string} uuid 
     * @param {boolean} equal 
     */

    validJWTSession(token, uuid, equal) {
        const tokenUuid = this.getUuidByJWT(token);
        if(equal) return tokenUuid === uuid;
        else return !!tokenUuid;
    },

    /**
     * 
     * @param {string} token 
     * @returns {string?}
     */

    getUuidByJWT(token) {
        const decodedToken = jwt.decode(token, { complete: true });
        if(!decodedToken) return null;
        if(decodedToken.payload.iss != `LabyConnect`) return null;
        
        try {
            const verifiedToken = jwt.verify(token, server.cfg.labyConnect);
    
            return verifiedToken.uuid?.replaceAll(`-`, ``);
        } catch(err) {
            return null;
        }
    },

    /**
     * @typedef {{ players: Map<String, { requests: number, timestamp: number }>, max: number, time: number }} RateLimit
     */

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {RateLimit} ratelimit 
     * @returns 
     */

    ratelimitResponse(req, res, ratelimit) {
        if(!server.cfg.ratelimit.active) return false;
        const ratelimitData = server.util.getRatelimitData(req.ip, ratelimit);
        res.setHeader(`X-RateLimit-Limit`, ratelimit.max);
        if(!ratelimitData.limited) res.setHeader(`X-RateLimit-Remaining`, ratelimitData.remaining); // ik this looks weird but the order of the headers is important
        res.setHeader(`X-RateLimit-Reset`, ratelimitData.reset / 1000);
        if(ratelimitData.limited) {
            res.status(429).send({ error: `You're being ratelimited! Please try again in ${Math.ceil(ratelimitData.reset / 1000)} seconds!` });
            return true;
        }
        return false;
    },

    /**
     * 
     * @param {string} ip 
     * @param {RateLimit} ratelimit 
     * @returns {{ reset: number } & ({ limited: true } | { limited: false, remaining: number })}
     */

    getRatelimitData(ip, ratelimit) {
        const player = ratelimit.players.get(ip);
        if(!player) {
            ratelimit.players.set(ip, {
                requests: 1,
                timestamp: Date.now()
            });
            return {
                remaining: ratelimit.max - 1,
                limited: false,
                reset: ratelimit.time
            };
        };
        if(Date.now() - player.timestamp >= ratelimit.time) {
            ratelimit.players.delete(ip);
            return this.getRatelimitData(ip, ratelimit);
        }
        return {
            limited: player.requests++ >= ratelimit.max,
            remaining: ratelimit.max - player.requests,
            reset: player.timestamp + ratelimit.time - Date.now()
        };
    },

    pullNewTranslations() {
        exec(`"${__dirname}/../sync.sh"`, (error, stdout, stderr) => {
            for(const file of readdirSync(`./locales`).filter(file => file.endsWith(`.json`))) {
                delete require.cache[require.resolve(`../locales/${file}`)];
            }
            lang = require(`../locales/en-US.json`);
        }); 
    },

    /**
     * 
     * @param {string} language 
     * @returns {lang}
     */

    getLocales(language) {
        if(existsSync(`./locales/${language}.json`)) return require(`../locales/${language}.json`);
        else return lang;
    },

    /**
     * 
     * @param {lang} locales 
     * @param {string} path 
     * @returns {string}
     */

    getPathValue(locales, path) {
        if(typeof locales != `object` || typeof path != `string`) return path;
        let value = locales;

        for(const key of path.split(`.`)) {
            if(!value[key]) return path;
            value = value[key];
        }

        return value;
    },
}