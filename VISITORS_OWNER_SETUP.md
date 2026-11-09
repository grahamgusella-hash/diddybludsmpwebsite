# Website Visitor Counter and Owner Payments Tab

## Visitor counter
The public GitHub Pages homepage displays total unique-browser visits since this feature was enabled. A browser gets a random ID stored in localStorage; the Render backend stores only an HMAC hash (keyed with the private BRIDGE_SECRET), not the plaintext browser identifier. Reloading the site with the same browser does not increment the total. Different devices, browsers and cleared storage may count again. This is not a precise count of individual people.

API: `GET /api/public/visitors` reads total, `POST /api/public/visitors` records a browser ID. The counter is stored in the same `DATA_FILE` JSON file as the other bridge data. It may reset if Render has no persistent storage, as can tickets and applications.

## Owner Payments tab
The private Render staff dashboard at https://diddybludsmpwebsite.onrender.com/staff now includes an **Owner Payments** tab only for the Discord server owner or the exact user ID in Render's `DISCORD_OWNER_USER_ID`. The authenticated backend re-verifies their Discord access before returning payment-request data. An account must also qualify for staff dashboard sign-in.

This dashboard shows:
- Store purchase requests received and their review status
- Verified paid total: **$0.00** (no payment processor integrated)
- Withdrawable balance: **$0.00** (no payment processor integrated)
- Withdraw button **disabled**, with a message explaining the missing payment connection

Do not treat submitted or manually approved requests as actual money received. The website does not process credit cards, store card information, or transfer funds to debit cards.

To activate real-money balances and payouts later, integrate a payment processor with authenticated server-side payment verification, a ledger of payments/refunds and a compliant payout flow. A debit card number alone cannot substitute for payment processing or identity verification.

## Deployment
Deploy the updated Render backend and refresh the GitHub Pages site. Optionally set `DISCORD_OWNER_USER_ID` to the owner's Discord numeric user ID in Render environment settings. Never put credentials in GitHub or a public page.
