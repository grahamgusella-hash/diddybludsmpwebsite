# Diddyblud Lifesteal — Website Support Tickets

## What was added
- Player ticket page: https://diddybludsmpwebsite.onrender.com/tickets
- Staff inbox: https://diddybludsmpwebsite.onrender.com/staff#tickets
- Public GitHub Pages homepage links to both.
- Categories: General Support, Bug Report, Player Report, Appeal, Shop / Rank Help, Other.

## Player workflow
1. Open the ticket page, enter a Minecraft username, Discord username, category, subject and message.
2. The page returns a 12-character ticket ID and a **48-character random access code**. Save both immediately; the code is shown only when the ticket is created.
3. Use the **Open an existing ticket** form and those details to read replies and send more messages.
4. Ticket statuses: **open**, **answered**, **closed**. Replying reopens an answered ticket to open status; closed tickets require staff to reopen them.
5. The page refreshes messages approximately every 12 seconds.

## Staff workflow
1. Configure Discord OAuth using [STAFF_REVIEWS_SETUP.md](STAFF_REVIEWS_SETUP.md), then sign in at the Render staff page.
2. Find **Support Tickets** below the applications dashboard.
3. Read each private conversation, send replies, and close or reopen requests.
4. Tickets are private and require either the ticket's one-time-issued access code or a currently authorized Discord staff session.
5. Optionally add **DISCORD_TICKETS_CHANNEL_ID** in Render to notify a Discord channel when new tickets arrive. Do not post private access codes in Discord.

## Security and reliability
- The backend stores a SHA-256 hash of the random ticket access code rather than the plaintext code.
- Player credentials are verified for each ticket access and message request. Staff role/administrator permission is checked against Discord for each staff request.
- The ticket creation endpoint is rate-limited and input lengths are capped. Public content is rendered with textContent, not HTML interpretation.
- **Website tickets are support requests only.** A ticket response or closing action does not automatically grant ranks, change player balances, or perform Minecraft staff commands.
- Ticket creation currently does not verify that the Minecraft username belongs to the ticket creator. Protect ticket access codes and use independent evidence for serious reports.
- **Critical: the existing bridge stores tickets in a JSON file (DATA_FILE). Render instances without persistent storage can lose all tickets and replies on restarts/redeploys.** Set up a persistent disk or database before relying on tickets as durable history; a persistent disk is not supported on some Render plans. The application is currently single-instance and file-backed.
- Ticket codes should not be placed in URLs, public Discord channels, or screenshots.

## Deployment
Changes are in the GitHub repository. Deploy or redeploy the Render web service and refresh GitHub Pages. The Minecraft Paper plugin does not need to change for website tickets.
