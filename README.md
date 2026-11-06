# Diddyblud Lifesteal website

Official community website project for the Diddyblud Lifesteal Minecraft SMP.

## Website

Open `index.html` in a web browser to preview it. This is a static, mobile-friendly single-page website, so no npm installation or build step is needed.

## Set the server address

At the bottom of `index.html`, find:

```js
const CONFIG={serverIP:"",discordInvite:""};
```

Put your actual Minecraft Java server address between the quotes for `serverIP`. The copy button enables automatically once an IP is configured. Do not guess an IP address.

## Publish with GitHub Pages

1. Open the repository's **Settings** → **Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose `main` and `/(root)`, then click **Save**.
4. The website will be published at: https://grahamgusella-hash.github.io/diddybludsmpwebsite/

This URL is the expected GitHub Pages address, not confirmation that Pages is already enabled.

## Editing

The HTML, CSS, and JavaScript are all in `index.html`. All buttons and navigation links are part of the page. Server data, online-player counts, purchases, and account features require additional server-side integration if needed later.

Minecraft is a trademark of Mojang Studios. This website is not affiliated with Mojang or Microsoft.
