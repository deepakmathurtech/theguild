import { getPublicGuildProfilePath } from './guildIdentity';
import type { GuildUser, Organization, Quest, Need, KnowledgeArticle, Outcome } from '../types/guild';

type EntitySource = { id?: string; uid?: string; guildId?: string; adventurerId?: string };

function pickId(source?: EntitySource | string) {
  if (!source) return '';
  if (typeof source === 'string') return source;
  return source.id || source.uid || source.guildId || source.adventurerId || '';
}

export const ecosystemLinks = {
  passport: (user: GuildUser | EntitySource | string) =>
    typeof user === 'string' ? `/g/${encodeURIComponent(user)}` : getPublicGuildProfilePath(user),
  guildCard: () => '/guild-card',
  passportSettings: () => '/public-profile-settings',
  member: (user: EntitySource | string) => `/member/${encodeURIComponent(pickId(user))}`,
  organization: (_org?: Organization | EntitySource | string) => '/organizations',
  branch: (branchId?: string) => (branchId ? `/branches/${encodeURIComponent(branchId)}` : '/branches'),
  quest: (quest: Quest | EntitySource | string) => `/quests/${encodeURIComponent(pickId(quest))}`,
  need: (need: Need | EntitySource | string) => `/needs/${encodeURIComponent(pickId(need))}`,
  knowledge: (article: KnowledgeArticle | EntitySource | string) => `/docs#${encodeURIComponent(pickId(article))}`,
  outcome: (outcome: Outcome | EntitySource | string) => `/org-outcomes#${encodeURIComponent(pickId(outcome))}`,
};

export function getMemberNextActions(profile: GuildUser, activeQuestCount = 0) {
  const actions = [];
  if (!profile.publicProfile?.shortBio && !profile.bio) {
    actions.push({
      label: 'Complete Passport intro',
      href: ecosystemLinks.passportSettings(),
      hint: 'Add the personal context beside your verified record.',
    });
  }
  if (profile.verificationStatus !== 'verified') {
    actions.push({
      label: 'Verify identity',
      href: '/verification',
      hint: 'Verified identity unlocks stronger trust signals.',
    });
  }
  if (activeQuestCount > 0) {
    actions.push({
      label: 'Continue accepted quests',
      href: '/quest-center',
      hint: `${activeQuestCount} active quest${activeQuestCount === 1 ? '' : 's'} can strengthen your Passport.`,
    });
  } else {
    actions.push({
      label: 'Find a quest',
      href: '/quests',
      hint: 'Completed verified work feeds your Passport automatically.',
    });
  }
  actions.push({
    label: 'Share Guild Card',
    href: ecosystemLinks.guildCard(),
    hint: 'Use your QR card as the entry point to your Guild Passport.',
  });
  return actions.slice(0, 4);
}
