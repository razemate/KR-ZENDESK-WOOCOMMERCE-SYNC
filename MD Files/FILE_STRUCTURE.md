# FILE_STRUCTURE.md — Authoritative Structure

## Zendesk Private App (ZIP upload)
woo-zendesk-private-app/
├── manifest.json
├── assets/
│   ├── logo.png
│   ├── logo-small.png
│   ├── iframe.html
│   ├── main.js
│   └── styles.css
├── translations/
│   └── en.json
└── README.md

IMPORTANT NOTES:
- iframe.html is the REQUIRED entry point for the Zendesk app.
- main.js and styles.css are OPTIONAL but RECOMMENDED for clean separation of logic and styling.
- Do NOT inline complex JavaScript inside iframe.html.
- No node_modules, build tools, or frameworks are allowed in the Zendesk app ZIP.

## Backend (Vercel)
woo-zendesk-sync-backend/
├── api/
│   ├── read.js
│   ├── refresh.js
│   ├── sync-initial.js
│   ├── webhook-woo.js
│   └── cron-nightly.js
├── lib/
│   ├── db.js
│   ├── woo.js
│   ├── normalize.js
│   ├── lock.js
│   └── util.js
├── vercel.json
├── package.json
└── README.md

RULES:
- The Zendesk app and backend MUST be in separate projects.
- No additional files or folders may be added unless explicitly documented later.
- This structure is FINAL and AUTHORITATIVE.
