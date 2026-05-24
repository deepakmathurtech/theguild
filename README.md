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
