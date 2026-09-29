# ABHAY-Prototype

ABHAY is a secure, lightweight, on-device visual perception browser agent (SIH 2026, ISRO PS 26171).
This repo holds its landing page: a static site with no build step.

## Run locally

```bash
npm run dev   # serves the folder with `npx serve .`
```

Or just open `index.html` in a browser.

## Structure

```
index.html   page markup
style.css    styles
app.js       interactivity (sanitizer demo, carousel, accessibility controls)
assets/      logos, hero slides, extension download (abhay-extension.zip)
docs/        extension README and technical notes
vercel.json  Vercel deploy config (headers, caching)
```

## Deploy

Push to a Vercel-linked repo, or run `vercel` from the project root.
