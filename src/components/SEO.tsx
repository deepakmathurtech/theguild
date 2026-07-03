import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOProps {
  /** Page title - will be prefixed with site name */
  title?: string;
  /** Meta description for search engines */
  description?: string;
  /** Custom keywords (appends to default) */
  keywords?: string[];
  /** OpenGraph image override */
  ogImage?: string;
  /** og:type - defaults to 'website', use 'article' for blog/content */
  ogType?: 'website' | 'article';
  /** No index/follow for robots */
  noIndex?: boolean;
  /** Canonical URL override (defaults to current path) */
  canonical?: string;
  /** Structured data schema */
  schema?: object;
  /** Page-specific breadcrumb */
  breadcrumb?: { name: string; url: string }[];
}

/** Site-wide defaults */
const SITE_DEFAULTS = {
  name: 'Guild',
  title: 'Guild — Verified Work. Real Impact.',
  description: 'Guild is a civilization-oriented work verification platform. Organizations post needs, members complete quests, and every outcome is verified. Build a proof-of-work identity through real contributions.',
  url: 'https://guild.com',
  image: 'https://guild.com/og-image.png',
  keywords: ['guild', 'verified work', 'proof of work', 'quests', 'reputation', 'skill verification', 'organizations', 'impact', 'career growth', 'freelance', 'professional network']
};

/**
 * Dynamic SEO component for React SPA.
 * Updates document head tags based on current route and props.
 */
export default function SEO({
  title,
  description,
  keywords = [],
  ogImage,
  ogType = 'website',
  noIndex = false,
  canonical,
  schema,
  breadcrumb
}: SEOProps) {
  const location = useLocation();

  // Build full title with site name
  const fullTitle = useMemo(() => {
    if (!title) return SITE_DEFAULTS.title;
    return title.includes(SITE_DEFAULTS.name)
      ? title
      : `${title} | ${SITE_DEFAULTS.name}`;
  }, [title]);

  // Build canonical URL
  const canonicalUrl = useMemo(() => {
    if (canonical) return canonical;
    return `${SITE_DEFAULTS.url}${location.pathname.replace(/\/$/, '')}`;
  }, [canonical, location.pathname]);

  // Merge keywords
  const allKeywords = useMemo(() => {
    const defaultKeywords = [...SITE_DEFAULTS.keywords];
    keywords.forEach(kw => {
      if (!defaultKeywords.includes(kw)) {
        defaultKeywords.push(kw);
      }
    });
    return defaultKeywords.join(', ');
  }, [keywords]);

  // Build structured data
  const structuredData = useMemo(() => {
    if (schema) return schema;

    // Default organization schema
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_DEFAULTS.name,
      description: SITE_DEFAULTS.description,
      url: SITE_DEFAULTS.url,
      logo: `${SITE_DEFAULTS.url}/guild-logo.png`,
      areaServed: 'India',
      serviceType: ['Work Verification', 'Skill Verification', 'Professional Network', 'Career Development']
    };
  }, [schema]);

  // Breadcrumb structured data
  const breadcrumbSchema = useMemo(() => {
    if (!breadcrumb || breadcrumb.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumb.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${SITE_DEFAULTS.url}${item.url}`
      }))
    };
  }, [breadcrumb]);

  // Update document head
  useEffect(() => {
    const updateTag = (selector: string, update: (el: HTMLMetaElement | HTMLLinkElement | HTMLTitleElement) => void) => {
      let el = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | HTMLTitleElement | null;
      if (!el) {
        if (selector.startsWith('<title')) {
          el = document.createElement('title');
          document.head.appendChild(el);
        } else if (selector.startsWith('meta[')) {
          const match = selector.match(/meta\[([^=]+)=["']?([^"']+)["']?\]/);
          if (match) {
            el = document.createElement('meta');
            el.setAttribute(match[1], match[2]);
            document.head.appendChild(el as HTMLMetaElement);
          }
        } else if (selector.startsWith('link[')) {
          const match = selector.match(/link\[([^=]+)=["']?([^"']+)["']?\]/);
          if (match) {
            el = document.createElement('link');
            el.setAttribute(match[1], match[2]);
            document.head.appendChild(el as HTMLLinkElement);
          }
        }
      }
      if (el && 'content' in el) {
        update(el as HTMLMetaElement | HTMLLinkElement | HTMLTitleElement);
      }
    };

    // Title
    document.title = fullTitle;

    // Meta description
    const descEl = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (descEl) {
      descEl.setAttribute('content', description || SITE_DEFAULTS.description);
    }

    // Keywords
    const keywordsEl = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (keywordsEl) {
      keywordsEl.setAttribute('content', allKeywords);
    }

    // OpenGraph tags
    const ogTitleEl = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    if (ogTitleEl) {
      ogTitleEl.setAttribute('content', fullTitle);
    }

    const ogDescEl = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    if (ogDescEl) {
      ogDescEl.setAttribute('content', description || SITE_DEFAULTS.description);
    }

    const ogUrlEl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    if (ogUrlEl) {
      ogUrlEl.setAttribute('content', canonicalUrl);
    }

    const ogTypeEl = document.querySelector('meta[property="og:type"]') as HTMLMetaElement | null;
    if (ogTypeEl) {
      ogTypeEl.setAttribute('content', ogType);
    }

    const ogImageEl = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
    if (ogImageEl) {
      ogImageEl.setAttribute('content', ogImage || SITE_DEFAULTS.image);
    }

    // Twitter Card
    const twitterTitleEl = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null;
    if (twitterTitleEl) {
      twitterTitleEl.setAttribute('content', fullTitle);
    }

    const twitterDescEl = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null;
    if (twitterDescEl) {
      twitterDescEl.setAttribute('content', description || SITE_DEFAULTS.description);
    }

    const twitterImageEl = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
    if (twitterImageEl) {
      twitterImageEl.setAttribute('content', ogImage || SITE_DEFAULTS.image);
    }

    // Canonical URL
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    // Robots
    const robotsEl = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (robotsEl) {
      if (noIndex) {
        robotsEl.setAttribute('content', 'noindex, nofollow');
      } else {
        robotsEl.setAttribute('content', 'index, follow');
      }
    } else {
      const newRobots = document.createElement('meta');
      newRobots.setAttribute('name', 'robots');
      newRobots.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');
      document.head.appendChild(newRobots);
    }

    // Update structured data
    let schemaEl = document.getElementById('schema-org') as HTMLScriptElement | null;
    if (!schemaEl) {
      schemaEl = document.createElement('script');
      schemaEl.id = 'schema-org';
      schemaEl.type = 'application/ld+json';
      document.head.appendChild(schemaEl);
    }
    schemaEl.textContent = JSON.stringify(structuredData, null, 0);

    // Update breadcrumb schema if present
    let breadcrumbEl = document.getElementById('breadcrumb-schema') as HTMLScriptElement | null;
    if (breadcrumbSchema) {
      if (!breadcrumbEl) {
        breadcrumbEl = document.createElement('script');
        breadcrumbEl.id = 'breadcrumb-schema';
        breadcrumbEl.type = 'application/ld+json';
        document.head.appendChild(breadcrumbEl);
      }
      breadcrumbEl.textContent = JSON.stringify(breadcrumbSchema, null, 0);
    } else if (breadcrumbEl) {
      breadcrumbEl.remove();
    }

  }, [fullTitle, description, allKeywords, ogImage, ogType, canonicalUrl, noIndex, structuredData, breadcrumbSchema]);

  // This component renders nothing - it only manages head tags
  return null;
}

/**
 * Predefined SEO configurations for common pages
 */
export const PAGE_SEO = {
  home: {
    title: 'Guild — Verified Work. Real Impact.',
    description: 'Guild connects organizations with verified contributors through structured quests. Build a proof-of-work identity, earn XP, and grow your reputation through real contributions.',
    keywords: ['guild', 'verified work', 'proof of work', 'career growth', 'professional network']
  },
  auth: {
    title: 'Sign In to Guild',
    description: 'Sign in to access your Guild Passport, browse quests, and track your reputation. Join organizations and build your verified work history.',
    keywords: ['sign in', 'login', 'guild account'],
    noIndex: true
  },
  quests: {
    title: 'Quest Board — Browse Open Quests',
    description: 'Find quests from verified organizations. Apply to projects matching your skills, complete deliverables, and earn XP and reputation for verified work.',
    keywords: ['quests', 'projects', 'open work', 'freelance', 'opportunities', 'apply'],
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Guild Quest Board',
      description: 'Browse available quests from verified organizations.',
      url: 'https://guild.com/quests'
    }
  },
  questDetails: {
    title: 'Quest Details',
    description: 'View quest requirements, deliverables, timeline, and rewards. Apply to contribute and build your verified work record.',
    keywords: ['quest', 'project details', 'apply', 'deliverables']
  },
  organizations: {
    title: 'Organizations Directory — Verified Partners',
    description: 'Discover verified organizations in the Guild ecosystem. Browse trusted NGOs, businesses, startups, and institutions posting real work opportunities.',
    keywords: ['organizations', 'verified partners', 'NGO', 'business', 'institutions', 'directory'],
    schema: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Guild Organizations Directory',
      description: 'Verified organizations posting work opportunities through Guild.',
      url: 'https://guild.com/organizations'
    }
  },
  orgLanding: {
    title: 'Guild for Organizations — Convert Needs into Verified Work',
    description: 'Register your organization with Guild. Post needs, coordinate contributors, and receive verified outcomes. Built for NGOs, startups, campuses, and institutions.',
    keywords: ['organizations', 'register', 'post needs', 'verified outcomes', 'hire talent']
  },
  orgRegister: {
    title: 'Register Your Organization',
    description: 'Create your Guild organization profile. Start posting needs, coordinating work, and building a verified trust record.',
    keywords: ['register organization', 'create account', 'partner with guild']
  },
  orgDashboard: {
    title: 'Organization Dashboard',
    description: 'Manage your organization on Guild. Track submitted needs, active quests, and contributor outcomes.',
    keywords: ['organization dashboard', 'manage', 'needs', 'quests'],
    noIndex: true
  },
  branches: {
    title: 'Guild Branches — Local Chapters Across India',
    description: 'Explore Guild branches operating across cities and states. Each branch coordinates local quests, verifies work, and builds community trust.',
    keywords: ['branches', 'chapters', 'cities', 'states', 'local guild', 'India']
  },
  knowledgeHub: {
    title: 'Knowledge Hub — Playbooks, Lessons & Templates',
    description: 'Access verified knowledge created by Guild members during quest completions. Browse playbooks, lessons learned, success stories, and reusable templates.',
    keywords: ['knowledge', 'playbooks', 'lessons', 'templates', 'documentation', 'guides']
  },
  impact: {
    title: 'Guild Impact — Real Results, Real Impact',
    description: 'See how Guild transforms organizational needs into verified outcomes. Track active members, completed quests, and community impact across India.',
    keywords: ['impact', 'statistics', 'results', 'outcomes', 'community']
  },
  memberProfile: {
    title: 'My Guild Profile',
    description: 'Your Guild profile and proof-of-work dossier. Track XP, reputation, completed quests, and verified skills.',
    keywords: ['profile', 'reputation', 'portfolio', 'proof of work'],
    noIndex: true
  },
  guildCard: {
    title: 'Guild Passport',
    description: 'Your Guild Passport — a verified proof-of-work identity. Share your QR code, track visibility, and manage your public profile.',
    keywords: ['guild passport', 'guild card', 'proof of work', 'QR code', 'identity'],
    noIndex: true
  },
  verification: {
    title: 'Trust & Verification Center',
    description: 'Verify your identity and credentials with Guild. Submit verification requests and track your trust status.',
    keywords: ['verification', 'trust', 'identity', 'credentials'],
    noIndex: true
  },
  notifications: {
    title: 'Notifications',
    description: 'Your Guild notifications — quest updates, application status, and system alerts.',
    keywords: ['notifications', 'alerts', 'updates'],
    noIndex: true
  },
  settings: {
    title: 'Account Settings',
    description: 'Manage your Guild account settings, profile details, and preferences.',
    keywords: ['settings', 'preferences', 'account'],
    noIndex: true
  },
  needDetails: {
    title: 'Need Details',
    description: 'View organization need details, scope, timeline, and quest mapping status.',
    keywords: ['need', 'requirement', 'organization']
  },
  submissionReviews: {
    title: 'Submission Reviews',
    description: 'Review and verify member quest submissions and deliverables.',
    keywords: ['submissions', 'reviews', 'verification'],
    noIndex: true
  },
  about: {
    title: 'About Guild — The Civilization Work Engine',
    description: 'Guild ensures human potential is not wasted. Learn how the platform connects organizations with verified contributors through structured quests, proof-of-work identity, and community trust.',
    keywords: ['about guild', 'mission', 'vision', 'how it works', 'civilization']
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'Guild privacy policy. How we collect, use, and protect your personal information.',
    keywords: ['privacy policy', 'data protection', 'personal information']
  },
  terms: {
    title: 'Terms of Service',
    description: 'Guild terms of service. Rules and guidelines for using the Guild platform.',
    keywords: ['terms of service', 'terms and conditions', 'usage policy']
  },
  community: {
    title: 'Community Guidelines',
    description: 'Guild community guidelines. Standards of conduct for members and organizations on the platform.',
    keywords: ['community guidelines', 'code of conduct', 'rules']
  },
  notFound: {
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist on Guild.',
    noIndex: true
  }
};