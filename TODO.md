# TODO - Vercel Build Fixes (blackboxai)

## Completed
- [x] Added/staged missing eventsite lib modules for Vercel deployment:
  - src/eventsite/lib/firestoreEvents.ts
  - src/eventsite/lib/eventModels.ts
- [x] Reset PublicEventPage.tsx to a clean baseline.
- [x] Typed React onChange for Full name.
- [x] Typed React onChange for Email.

## In progress / Blocked
- [ ] Finish TypeScript implicit-any fixes in src/eventsite/pages/PublicEventPage.tsx:
  - textarea/select/number/email/text onChange handler `e` typing
  - setAnswers updater callback `p` typing
  - Quantity input updater callback `p` typing
- [ ] Run production build parity check:
  - npm run build (npm ci fails with EPERM on current Windows environment)

## Notes
- Tooling limitations in this environment prevent reliable automated grep and some ambiguous diff replacements.

