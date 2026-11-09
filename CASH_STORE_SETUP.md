# Website Cash Store (inquiry-only)

The store section on GitHub Pages lists four items:
- **1,000,000 in-game money — $1 USD**
- **100,000,000 in-game money — $3 USD**
- **Prime Rank — $2.50 USD**
- **Legend Rank — $5.00 USD**

The user request "1 for 1 dollar" was interpreted as 1 million in-game money for $1. Change the label and backend offer if that was not intended.

Store buttons populate a website request form; `POST /api/public/orders` records the request and notifies the `DISCORD_ORDERS_CHANNEL_ID` Discord channel (if configured). These are **NOT payments or automated purchases**. The web service does not collect credit card information or verify payment. The new items do not auto-grant money or ranks when a Discord staff member uses `/approveorder`; staff must independently confirm payment and fulfill manually.

To enable real checkout, a secure payment provider integration with server-side webhooks, receipts, anti-replay fulfillment and Minecraft account verification will be required. Never trust client-side checkout "success" as payment proof. Do not enter payment credentials in the public GitHub repo.

The in-game level shop remains independent from this proposed real-money store.
