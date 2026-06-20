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
  title: 'Guild — The Human Growth Engine',
  description: 'Guild is a decentralized growth engine that ensures human potential is not wasted. Connect with verified builders, creators, and researchers through localized quest chapters.',
  url: 'https://guild.com',
  image: '/og-image.png',
  keywords: ['guild', 'growth', 'skills', 'quests', 'reputation', 'verification', 'career development', 'freelance', 'work', 'opportunity']
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
      areaServed: 'India',
      serviceType: ['Career Development', 'Skill Verification', 'Professional Network']
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
    title: 'Guild — The Human Growth Engine',
    description: 'Connect with verified professionals, complete skill-building quests, and build your reputation portfolio.',
    keywords: ['guild', 'growth engine', 'career development', 'professional network']
  },
  auth: {
    title: 'Sign In',
    description: 'Sign in to Guild to access quests, connect with organizations, and build your professional reputation.',
    keywords: ['sign in', 'login', 'authentication']
  },
  quests: {
    title: 'Quest Board',
    description: 'Browse available skill-building quests from verified organizations. Earn reputation and get rewarded for completing real-world projects.',
    keywords: ['quests', 'gigs', 'projects', 'freelance work', 'opportunities']
  },
  questDetails: {
    title: 'Quest Details',
    description: 'View quest requirements, rewards, and submission guidelines.',
    keywords: ['quest', 'project', 'gig']
  },
  organizations: {
    title: 'Organizations Directory | Guild',
    description: 'Discover verified organizations in the Guild ecosystem. Browse trusted NGOs, businesses, and institutions driving community outcomes. Find partners, explore opportunities, and join the network.',
    keywords: ['organizations directory', 'verified organizations', 'NGO partners', 'business network', 'community impact', 'Guild ecosystem']
  },
  orgLanding: {
    title: 'For Organizations',
    description: 'Post needs, find talent, and grow with Guild. Verification and reputation done right.',
    keywords: ['for organizations', 'post needs', 'find talent', 'hiring']
  },
  orgDashboard: {
    title: 'Organization Dashboard',
    description: 'Manage your organization on Guild. Track needs, opportunities, and member contributions.',
    keywords: ['organization dashboard', 'manage', 'needs']
  },
  branches: {
    title: 'Network',
    description: 'Explore the Guild federation network. Find chapters in cities and states across India.',
    keywords: ['network', 'chapters', 'branches', 'cities', 'states']
  },
  knowledgeHub: {
    title: 'Knowledge Hub',
    description: 'Access verified knowledge entries from Guild members. Learn from real-world projects and experiences.',
    keywords: ['knowledge', 'docs', 'documentation', 'learn', 'guides']
  },
  impact: {
    title: 'Impact',
    description: 'See the collective impact of Guild members. Track growth, outcomes, and community contribution.',
    keywords: ['impact', 'statistics', 'growth', 'outcomes']
  },
  memberProfile: {
    title: 'My Profile',
    description: 'Your Guild profile. Track reputation, completed quests, and professional growth.',
    keywords: ['profile', 'reputation', 'portfolio']
  },
  verification: {
    title: 'Verification Center',
    description: 'Verify member submissions and track verification queue.',
    keywords: ['verification', 'review', 'submissions']
  },
  notifications: {
    title: 'Notifications',
    description: 'Your Guild notifications and alerts.',
    keywords: ['notifications', 'alerts', 'messages']
  },
  settings: {
    title: 'Settings',
    description: 'Manage your Guild account settings and preferences.',
    keywords: ['settings', 'preferences', 'account']
  },
  needDetails: {
    title: 'Need Details',
    description: 'View and manage organization needs.',
    keywords: ['need', 'requirement', 'task']
  },
  submissionReviews: {
    title: 'Submission Reviews',
    description: 'Review and verify member quest submissions.',
    keywords: ['submissions', 'reviews', 'verification']
  }
};