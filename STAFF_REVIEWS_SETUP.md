# Diddyblud Lifesteal — Staff Application Reviews

## Public website
The Minecraft server IP displayed on the website is:

`diddybludslifesteal.falixsrv.me`

The homepage has a **Staff Reviews** link. The staff dashboard itself is served by the private Render backend:
https://diddybludsmpwebsite.onrender.com/staff

## Enable Discord sign-in (required)
1. Open https://discord.com/developers/applications and select the same Discord application used by the Render bot.
2. In **OAuth2**, add this exact Redirect URI:
   `https://diddybludsmpwebsite.onrender.com/auth/callback`
3. Copy the OAuth2 **Client Secret** from the Discord Developer Portal. **Keep it private.**
4. In your **Render Web Service > Environment**, add `DISCORD_CLIENT_SECRET` with the Client Secret. Never add this to GitHub Pages, `index.html`, or a public repository.
5. Ensure `DISCORD_GUILD_ID` is the correct Discord server ID. Optionally set `DISCORD_STAFF_ROLE_ID` to the ID of a Discord role whose members may review applications. Discord server administrators and server owner are allowed too.
6. Set `PUBLIC_BRIDGE_URL=https://diddybludsmpwebsite.onrender.com` (exact HTTPS origin without trailing slash); then deploy/redeploy Render.
7. Visit https://diddybludsmpwebsite.onrender.com/staff and click **Sign in with Discord**.

## Staff review behavior
- New applications are forwarded to the configured Discord applications channel, then appear in the dashboard.
- Accept and Deny require authenticated Discord staff or administrator membership and a valid same-origin request.
- The panel shows applicant Minecraft and Discord names, requested role, reasons, submitted time, and decision status.
- A decision updates the saved application, records the reviewer's Discord ID and timestamp, and posts a result to the configured applications channel.
- **Accepting does not automatically grant any privileged Minecraft or Discord role.** A staff member must arrange/perform that assignment. This avoids granting admin permissions based on unverified usernames.
- Duplicate reviews are rejected.
- Staff sessions expire after eight hours and are lost when Render restarts. Login again as necessary.

## Storage warning
The bridge currently persists applications to a JSON file (configured through `DATA_FILE`). On Render without a persistent disk, app decisions and old applications may be lost when an instance is recreated. Configure persistent storage or a proper database before relying on this for important applications.

## Website deployment
The GitHub Pages site is updated independently from the Render backend. The public website links to the staff portal on Render because staff sessions need a secure first-party cookie. GitHub Pages must **not** store staff credentials or tokens.
