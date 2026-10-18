# Kasane 重ね

A JLPT N3 vocab trainer for iPhone, with WaniKani-style spaced repetition and levels.

Built as an installable web app (PWA): open it in Safari, then Share → Add to Home Screen.

Progress is saved online (a Cloudflare Worker with a D1 database, in `worker/`) behind a single passphrase, so it syncs across devices.

**Live app:** https://kasane.ksenousi-5ca.workers.dev/

## Running it

- `npm run dev:api` runs the Worker with a local D1 on port 8787. Put `PASSPHRASE=...` in `.dev.vars` first.
- `npm run dev` runs the app on 5173 and proxies `/api` to the Worker.
- `npm run deploy` builds, applies D1 migrations and deploys. Set the passphrase once with `npx wrangler secret put PASSPHRASE`. Changing it signs every device out.
