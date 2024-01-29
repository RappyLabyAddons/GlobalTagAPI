const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const express = require(`express`);
const router = express.Router();

router.route(`/:uuid`)
.get(async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.getTag)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(server.cfg.requireSessionIds && !authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.noTag`) });
    if(player.isBanned()) return res.status(403).send({ error: req.i18n(`ban.player`) });

    res.send({
        uuid: player.uuid,
        tag: player.tag,
        position: player.position,
        icon: player.icon,
        admin: player.admin
    });
}).post(async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changeTag)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { tag } = req.body;
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });
    
    const player = await server.db.players.findOne({ uuid });
    if(player && player.isBanned()) return res.status(403).send({ error: req.i18n(`ban.self`) });
    const { minTag, maxTag } = server.cfg.validation;
    if(!tag || tag.length <= minTag || tag.length > maxTag) return res.status(400).send({ error: req.i18n(`setTag.validation`).replace(`<min>`, minTag).replace(`<max>`, maxTag) });
    if([`labymod`].some((word) => {
        if(tag.replace(/(&|§)[0-9A-FK-ORX]/gi, ``).toLowerCase().includes(word)) {
            res.status(400).send({ error: req.i18n(`setTag.bannedWord`).replace(`<word>`, word) });
            return true;
        } else return false;
    })) return;

    if(!player) {
        await new server.db.players({
            uuid,
            tag,
            history: [tag]
        }).save();
        
        res.status(201).send({ message: req.i18n(`setTag.success`) });
    } else {
        if(player.tag == tag) return res.status(400).send({ error: req.i18n(`setTag.alreadySet`) });

        player.tag = tag;
        if(player.history[player.history.length - 1] != tag) player.history.push(tag);
        await player.save();
        
        res.status(200).send({ message: req.i18n(`setTag.success`) });
    }
}).delete(async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changeTag)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`resetTag.noTag`) });
    if(player.isBanned()) return res.status(403).send({ error: req.i18n(`ban.self`) });
    if(!player.tag) return res.status(404).send({ error: req.i18n(`resetTag.noTag`) });

    player.tag = null;
    await player.save();

    res.status(200).send({ message: req.i18n(`resetTag.success`) });
});

router.post(`/:uuid/position`, async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changePosition)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const position = req.body.position?.toUpperCase();
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.setTag`) });
    if(player.isBanned()) return res.status(403).send({ error: req.i18n(`ban.self`) });
    if(!player.tag) return res.status(404).send({ error: req.i18n(`general.setTag`) });
    if(!position || ![`ABOVE`, `BELOW`, `RIGHT`, `LEFT`].includes(position)) return res.status(400).send({ error: req.i18n(`setPosition.invalid`) });
    if(position == player.position) return res.status(400).send({ error: req.i18n(`setPosition.alreadySet`) });

    player.position = position;
    await player.save();

    res.status(200).send({ message: req.i18n(`setPosition.success`) });
});

router.post(`/:uuid/icon`, async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.changeIcon)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const icon = req.body.icon?.toUpperCase();
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.setTag`) });
    if(player.isBanned()) return res.status(403).send({ error: req.i18n(`ban.self`) });
    if(!player.tag) return res.status(404).send({ error: req.i18n(`general.setTag`) });
    if(!icon) return res.status(400).send({ error: req.i18n(`setIcon.invalid`) });
    if(icon == player.icon) return res.status(400).send({ error: req.i18n(`setIcon.alreadySet`) });

    player.icon = icon;
    await player.save();

    res.status(200).send({ message: req.i18n(`setIcon.success`) });
});

router.route(`/:uuid/ban`)
.get(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const executor = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return res.status(403).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.playerNotFound`) });

    res.status(200).send({ banned: player.isBanned(), reason: player.isBanned() ? player.ban.reason || null : null });
}).post(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const executor = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return res.status(403).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.playerNotFound`) });
    if(player.isBanned()) return res.status(409).send({ error: req.i18n(`ban.alreadyBanned`) });

    player.ban.active = true;
    player.ban.reason = req.body.reason || req.i18n(`general.noReason`);
    await player.save();

    res.status(200).send({ message: req.i18n(`ban.addedBan`) });
}).delete(async (req, res) => {
    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const executor = await server.db.players.findOne({ uuid: server.util.getUuidByJWT(authorization) });
    if(!executor || !executor.admin) return res.status(403).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.playerNotFound`) });
    if(!player.isBanned()) return res.status(409).send({ error: req.i18n(`ban.notBanned`) });

    player.ban.active = false;
    player.ban.reason = null;
    await player.save();

    res.status(200).send({ message: req.i18n(`ban.removedBan`) });
});

router.post(`/:uuid/report`, async (req, res) => {
    if(server.util.ratelimitResponse(req, res, server.ratelimit.report)) return;

    const uuid = req.params.uuid.replaceAll(`-`, ``);
    const { authorization } = req.headers;
    const authenticated = authorization && server.util.validJWTSession(authorization, uuid, false);

    if(authorization == `0`) return res.status(401).send({ error: req.i18n(`general.noPremium`) });
    if(!authenticated) return res.status(401).send({ error: req.i18n(`general.notAllowed`) });

    const player = await server.db.players.findOne({ uuid });
    if(!player) return res.status(404).send({ error: req.i18n(`general.noTag`) });
    if(player.isBanned()) return res.status(403).send({ error: req.i18n(`ban.alreadyBanned`) });
    if(player.admin) return res.status(403).send({ error: req.i18n(`report.admin`) });
    if(!player.tag) return res.status(404).send({ error: req.i18n(`general.noTag`) });

    const reporterUuid = server.util.getUuidByJWT(authorization);
    // const reporter = await server.db.players.findOne({ uuid: reporterUuid });
    // if(reporter && reporter.isBanned()) return res.status(403).send({ error: req.i18n(`ban.self`) });

    if(reporterUuid == uuid) return res.status(400).send({ error: req.i18n(`report.self`) });
    if(player.reports.some((report) => report.by == reporterUuid && report.reportedName == player.tag)) return res.status(400).send({ error: req.i18n(`report.alreadyReported`) });
    const { reason } = req.body;
    if(!reason || typeof reason != 'string' || reason.trim() == ``) return res.status(400).send({ error: req.i18n(`report.reason`) });

    player.reports.push({
        by: reporterUuid,
        reportedName: player.tag,
        reason
    });
    await player.save();

    if(server.cfg.bot.enabled && server.cfg.bot.reports.active) bot.client.channels.cache.get(bot.cfg.reports.channel).send({
        content: bot.cfg.reports.content,
        embeds: [
            new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle(`New report!`)
            .addFields([
                {
                    name: `Reported UUID`,
                    value: `\`\`\`${player.uuid}\`\`\``
                },
                {
                    name: `Reported Tag`,
                    value: `\`\`\`${player.tag}\`\`\``
                },
                {
                    name: `Reporter UUID`,
                    value: `\`\`\`${reporterUuid}\`\`\``
                },
                {
                    name: `Reason`,
                    value: `\`\`\`${reason}\`\`\``
                }
            ])
        ],
        components: [
            new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                .setLabel(`Ban`)
                .setCustomId(`ban`)
                .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                .setLabel(`Clear tag`)
                .setCustomId(`clearTag`)
                .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                .setLabel(`Finish action`)
                .setCustomId(`finishAction`)
                .setStyle(ButtonStyle.Success),
            )
        ]
    });
    res.status(200).send({ message: req.i18n(`report.success`) });
});

module.exports = router;