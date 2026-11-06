# Diddyblud Lifesteal — bridge setup

## Current state
The website has working UI for statistics, staff applications, and rank/reward requests. The Node bridge in `bridge/` provides Discord integration, REST endpoints, and a Minecraft command queue. **The existing Paper plugin does not yet include a bridge client**, so Minecraft chat, stats syncing, announcements, kick requests, and rank grants will not work until that client is implemented, built, and installed. The bridge must be deployed separately; GitHub Pages cannot run it.

## Deploy the bridge
1. Create a Discord application at https://discord.com/developers/applications and add a bot. Enable the Message Content intent for Discord-to-Minecraft chat.
2. Invite it to your Discord server with permission to read/send messages in the designated channels and use application commands.
3. Deploy the `bridge` folder as a persistent Node.js service (Node 20+), start command `npm start`, install command `npm install`. Use a persistent disk for `DATA_FILE`; otherwise applications and order records may disappear on restart.
4. Set the environment variables shown in `bridge/.env.example` in the hosting dashboard. Generate a random `BRIDGE_SECRET` of at least 24 characters. Keep `DISCORD_TOKEN` and `BRIDGE_SECRET` private.
5. Configure `SITE_ORIGIN=https://grahamgusella-hash.github.io` for the GitHub Pages site, or your actual custom domain origin if used.
6. In website `index.html`, set `CONFIG.bridgeURL` to the HTTPS URL of your deployed bridge, without a trailing slash. Never put credentials in `index.html`.
7. Test `/health`, then submit an application and verify it arrives in your Discord applications channel.

## Minecraft integration still needed
A Paper plugin client must send authenticated `POST /api/server/sync` requests periodically, including a `players` array and optional `chat` lines. The response has a `commands` array. The client should execute only allowlisted actions (chat, announce, kick, rank), on the Minecraft main thread, and use an asynchronous HTTP worker so server ticks never block. Validate player names and rank identifiers. Reuse existing rank and economy APIs rather than guessing commands.

**Security notes:** the bridge uses a shared bearer secret for Minecraft syncing. Keep it only in the Paper server's private configuration. Website applications and rank requests are untrusted and do not prove identity or payment. Never automatically grant a paid rank from a public form. A staff approval must follow independently verified payment and ownership. For production use, add verified Minecraft/Discord account linking, a real payment provider with verified webhooks, database-backed durable command delivery/acknowledgments, abuse prevention, and audit logging before accepting money.

## Repositories
- Website and Node bridge: https://github.com/grahamgusella-hash/diddybludsmpwebsite
- Existing Paper plugin: https://github.com/grahamgusella-hash/diddybludlifesteal
