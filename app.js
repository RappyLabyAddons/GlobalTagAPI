const express = require(`express`);
const http = require(`http`);
const parser = require(`body-parser`);
const moment = require(`moment`);
const { readdirSync } = require(`fs`);
const app = express();
app.use(parser.json());
app.disable(`x-powered-by`);

// Server configuration
global.server = {};
server.cfg = require(`./config.json`);
server.util = require(`./src/util`);
app.set(`trust proxy`, server.cfg.proxied);

// Database
server.db = {};
server.db.connection = require(`./src/database/connection`);
server.db.players = require(`./src/database/schemas/player`);

/**
 * @typedef {Map<String, { requests: number, timestamp: number }>} PlayerMap
 */

// Ratelimit
server.ratelimit = {};
server.ratelimit.getTag = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.getTag.max,
    time: server.cfg.ratelimit.getTag.seconds * 1000
};
server.ratelimit.changeTag = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.changeTag.max,
    time: server.cfg.ratelimit.changeTag.seconds * 1000
};
server.ratelimit.changePosition = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.changePosition.max,
    time: server.cfg.ratelimit.changePosition.seconds * 1000
}
server.ratelimit.report = {
    /**
     * @type {PlayerMap}
     */
    players: new Map(),
    max: server.cfg.ratelimit.reportPlayer.max,
    time: server.cfg.ratelimit.reportPlayer.seconds * 1000
};

server.http = http.createServer(app).listen(server.cfg.port, async () => {
    console.log(`[SERVER] HTTP listening on Port ${server.cfg.port}`);

    await server.db.connection.connect(server.cfg.srv);
    if(server.cfg.bot.enabled) require(`./bot`);
});

app.use((req, res, next) => {
    const version = req.headers[`x-addon-version`] ? `Addon v${req.headers[`x-addon-version`]}` : `API`;
    const time = moment(new Date()).format(server.cfg.logTimeFormat);

    if(req.path != `/ping`) console.log(`[${time}] ${req.method.toUpperCase()} ${req.path} [${version}] [${!!req.headers.authorization ? `` : `NO `}AUTH]`);
    next();
});

app.get(`/`, (req, res) => {
    res.send({
        version: require(`./package.json`).version
    });
});

app.get(`/ping`, (req, res) => {
    res.status(204).send();
})

readdirSync(`./src/routes`).filter(file => file.endsWith(`.js`)).forEach(file => {
    /**
     * @type {express.IRouter}
     */
    const route = require(`./src/routes/${file}`);

    app.use(`/${file.slice(0, -3)}`, route);
    route.use(server.util.catchError);
    console.log(`[SERVER] Loaded Route /${file.slice(0, -3)}`);
});

app.use(server.util.catchError);