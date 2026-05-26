# The Central Guild

V1 of The Central Guild website, a quest-driven community platform where adventurers build skills through real projects, verified contributions, and collaborative quests.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Structure

- `app/` contains App Router pages, metadata routes, and route layouts.
- `components/guild/` contains reusable Guild UI and feature components.
- `lib/` contains Firebase, auth, content, SEO, status, and domain helpers.
- `content/` contains editable markdown fallback pages for About, Terms, Privacy, FAQ, and Community Guidelines.
- `utils/` contains small browser utilities such as launch metric event tracking.

## Content Pages

Static pages are rendered through a content system instead of hardcoded page copy.

Repository fallback:

- `content/about.md`
- `content/privacy.md`
- `content/terms.md`
- `content/faq.md`
- `content/guidelines.md`

No-redeploy editing:

Create Firestore documents in `content_pages` with the slug as the document ID. Supported fields are `slug`, `title`, `body`, and `updatedAt`. The `body` field accepts the same markdown shape as the files in `/content`.

## Launch Checks

```bash
npm run lint
npm run build
```

Set `NEXT_PUBLIC_SITE_URL` for production canonical URLs when the public host changes.

Optional social URL overrides:

- `NEXT_PUBLIC_GUILD_INSTAGRAM`
- `NEXT_PUBLIC_GUILD_LINKEDIN`
- `NEXT_PUBLIC_GUILD_X`

## Guild ID Railway City Codes

Registration city choices and Guild ID codes are managed in `content/cities.json`. Add one entry per supported city using the railway code selected by the Guild:

```json
[
  { "name": "Delhi", "code": "NDLS" },
  { "name": "Ludhiana", "code": "LDH" }
]
```

City codes accept 2 to 5 uppercase letters or digits. The build rejects duplicated city mappings or a code assigned to multiple cities. Editing this repository file requires rebuilding and deploying the website.

## Guild Card Generator

Double-click `Generate Guild Cards.bat` to read the shared spreadsheet, generate print-ready member cards, and open the visual summary page.

Generated card files are stored in `generated_cards/`:

- `index.html` shows which cards are `NEW`, `UPDATED`, or `UNCHANGED`.
- `generation_history.csv` keeps a simple run-by-run record of card statuses.
- `new_cards/<date_time>/` contains only cards that are new or changed in that run, including their print PDFs.
- `*_print.pdf` is the file to print: a two-page front/back card PDF sized `3.5 x 2 in` at `300 DPI`.
- `*_front.png` and `*_back.png` are 300-DPI preview files.

The PDF embeds card artwork losslessly, and the QR is rendered with high contrast, intact square modules, and a full quiet border for dependable printed scanning.

Optional spreadsheet column: add `Title` (or `Role` / `Designation`) when a member should use the titled design from `3.png`, for example `FOUNDER`. Leave it blank to use the normal `1.png` card design.

If the same `GuildID` is submitted again, the newest spreadsheet response replaces the older card. This lets you correct a member or add a title without creating duplicate printable cards.

Print the PDF at `Actual size` or `100%` scale. For double-sided printing, choose flip on the short edge if your printer offers that setting.

Command-line use:

```powershell
python -B cardgen.py --open-report
python -B cardgen.py --name "Deepak Mathur" --city Ludhiana --rank "F-Rank Adventurer" --guild-id TG-LDH-26MF-00001 --title Founder
```
