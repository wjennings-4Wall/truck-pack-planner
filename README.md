# 4Wall Truck Pack Planner

A browser-based tool for planning how flight cases go into one or more trucks. You enter case sizes, weights and quantities, and the planner auto-packs them. It then shows a labeled, color-coded 3D load plan the crew can step through case by case.

## Features

- **Case entry**: name, length, width, height, optional weight, quantity, color, load order. Paste rows straight from Excel or Google Sheets (Name, L, W, H, Weight, Qty).
- **Trucks**: presets for a cargo van, 16', 20', 24' and 26' box trucks, and 48' and 53' trailers, plus custom sizes. Door opening and payload are checked. Preset sizes are typical rental figures, so confirm the actual unit.
- **Multiple trucks**: assign each case type to a truck, or leave it on Auto. Auto fills the trucks in order and overflows to the next one by space and payload.
- **Stacking rules**:
  - "Sits on": same case only (caster cups, aligned), any case, or floor only.
  - Max stack count per case type.
  - Never heavier on lighter.
  - Minimum support.
  - Max stack height.
- **Load bars and ratchet straps** between load-order groups. They take up floor space and appear as install steps.
- **Hand adjust**: turn a case 90°, nudge it, or slide it to the nose or a wall. Cases on top move with it, and blocked moves are refused. Adjusted layouts stay fixed, and new cases are fitted around them.
- **3D view**: 3D, Top, Side and From-doors views, with step-through and play.
- **Stats**: floor used, cube used, weight against payload, center of weight and side-to-side lean.
- **Crew exports** (all trucks or one truck):
  - PDF load sheet: job summary, then for each truck an overview, load progression and a checklist sequence.
  - Standalone 3D viewer HTML file.
  - CSV.
  - PNG of the current view.
- **Saved plans**, shared through the hosting page's database when it runs as a Claude artifact.
- 4Wall brand: 4Wall Blue `#005eb8`, Bebas Neue and Roboto, and the horizontal logo from the brand guidelines.

## Layout

```
src/engine.js     Packing engine (pure JS, no dependencies; also runs in Node)
src/viewer.js     Three.js 3D viewer (self-contained; also embedded in the crew export file)
src/app.html      Page template: UI, styles, exports, saved plans
assets/           4Wall logo (from the brand guidelines PDF)
build.py          Builds dist/index.html (inlines engine, viewer and logo)
dist/index.html   The built, single-file app
tests/            Engine tests (Node)
tools/            Headless-browser screenshot and export checks (Playwright)
```

## Build and test

```bash
python3 build.py        # writes dist/index.html
npm test                # engine tests
```

The built page loads three.js 0.147.0 and jsPDF 2.5.1 from public CDNs. The `tools/` scripts need `pip install playwright` and a Chromium or Chrome browser (set `CHROME_PATH` if needed). Run `npm install` first so the scripts can serve the libraries locally.

## Hosting notes

The live version runs as a Claude artifact. File downloads and shared saved plans use the artifact's `downloads` and `db` capabilities (`window.claude.use(...)`). Opened as a plain file or on another host, the planner, 3D view and copy-to-clipboard still work. Downloads and saved plans would need replacing with your host's own file saving and storage.

## How the packer works

The packer builds walls from the nose. It sorts cases by load order, then by footprint, height and weight, and places each one at the candidate point nearest the nose, lowest, then nearest the driver side. Cases stay upright and only turn on the floor.

The load sequence is ordered so a case is always loaded after the cases it rests on. Hand-placed cases are pinned first, and everything else is packed around them.
