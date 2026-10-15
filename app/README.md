# LiftLog

A personal, offline-first workout app built on the exercise dataset in this repo.

- **Workout**: log sets (weight × reps, reps only, or seconds), with last session's numbers as placeholders, a rest timer, and PR detection when you finish.
- **Routines**: reusable templates (e.g. Push / Pull / Legs); start one in a tap.
- **Exercises**: search and filter all 1,324 exercises, with an animated demo, instructions and your own history chart for each.
- **Progress**: workouts and volume per week, sets per muscle, personal records, full history.
- **Generate**: builds a workout from a focus (full body, push, pull, legs, upper, lower, core or chosen muscles), time and allowed equipment. Use ⟳ to swap any exercise.

Data lives in IndexedDB on the device. Use **Settings → Export backup** regularly.

## Run

```sh
npm install
npm run dev        # http://localhost:5173, also on your LAN
npm run build      # production build in dist/
npm run preview    # serve dist/ at http://localhost:4173
```

`npm run dev`/`build` first run `scripts/prepare-data.mjs`, which writes a slim English-only
`public/exercises.json` from `../data/exercises.json` and copies `../images` and `../videos` into `public/media/`.

## Using it on your phone

Offline mode and "Add to Home Screen" require HTTPS. Deploy `dist/` to any static host
(Netlify, Cloudflare Pages, Vercel, GitHub Pages), open it on your phone, then add it to the home screen.
Thumbnails are cached on first load; exercise GIFs are cached as you view them.

Exercise media © Gym visual (https://gymvisual.com/), see `../NOTICE.md` — keep the attribution if you host the app.
