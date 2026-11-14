# Kasane 重ね

A JLPT N3 vocab trainer for iPhone, with WaniKani-style spaced repetition and levels.

Built as an installable web app (PWA): open it in Safari, then Share → Add to Home Screen.

Progress is saved online (a Cloudflare Worker with a D1 database, in `worker/`) behind a single passphrase, so it syncs across devices.

**Live app:** https://kasane.ksenousi-5ca.workers.dev/

Scan with your iPhone camera to open it:

<img src="docs/qr.png" alt="QR code for https://kasane.ksenousi-5ca.workers.dev/" width="220">

## Running it

- `npm run dev:api` runs the Worker with a local D1 on port 8787. Put `PASSPHRASE=...` in `.dev.vars` first.
- `npm run dev` runs the app on 5173 and proxies `/api` to the Worker.
- `npm run deploy` builds, applies D1 migrations and deploys. Set the passphrase once with `npx wrangler secret put PASSPHRASE`. Changing it signs every device out.

## Lock screen widget (iOS)

`ios/` is a small native app that carries a WidgetKit widget: a different Kasane word every hour on
the hour (word, hiragana, meaning, short example), walking all words in a fixed shuffled order.
It works as a lock screen box, a line above the clock, and a small home screen widget.

- After changing content, regenerate its word list: `npm run widget:words`.
- After changing `ios/project.yml`, regenerate the Xcode project: `cd ios && xcodegen generate`.
- Install: open `ios/Kasane.xcodeproj`, pick your team under Signing & Capabilities for both
  targets, plug in the iPhone and press Run. With a free Apple ID the install lasts 7 days.
