import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';
import CinematicGuildLandingLayout from './CinematicGuildLandingLayout';

type CountUpProps = {
  target: number;
  enabled: boolean;
  suffix?: string;
  format?: (n: number) => string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mql) return;
    const onChange = () => setReduced(!!mql.matches);
    onChange();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const add = (mql as any).addEventListener ? 'addEventListener' : 'addListener';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remove = (mql as any).removeEventListener ? 'removeEventListener' : 'removeListener';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mql as any)[add]('change', onChange);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mql as any)[remove]('change', onChange);
    };
  }, []);
  return reduced;
}

function useOnceCountUp({ target, enabled, durationMs = 1100 }: { target: number; enabled: boolean; durationMs?: number }) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const start = performance.now();
    const from = 0;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, target, durationMs]);

  return value;
}

function CountUp({ target, enabled, suffix, format }: CountUpProps) {
  const val = useOnceCountUp({ target, enabled });
  const text = format ? format(val) : String(val);
  return (
    <span>
      {text}
      {suffix ?? ''}
    </span>
  );
}

function RevealOnScroll({ children, className, delayMs = 0 }: { children: React.ReactNode; className?: string; delayMs?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className ?? ''} cg-reveal2${visible ? ' is-visible2' : ''}`}
      style={{ transitionDelay: `${delayMs}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function useStatsInView() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, visible };
}

function useSimpleAccordion(initial = 0) {
  const [open, setOpen] = useState(initial);
  return { open, setOpen };
}

function Accordion({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const { open, setOpen } = useSimpleAccordion(0);

  return (
    <div className="org-acc" role="list">
      {items.map((it, idx) => {
        const isOpen = open === idx;
        const panelId = `org-faq-panel-${idx}`;
        const btnId = `org-faq-btn-${idx}`;
        return (
          <div key={it.q} className="org-accItem" role="listitem">
            <button
              id={btnId}
              className="org-accBtn"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : idx)}
              type="button"
            >
              <span>{it.q}</span>
              <span className="org-accIcon" aria-hidden="true">
                <span className="org-accIconBar" />
                <span className="org-accIconBar org-accIconBar--diag" />
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={`org-accPanel${isOpen ? ' isOpen' : ''}`}
            >
              <div className="org-accPanelInner">{it.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrganizationsFlyerLanding() {
  const reducedMotion = usePrefersReducedMotion();

  const { ref: statsRef, visible: statsVisible } = useStatsInView();

  const organizationsTarget = 480;
  const communitiesTarget = 92;
  const verifiedContributionsTarget = 128000;
  const certificatesTarget = 74000;
  const opportunitiesTarget = 5200;

  const statsEnabled = statsVisible && !reducedMotion;

  const cards = useMemo(
    () => [
      { k: 'Opportunity Management', d: 'Publish opportunities and manage the full lifecycle with clarity.' },
      { k: 'Participant Management', d: 'Invite participants, track progress, and keep everyone aligned.' },
      { k: 'Verification', d: 'Make contributions verifiable with digital evidence trails.' },
      { k: 'Guild Passport', d: 'Give participants a portable identity for achievements and reputation.' },
      { k: 'Certificates', d: 'Issue professional, verifiable certificates that hold up over time.' },
      { k: 'Community', d: 'Turn cohorts into lasting communities with shared knowledge.' },
      { k: 'Analytics', d: 'Measure outcomes with dashboards built for decision-making.' }
    ],
    []
  );

  const trustHighlights = useMemo(
    () => [
      'Launch verified opportunities quickly without spreadsheet overhead.',
      'Keep participants, evidence, and outcomes in one shared system.',
      'Turn participation into certificates, reputation, and community momentum.'
    ],
    []
  );

  const useCases = useMemo(
    () => [
      {
        title: 'Universities',
        body: 'Run student-facing programs with admissions-ready records, attendance visibility, and verifiable recognition.'
      },
      {
        title: 'Nonprofits',
        body: 'Coordinate volunteers, cohorts, and community impact from a single platform that feels polished and reliable.'
      },
      {
        title: 'Mission-driven teams',
        body: 'Create a repeatable experience for opportunities that need proof, structure, and long-term participant engagement.'
      }
    ],
    []
  );

  const features = useMemo(
    () => [
      { t: 'Opportunity Publishing', d: 'Create & distribute verified calls.' },
      { t: 'Applications', d: 'Collect structured responses.' },
      { t: 'Registration', d: 'Organize cohorts and roles.' },
      { t: 'Attendance', d: 'Track participation reliably.' },
      { t: 'Verification', d: 'Confirm contributions with evidence.' },
      { t: 'Certificates', d: 'Issue verifiable credentials.' },
      { t: 'Guild Passport', d: 'Portable achievements & reputation.' },
      { t: 'XP', d: 'Recognition that compounds.' },
      { t: 'Reputation', d: 'Trust through legible signals.' },
      { t: 'Leaderboard', d: 'Healthy competition with context.' },
      { t: 'Analytics', d: 'Dashboards for outcomes.' },
      { t: 'Communities', d: 'Network effects across groups.' },
      { t: 'Branches', d: 'Scale across chapters.' },
      { t: 'Events', d: 'Coordinate cohorts and milestones.' },
      { t: 'Notifications', d: 'Never miss a critical update.' },
      { t: 'Role Management', d: 'Permissions built for organizations.' }
    ],
    []
  );

  const timeline = useMemo(
    () => [
      'Create Opportunity',
      'Receive Applications',
      'Manage Participants',
      'Verify Contributions',
      'Issue Certificates',
      'Guild Passport Updates',
      'Community Growth'
    ],
    []
  );

  const faq = useMemo(
    () => [
      {
        q: 'What does partnering with Guild include?',
        a: (
          <>
            You get an organization-ready workflow for publishing opportunities, managing participants,
            verification, and issuing verifiable certificates—plus dashboards that help you measure outcomes.
          </>
        )
      },
      {
        q: 'How does Guild verification work?',
        a: (
          <>
            Guild uses a digital proof path so contributions become legible and auditable. That evidence can
            then power certificates and participant reputation.
          </>
        )
      },
      {
        q: 'Can our organization customize roles and process?',
        a: (
          <>
            Yes. Role management supports organization-grade permissions so your team can manage workflows
            without compromising trust.
          </>
        )
      },
      {
        q: 'Do you provide dashboards and analytics?',
        a: (
          <>
            Yes—monitor applications, attendance, verification states, and outcomes in a centralized view
            designed for decision-making.
          </>
        )
      },
      {
        q: 'Is this page using real partner logos and testimonials?',
        a: (
          <>
            No. This flyer intentionally keeps partner logos and testimonials as placeholders until real
            content is available.
          </>
        )
      }
    ],
    []
  );

  useEffect(() => {
    // ensure anchor jumps work reliably on this standalone page
    const hash = window.location.hash;
    if (hash === '#orgs-flyer-main') {
      const el = document.getElementById('orgs-flyer-main');
      el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, [reducedMotion]);

  return (
    <>
      <SEO
        {...PAGE_SEO.home}
        title="The Central Guild — Organizations"
        description="Partner with Guild to publish verified opportunities, manage participants, verify contributions, issue certificates, and build lasting community with analytics and reputation."
        keywords={["The Central Guild", "Organizations", "Universities", "Certificates", "Verification", "Community", "Guild Passport"]}
      />

      <CinematicGuildLandingLayout>
        <div className="org-flyer-root" data-reduced={reducedMotion ? '1' : '0'}>
          <a className="org-flyer-skip" href="#orgs-flyer-main">
            Skip to content
          </a>

          {/* SECTION 1 — HERO */}
          <div className="org-bg" aria-hidden="true" />

          <header className="org-top">
            <div className="org-topLeft">
              <img src="/guild-logo.png" alt="The Guild" className="org-topLogo" />
              <div className="org-topTitle">
                <span className="org-topBrand">THE GUILD</span>
                <span className="org-topSub">Central Platform for opportunities</span>
              </div>
            </div>

            <nav className="org-topNav" aria-label="Primary">
              <Link to="/org-register" className="org-topBtn">
                Partner With Guild
              </Link>
              <Link to="#orgs-flyer-features" className="org-topLink">
                Explore Features
              </Link>
            </nav>
          </header>

          <main id="orgs-flyer-main" className="org-main">
            <section className="org-hero" aria-label="One Platform. Endless Opportunities">
              <div className="org-container">
                <div className="org-heroGrid">
                  <div className="org-heroLeft">
                    <div className="org-eyebrow">One platform for verified opportunities</div>
                    <h1 className="org-h1">Turn opportunities into a trusted, repeatable experience.</h1>
                    <p className="org-lead">
                      Guild helps universities, nonprofits, and mission-driven organizations publish opportunities,
                      manage participants, verify contributions, and build lasting community with clarity.
                    </p>

                    <div className="org-heroActions">
                      <Link to="/org-register" className="org-ctaPrimary" data-icon>
                        <span>Partner With Guild</span>
                        <span className="org-ctaIcon" aria-hidden="true">
                          →
                        </span>
                      </Link>
                      <Link to="#orgs-flyer-features" className="org-ctaSecondary">
                        Explore Features
                      </Link>
                    </div>

                    <div className="org-heroMeta" aria-label="Highlights">
                      <span className="org-chip">Fast onboarding</span>
                      <span className="org-chip">Proof-backed certificates</span>
                      <span className="org-chip">Built-in analytics</span>
                    </div>
                  </div>

                    <div className="org-heroRight" aria-hidden="true">
                    <div className="org-dashboardPreview">
                      <div className="org-dashboardPreview__card" />
                      <div className="org-dashboardPreview__card" />
                      <div className="org-dashboardPreview__chart" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2 — TRUST */}
            <section className="org-section" aria-label="Built For Organizations">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">Built For Organizations</div>
                <h2 className="org-h2">Designed to earn trust at institutional scale.</h2>
              </div>

              <div className="org-trustGrid">
                <div className="org-spotlightPanel" aria-label="Partner workflow summary">
                  <div className="org-spotlightBadge">Built for institutions</div>
                  <h3 className="org-spotlightTitle">A polished operating system for organizations that need trust.</h3>
                  <p className="org-spotlightBody">
                    Replace scattered forms and manual follow-up with a single place for publishing, tracking, verifying,
                    and recognizing participation.
                  </p>
                  <ul className="org-spotlightList">
                    {trustHighlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div ref={statsRef} className="org-stats" aria-label="Organization statistics">
                  <div className="org-stat">
                    <div className="org-statLabel">Organizations</div>
                    <div className="org-statValue">
                      <CountUp target={organizationsTarget} enabled={statsEnabled} format={(n) => `${n}+`} />
                    </div>
                  </div>
                  <div className="org-stat">
                    <div className="org-statLabel">Communities</div>
                    <div className="org-statValue">
                      <CountUp target={communitiesTarget} enabled={statsEnabled} format={(n) => `${n}+`} />
                    </div>
                  </div>
                  <div className="org-stat">
                    <div className="org-statLabel">Verified Contributions</div>
                    <div className="org-statValue">
                      <CountUp
                        target={verifiedContributionsTarget}
                        enabled={statsEnabled}
                        format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k+` : `${n}+`)}
                      />
                    </div>
                  </div>
                  <div className="org-stat">
                    <div className="org-statLabel">Certificates Issued</div>
                    <div className="org-statValue">
                      <CountUp
                        target={certificatesTarget}
                        enabled={statsEnabled}
                        format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k+` : `${n}+`)}
                      />
                    </div>
                  </div>
                  <div className="org-statWide">
                    <div className="org-statLabel">Opportunities Created</div>
                    <div className="org-statValue">
                      <CountUp target={opportunitiesTarget} enabled={statsEnabled} format={(n) => `${n.toLocaleString()}+`} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3 — WHAT IS GUILD */}
            <section className="org-section" aria-label="What is Guild">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">What is Guild</div>
                <h2 className="org-h2">A complete operating system for verified opportunities.</h2>
              </div>

              <div className="org-cardGrid" role="list" aria-label="Guild capabilities">
                {cards.map((c, idx) => (
                  <RevealOnScroll key={c.k} className="org-capCard" delayMs={idx * 90}>
                    <div className="org-capIcon" aria-hidden="true" />
                    <h3 className="org-capTitle">{c.k}</h3>
                    <p className="org-capBody">{c.d}</p>
                  </RevealOnScroll>
                ))}
              </div>
            </section>

            {/* SECTION 4 — PLATFORM PREVIEW */}
            <section className="org-section" aria-label="Platform preview">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">Platform Preview</div>
                <h2 className="org-h2">See the platform in action.</h2>
              </div>

              <div className="org-mockups" aria-label="Platform mockups">
                {/* Desktop mockup */}
                <div className="org-macMock" aria-label="Desktop dashboard">
                  <div className="org-macScreen">
                    <div className="org-dashboardContent">
                      <div className="org-dashboardHeader">
                        <div className="org-dashboardTitle">Opportunities</div>
                        <div className="org-dashboardSubtitle">Manage verified opportunities</div>
                      </div>
                      <div className="org-dashboardGrid">
                        <div className="org-dashboardItem">
                          <div className="org-dashboardItemLabel">Active</div>
                          <div className="org-dashboardItemValue">24</div>
                        </div>
                        <div className="org-dashboardItem">
                          <div className="org-dashboardItemLabel">Applications</div>
                          <div className="org-dashboardItemValue">187</div>
                        </div>
                        <div className="org-dashboardItem">
                          <div className="org-dashboardItemLabel">Verified</div>
                          <div className="org-dashboardItemValue">156</div>
                        </div>
                        <div className="org-dashboardItem">
                          <div className="org-dashboardItemLabel">Certificates</div>
                          <div className="org-dashboardItemValue">142</div>
                        </div>
                      </div>
                      <div className="org-dashboardTable">
                        <div className="org-tableRow">
                          <span className="org-tableCell">Summer Internship</span>
                          <span className="org-tableCell org-tableCell--muted">45 applicants</span>
                        </div>
                        <div className="org-tableRow">
                          <span className="org-tableCell">Community Service Day</span>
                          <span className="org-tableCell org-tableCell--muted">32 verified</span>
                        </div>
                        <div className="org-tableRow">
                          <span className="org-tableCell">Leadership Workshop</span>
                          <span className="org-tableCell org-tableCell--muted">28 registered</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile mockup */}
                <div className="org-phoneMock" aria-label="Mobile dashboard">
                  <div className="org-phoneScreen">
                    <div className="org-mobileContent">
                      <div className="org-mobileMeta">Opportunities</div>
                      <div className="org-mobileCard">
                        <div className="org-mobileCardTitle">Summer Internship</div>
                        <div className="org-mobileCardMeta">45 applicants • 12 verified</div>
                        <div className="org-mobileCardBar" />
                      </div>
                      <div className="org-mobileCard">
                        <div className="org-mobileCardTitle">Service Day</div>
                        <div className="org-mobileCardMeta">32 participants • 28 verified</div>
                        <div className="org-mobileCardBar" style={{ width: '85%' }} />
                      </div>
                      <div className="org-mobileCard">
                        <div className="org-mobileCardTitle">Workshop</div>
                        <div className="org-mobileCardMeta">28 registered • 24 attended</div>
                        <div className="org-mobileCardBar" style={{ width: '78%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="orgs-flyer-features" className="sr-only">Explore Features anchor</div>

              <div className="org-screenshotRow" aria-label="Feature highlights">
                <div className="org-screenshotPlaceholder">
                  <div className="org-screenshotContent">
                    <div className="org-screenshotIcon">📋</div>
                    <div className="org-screenshotLabel">Opportunity Publishing</div>
                  </div>
                </div>
                <div className="org-screenshotPlaceholder">
                  <div className="org-screenshotContent">
                    <div className="org-screenshotIcon">✓</div>
                    <div className="org-screenshotLabel">Verification</div>
                  </div>
                </div>
                <div className="org-screenshotPlaceholder">
                  <div className="org-screenshotContent">
                    <div className="org-screenshotIcon">📊</div>
                    <div className="org-screenshotLabel">Analytics Dashboard</div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 5 — EVERYTHING IN ONE PLACE */}
            <section className="org-section" aria-label="Everything in one place">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">Everything in One Place</div>
                <h2 className="org-h2">From publishing to reputation—unified.</h2>
              </div>

              <div className="org-featureGrid" role="list" aria-label="Feature grid">
                {features.map((f, idx) => (
                  <RevealOnScroll key={f.t} className="org-feature" delayMs={idx * 50}>
                    <div className="org-featureTop">
                      <div className="org-featureDot" aria-hidden="true" />
                      <h3 className="org-featureTitle">{f.t}</h3>
                    </div>
                    <p className="org-featureBody">{f.d}</p>
                  </RevealOnScroll>
                ))}
              </div>
            </section>

            {/* SECTION 6 — WHY ORGANIZATIONS CHOOSE GUILD */}
            <section className="org-section" aria-label="Why organizations choose Guild">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">Why Organizations Choose Guild</div>
                <h2 className="org-h2">Modern workflows. Trustworthy verification. Lasting community.</h2>
              </div>

              <div className="org-compareWrap">
                <div className="org-compareTable" role="table" aria-label="Comparison table">
                  <div className="org-compareHead" role="rowgroup">
                    <div className="org-compareCell org-compareTh" role="columnheader">Traditional Process</div>
                    <div className="org-compareCell org-compareTh" role="columnheader">Guild</div>
                  </div>
                  <div className="org-compareRow" role="row">
                    <div className="org-compareCell" role="cell">Google Forms → Unified Platform</div>
                    <div className="org-compareCell" role="cell">Guild publishes & tracks full opportunity lifecycle.</div>
                  </div>
                  <div className="org-compareRow" role="row">
                    <div className="org-compareCell" role="cell">Excel Sheets → Smart Dashboard</div>
                    <div className="org-compareCell" role="cell">One dashboard for verification, certificates, XP & reputation.</div>
                  </div>
                  <div className="org-compareRow" role="row">
                    <div className="org-compareCell" role="cell">Manual Certificates → Verified Certificates</div>
                    <div className="org-compareCell" role="cell">Verified certificates backed by digital proof trails.</div>
                  </div>
                  <div className="org-compareRow" role="row">
                    <div className="org-compareCell" role="cell">Manual Verification → Digital Verification</div>
                    <div className="org-compareCell" role="cell">Audit-ready verification built into the workflow.</div>
                  </div>
                  <div className="org-compareRow" role="row">
                    <div className="org-compareCell" role="cell">Scattered Communities → One Guild Network</div>
                    <div className="org-compareCell" role="cell">Cohorts connect into a persistent community graph.</div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 7 — HOW IT WORKS */}
            <section className="org-section" aria-label="How it works">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">How it works</div>
                <h2 className="org-h2">From opportunity creation to community growth.</h2>
              </div>

              <div className="org-timeline" aria-label="Animated timeline" role="list">
                {timeline.map((t, idx) => (
                  <RevealOnScroll key={t} className="org-step" delayMs={idx * 100}>
                    <div className="org-stepIndex" aria-hidden="true">
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="org-stepCard">
                      <div className="org-stepDot" aria-hidden="true" />
                      <div className="org-stepText">{t}</div>
                    </div>
                    {idx < timeline.length - 1 && <div className="org-stepArrow" aria-hidden="true">↓</div>}
                  </RevealOnScroll>
                ))}
              </div>
            </section>

            {/* SECTION 8 — BENEFITS */}
            <section className="org-section" aria-label="Benefits">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">Benefits</div>
                <h2 className="org-h2">Everything you need to scale verified opportunities.</h2>
              </div>

              <div className="org-benefitGrid" role="list" aria-label="Benefits cards">
                {[
                  { t: 'Save Time', d: 'Automate workflows across publishing, participants, verification & certificates.' },
                  { t: 'Build Trust', d: 'Digital proof trails make contributions legible and audit-ready.' },
                  { t: 'Digital Verification', d: 'Verification becomes a consistent system—not a manual process.' },
                  { t: 'Professional Branding', d: 'A premium, institutional experience that feels official and reliable.' },
                  { t: 'Centralized Dashboard', d: 'See applications, attendance, certificates, and outcomes in one view.' },
                  { t: 'Community Growth', d: 'Turn cohorts into connected communities with reputation and XP.' }
                ].map((b, idx) => (
                  <RevealOnScroll key={b.t} className="org-benefit" delayMs={idx * 80}>
                    <h3 className="org-benefitTitle">{b.t}</h3>
                    <p className="org-benefitBody">{b.d}</p>
                  </RevealOnScroll>
                ))}
              </div>
            </section>

            {/* SECTION 9 — COMMON USE CASES */}
            <section className="org-section" aria-label="Use cases">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">Common Use Cases</div>
                <h2 className="org-h2">A flexible fit for teams that want structure and proof.</h2>
              </div>

              <div className="org-testGrid" aria-label="Common use cases" role="list">
                {useCases.map((item) => (
                  <article key={item.title} className="org-testCard" role="listitem">
                    <div className="org-testAvatar" aria-hidden="true" />
                    <h3 className="org-capTitle">{item.title}</h3>
                    <p className="org-capBody">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* SECTION 10 — FAQ */}
            <section className="org-section" aria-label="FAQ">
              <div className="org-sectionHeader">
                <div className="org-eyebrow">FAQ</div>
                <h2 className="org-h2">Clear answers for partner organizations.</h2>
              </div>

              <Accordion items={faq} />
            </section>

            {/* SECTION 11 — FINAL CALL TO ACTION */}
            <section className="org-section org-final" aria-label="Ready to Build Your Community">
              <div className="org-finalCard">
                <div className="org-eyebrow">Ready</div>
                <h2 className="org-finalH2">Ready to Build Your Community?</h2>
                <p className="org-finalSub">
                  Join hundreds of future organizations building trusted opportunities with Guild.
                </p>

                <div className="org-finalActions">
                  <Link to="/org-register" className="org-finalPrimary" data-icon>
                    <span>Register Your Organization</span>
                    <span className="org-ctaIcon" aria-hidden="true">
                      →
                    </span>
                  </Link>
                  <Link to="/contact" className="org-finalSecondary">
                    Schedule a Demo
                  </Link>
                </div>
              </div>
            </section>

            <div className="org-footer" aria-label="Footer">
              <div className="org-footerInner">
                <span className="org-footerBrand">The Guild</span>
                <span className="org-footerSep">•</span>
                <span className="org-footerSmall">Central platform for verified opportunities</span>
                <span className="org-footerSep">•</span>
                <Link to="/privacy" className="org-footerLink">Privacy</Link>
                <Link to="/terms" className="org-footerLink">Terms</Link>
              </div>
            </div>
          </main>
        </div>
      </CinematicGuildLandingLayout>
    </>
  );
}

