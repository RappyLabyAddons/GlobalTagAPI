import Elysia, { t } from "elysia";
import { validJWTSession } from "../libs/SessionValidator";
import players from "../database/schemas/players";
import * as config from "../../config.json";

export default new Elysia({
    prefix: "/icon"
}).post(`/`, async ({ error, params, headers, body }) => { // Change icon
    const uuid = params.uuid.replaceAll(`-`, ``);
    const icon = body.icon.toUpperCase();
    const { authorization } = headers;
    const authenticated = authorization && validJWTSession(authorization, uuid, true);

    if(authorization == `0`) return error(401, { error: `You need a premium account to use this feature!` });
    if(!authenticated) return error(401, { error: `You're not allowed to perform that request!` });

    const player = await players.findOne({ uuid });
    if(!player) return error(404, { error: `You don't have a tag!` });
    if(player.isBanned()) return error(403, { error: `You are banned!` });
    if(!player.tag) return error(404, { error: `Please set a tag first!` });
    if(icon == player.icon) return error(400, { error: `You already chose this icon!` });
    if(config.validation.icon.blacklist.includes(icon.toLowerCase())) return error(422, { error: `You're not allowed to choose this icon!` });

    player.icon = icon;
    await player.save();

    return { message: `Your icon was successfully set!` };
}, {
    detail: {
        tags: ['Settings'],
        description: `Change the icon which is displayed next to your global tag`
    },
    response: {
        200: t.Object({ message: t.String() }, { description: `The icon was successfully changed` }),
        400: t.Object({ error: t.String() }, { description: `You tried chose an icon that you're already using.` }),
        401: t.Object({ error: t.String() }, { description: `You're not authenticated with LabyConnect.` }),
        403: t.Object({ error: t.String() }, { description: `You're banned.` }),
        404: t.Object({ error: t.String() }, { description: `You don't have a tag to change the icon of.` }),
        422: t.Object({ error: t.String() }, { description: `You're lacking the validation requirements.` }),
        429: t.Object({ error: t.String() }, { description: `You're ratelimited.` }),
        503: t.Object({ error: t.String() }, { description: `Database is not reachable.` })
    },
    body: t.Object({ icon: t.String({ error: `Missing field "icon".` }) }, { error: `Missing field "icon".` }),
    params: t.Object({ uuid: t.String({ description: `Your UUID` }) }),
    headers: t.Object({ authorization: t.String({ error: `You're not authorized!`, description: `Your LabyConnect JWT` }) }, { error: `You're not authorized!` })
});