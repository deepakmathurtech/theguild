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

## Migration Notes

- Content can live in `/content/*.md` for repository-managed pages.
- For no-redeploy edits, create Firestore documents in `content_pages` using the page slug as the document ID.
- Supported Firestore fields are `slug`, `title`, `body`, and `updatedAt`. The markdown `body` should use `#`, `Eyebrow:`, `Intro:`, and `##` sections.
- Existing quest documents remain compatible. New optional fields are `category`, `tags`, `location`, `duration`, `rewardType`, `rewardAmount`, `status`, `createdBy`, and `verified`.
- Existing profile documents remain compatible. New optional public fields are `achievements` and `departments`.
- New Adventurer registrations automatically derive their three-letter city code from the city name, so the same city cannot be submitted under multiple newly selected codes.

## Manual Test Checklist

- Log in with an unknown email and confirm the form switches to registration with the email preserved.
- Register with an existing email and confirm the form switches to login.
- Confirm email and password validation messages appear before network requests.
- Confirm landing CTAs navigate to login and quests.
- Confirm quest cards do not show raw zero rewards.
- Confirm `/about`, `/terms`, `/privacy`, `/faq`, and `/guidelines` render from content.
- Confirm `/robots.txt` and `/sitemap.xml` load.
- Confirm mobile navigation opens and includes Logout inside the authenticated menu.

## Rollback Notes

- Revert the auth UI and `lib/authService.ts` changes to restore the previous manual login/register behavior.
- Revert `content/`, `lib/contentPages.ts`, and `components/guild/ContentPage.tsx` to restore hardcoded static pages.
- Remove `app/robots.ts`, `app/sitemap.ts`, and `lib/site.ts` metadata usage to return to layout-only metadata.
