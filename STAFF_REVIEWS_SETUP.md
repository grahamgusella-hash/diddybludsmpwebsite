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

## Private applicant interviews

The website now includes a **Join Interview** link to:
https://diddybludsmpwebsite.onrender.com/interview

1. An applicant submits a role application and keeps their **application ID**.
2. Authorized staff sign in at https://diddybludsmpwebsite.onrender.com/staff.
3. Find the application and click **Start private interview**. The site generates a unique 32-character invite code and displays it to staff once.
4. Staff privately send the applicant the application ID, the code, and the interview URL (for example, using a Discord direct message). Do not post codes in public channels.
5. The applicant enters their ID and code. Staff and the applicant exchange text questions and answers on the website. Messages refresh about every 10–12 seconds.
6. Staff can **End interview**, **Accept**, or **Deny** the application. Accept/deny closes any active interview and does not automatically assign a privileged rank.

Interview codes are held only as SHA-256 hashes in the backend data file; the generated plaintext code is returned only once to the staff member starting the interview. Starting a new interview invalidates the previous code and clears the previous interview's conversation. The data shares the bridge's existing JSON-file persistence limitations; for reliable long-term storage, use a database or persistent disk. This is text interview messaging, not voice/video calls.

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
