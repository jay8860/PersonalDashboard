# Life Atlas

Life Atlas now combines four pieces in one repo:

- `About Me`: editable personal profile and general details
- `Family Tree`: bilingual family canvas with automatic links, bulk add, drag positioning, and zoom controls
- `Health Dashboard`: the original detailed Personal Health Dashboard features, now mounted inside this project
- `Finance Dashboard`: the original Bank Statement Dashboard, preserved as an in-app module

## What changed

- The simplified replacement fitness tab has been replaced by the original health dashboard flow
- The health backend is now part of this repo under `backend/`
- Existing local health data has been copied into `backend/health.db` for this machine and is gitignored
- The family tree now supports:
  - automatic relationship lines when you add a person
  - bulk import in `Name | relationship | linked to | birth year | note` format
  - fit-to-screen zoom controls
  - smoother drag repositioning
  - English and Hindi labels on both cards and links

## Local development

Run this from the project folder:

```bash
npm install
npm run dev
```

That starts:

- frontend on [http://127.0.0.1:5173](http://127.0.0.1:5173)
- health API backend on `http://127.0.0.1:3001`

If `5173` is already occupied by an old Vite process, stop that process first and run `npm run dev` again.

## Production-style run

```bash
npm run build
npm run start
```

The production server serves the built frontend and the health API from one Node process.

## Railway

- Build command: `npm run build`
- Start command: `npm run start`
- `railway.toml` is already included

## Data notes

- Profile and family-tree data are stored in browser local storage
- Finance data continues to use the existing Statement Atlas local-storage profile
- Health data is stored in the SQLite database at `backend/health.db`
- Use the Health Dashboard export inside the health module for health-data backups

## Troubleshooting

If the health backend reports a missing `sqlite3` native binding on your machine, run:

```bash
npm rebuild sqlite3
```
