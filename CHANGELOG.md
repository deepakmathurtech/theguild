# Changelog

## V1 Public Launch Preparation

- Improved login/register behavior with email existence checks, automatic mode switching, preserved email input, standard field labels, validation, loading, error, and success feedback.
- Added an abstract Firebase auth service so future auth providers can be swapped behind the same UI contract.
- Clarified the landing page with the launch statement, primary and secondary CTAs, a "What is The Central Guild?" section, and placeholder public metrics.
- Updated navigation labels while preserving the Guild visual identity and moved logout into the profile menu.
- Expanded quest metadata support for category, tags, location, duration, reward type, status, creator, and verification display.
- Added zero-reward handling so volunteer quests show Volunteer, Recognition, and XP instead of raw zero values.
- Expanded public profile dossiers with Guild ID, completed quests, achievements, skills, departments, and empty states.
- Replaced hardcoded legal/about copy with content-backed markdown files plus Firestore `content_pages` fallback support.
- Added About, FAQ, Community Guidelines, Terms, and Privacy content routes.
- Added page metadata helpers, canonical URLs, OpenGraph defaults, `robots.txt`, and `sitemap.xml`.
- Added lightweight launch funnel event hooks for landing, registration, first quest, and completion milestones.
- Strengthened the mobile-visible auth actions and added a direct account-creation path after an unsuccessful login while preserving the email field.
- Added canonical railway city-code configuration in `content/cities.json`, with registration selecting from the managed list.
- Added admin adventurer filters for pending/approved review state and city.

## Migration Notes

- Content can live in `/content/*.md` for repository-managed pages.
- For no-redeploy edits, create Firestore documents in `content_pages` using the page slug as the document ID.
- Supported Firestore fields are `slug`, `title`, `body`, and `updatedAt`. The markdown `body` should use `#`, `Eyebrow:`, `Intro:`, and `##` sections.
- Existing quest documents remain compatible. New optional fields are `category`, `tags`, `location`, `duration`, `rewardType`, `rewardAmount`, `status`, `createdBy`, and `verified`.
- Existing profile documents remain compatible. New optional public fields are `achievements` and `departments`.
- New Adventurer registrations select a city from `content/cities.json`; add each supported city and its canonical railway code before launch.
- Existing generated Guild IDs remain valid. New IDs can use 2 to 5 character railway codes such as `LDH` or `NDLS`.

## Manual Test Checklist

- Log in with an unknown email and confirm the form switches to registration with the email preserved.
- Register with an existing email and confirm the form switches to login.
- Confirm email and password validation messages appear before network requests.
- Confirm landing CTAs navigate to login and quests.
- Confirm quest cards do not show raw zero rewards.
- Confirm `/about`, `/terms`, `/privacy`, `/faq`, and `/guidelines` render from content.
- Confirm `/robots.txt` and `/sitemap.xml` load.
- Confirm mobile navigation opens and includes Logout inside the authenticated menu.
- Confirm a city can only be selected from `content/cities.json` and the matching railway code is displayed read-only.
- Confirm the admin adventurer list filters by pending/approved status and by city.

## Rollback Notes

- Revert the auth UI and `lib/authService.ts` changes to restore the previous manual login/register behavior.
- Revert `content/`, `lib/contentPages.ts`, and `components/guild/ContentPage.tsx` to restore hardcoded static pages.
- Remove `app/robots.ts`, `app/sitemap.ts`, and `lib/site.ts` metadata usage to return to layout-only metadata.
