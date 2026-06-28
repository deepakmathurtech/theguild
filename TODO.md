# TheGuild Premium Interaction Rollout (Hierarchy-Based)

## Plan implementation steps
- [x] 1) Upgrade quest card CTAs in `src/pages/QuestBoard.tsx` to strict hierarchy:
  - [x] “View details” / “Review Application” => Level 2 secondary using `btn-premium btn-premium-secondary focus-ring-premium`
  - [ ] Remove legacy inline hover/class overrides that compete with premium system

- [ ] 2) Upgrade quest page CTAs in `src/pages/QuestDetails.tsx`:
  - [ ] “Apply For Quest” / “Continue Application” => Level 1 primary using `btn-premium btn-premium-primary btn-premium--gold-glow focus-ring-premium`
  - [ ] “Continue Application”/pending variants => ensure correct quiet/secondary emphasis (no gold glow)
  - [ ] “Submit Completed Quest” => Level 1 primary
  - [ ] “Back to Quest Board” remains Level 3 quiet
- [ ] 3) Upgrade organization directory + hero CTAs in `src/pages/Organizations.tsx`:
  - [ ] “Partner With Us” => Level 1 primary
  - [ ] “Learn About Guild” => Level 2 secondary
  - [ ] Card “View Profile” becomes secondary emphasis (no competing primary styling)
- [ ] 4) Upgrade need forms CTAs:
  - [ ] `src/pages/NeedWizard.tsx`: “Continue” and “Submit Need” => Level 1 primary
  - [ ] Ensure “Back” stays Level 3 quiet
  - [ ] `src/pages/NeedDetails.tsx`: “Back to Dashboard” => Level 3 quiet (not `.primary`)
- [ ] 5) Build + verification
  - [ ] Run `npm run build`
  - [ ] Manually validate homepage, quest pages, organizations pages, and navigation calmness

