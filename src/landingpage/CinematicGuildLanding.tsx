import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';
import CinematicGuildLandingLayout from './CinematicGuildLandingLayout';


type RevealItem = {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
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

function useOnceCountUp(target: number, enabled: boolean, durationMs = 1100) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, target, durationMs]);

  return value;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function usePointerParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let mounted = true;
    let raf = 0;
    const next = { x: 0, y: 0 };

    const flush = () => {
      raf = 0;
      if (mounted) setOffset({ x: next.x, y: next.y });
    };

    const onMove = (e: PointerEvent) => {
      if (!mounted) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const nx = (e.clientX / w) * 2 - 1;
      const ny = (e.clientY / h) * 2 - 1;
      next.x = clamp(nx, -1, 1);
      next.y = clamp(ny, -1, 1);
      if (!raf) raf = requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      mounted = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return offset;
}

function SoftOrbitEmblem({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div
      className="cg-emblemWrap"
      role="img"
      aria-label="The Guild emblem, animated"
      data-reduced={reducedMotion ? '1' : '0'}
    >
      <div className="cg-rayLayer" aria-hidden="true" />

      <div className="cg-orbit" aria-hidden="true" />
      <div className="cg-orbit2" aria-hidden="true" />

      <div className="cg-emblemCard">
        <div className="cg-emblemInner">
          <img src="/guild-logo.png" alt="" className="cg-emblemImg" />
        </div>
        <div className="cg-bloom" aria-hidden="true" />
      </div>

      <div className="cg-dust" aria-hidden="true" />

      <div className="sr-only">
        The Guild is alive and active. Subtle motion indicates an operating system-like environment.
      </div>
    </div>
  );
}

interface NetworkNode {
  label: string;
  angle: number;
  distance: number;
  r: number;
  pulseSpeed: number;
  details: string;
}

function InteractiveFederationNetwork({ pointer, reducedMotion }: { pointer: { x: number; y: number }; reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef(pointer);
  const nodes = useMemo<NetworkNode[]>(
    () => [
      { label: 'Chapters', angle: 0, distance: 130, r: 8, pulseSpeed: 0.02, details: 'Civic Atlas & Commons' },
      { label: 'Quests', angle: Math.PI * 0.4, distance: 160, r: 6, pulseSpeed: 0.03, details: 'Active proof paths' },
      { label: 'Knowledge', angle: Math.PI * 0.9, distance: 140, r: 7, pulseSpeed: 0.015, details: 'Permanent playbooks' },
      { label: 'Impact', angle: Math.PI * 1.3, distance: 170, r: 9, pulseSpeed: 0.025, details: 'Compound civilization growth' },
      { label: 'Proof', angle: Math.PI * 1.7, distance: 150, r: 5, pulseSpeed: 0.035, details: 'Legible contributions' }
    ],
    []
  );

  useEffect(() => {
    pointerRef.current = pointer;
  }, [pointer]);

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = 500;
      const syncSize = () => {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      syncSize();

      let raf = 0;
      let t = 0;

    const draw = () => {
      t += 0.01;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      // Draw faint connections & ambient glowing circles
      ctx.strokeStyle = 'rgba(220, 179, 108, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 100, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 150, 0, Math.PI * 2);
      ctx.stroke();

      // Parallax offsets based on pointer
      const px = pointerRef.current.x * 12;
      const py = pointerRef.current.y * 12;

      nodes.forEach((n) => {
        // Subtle orbital rotation + hover drift
        const currentAngle = n.angle + t * 0.08;
        const nx = cx + Math.cos(currentAngle) * n.distance + px;
        const ny = cy + Math.sin(currentAngle) * n.distance + py;

        // Draw line from center (emblem) to node
        const grad = ctx.createLinearGradient(cx, cy, nx, ny);
        grad.addColorStop(0, 'rgba(220, 179, 108, 0.35)');
        grad.addColorStop(1, 'rgba(220, 179, 108, 0.06)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        // Draw pulsing flow particles on the line
        const particlePos = (t * n.pulseSpeed * 8) % 1;
        const px_particle = cx + (nx - cx) * particlePos;
        const py_particle = cy + (ny - cy) * particlePos;
        ctx.fillStyle = '#dcb36c';
        ctx.beginPath();
        ctx.arc(px_particle, py_particle, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Glowing circle behind node
        const glow = ctx.createRadialGradient(nx, ny, 2, nx, ny, n.r * 2.5);
        glow.addColorStop(0, 'rgba(220, 179, 108, 0.25)');
        glow.addColorStop(1, 'rgba(220, 179, 108, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(nx, ny, n.r * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Solid node circle
        ctx.fillStyle = 'rgba(220, 179, 108, 0.85)';
        ctx.beginPath();
        ctx.arc(nx, ny, n.r / 2 + 1, 0, Math.PI * 2);
        ctx.fill();

        // Node label
        ctx.fillStyle = 'rgba(247, 245, 240, 0.85)';
        ctx.font = 'bold 9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, nx, ny - n.r - 4);
      });

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [nodes, reducedMotion]);

  return (
    <div className="cg-federation-wrap">
      <canvas ref={canvasRef} className="cg-federation-canvas" style={{ width: '100%', height: '100%' }} />
      <div className="cg-emblem-container">
        <SoftOrbitEmblem reducedMotion={reducedMotion} />
      </div>

      {/* Floating UI cards for depth */}
      {!reducedMotion && (
        <>
          <div className="cg-floating-card cg-card-top-right">
            <div className="cg-card-glow" />
            <div className="cg-card-title">Chapter Hub</div>
            <div className="cg-card-subtitle">Active branch coordinates</div>
          </div>
          <div className="cg-floating-card cg-card-bottom-left">
            <div className="cg-card-glow" />
            <div className="cg-card-title">Compound Growth</div>
            <div className="cg-card-subtitle">Verified playbooks</div>
          </div>
        </>
      )}
    </div>
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
      className={`${className ?? ''} cg-reveal${visible ? ' is-visible' : ''}`}
      style={
        {
          transitionDelay: `${delayMs}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function QuestFlow({ reducedMotion }: { reducedMotion: boolean }) {
  const steps = useMemo(
    () => [
      { label: 'Organization', hint: 'Needs emerge from real people and institutions.' },
      { label: 'Need', hint: 'Gaps are named. Priorities are clarified.' },
      { label: 'Quest', hint: 'A plan becomes executable work.' },
      { label: 'Contribution', hint: 'People solve. Proof of work is recorded.' },
      { label: 'Knowledge', hint: 'Lessons are preserved and shareable.' },
      { label: 'Impact', hint: 'Communities grow and civilization advances.' }
    ],
    []
  );

  return (
    <section className="cg-section cg-flowSection" aria-label="Quest flow">
      <div className="cg-sectionHeader">
        <div className="cg-eyebrow">Quest Flow</div>
        <h2 className="cg-h2">From human intent to lasting civilization.</h2>
      </div>

      <div className="cg-flowGrid" role="list">
        {steps.map((s, i) => (
          <div key={s.label} className="cg-flowNode" role="listitem">
            <div className="cg-flowDot" aria-hidden="true" />
            <div className="cg-flowCard">
              <div className="cg-flowTitleRow">
                <div className="cg-flowIndex">{String(i + 1).padStart(2, '0')}</div>
                <div className="cg-flowLabel">{s.label}</div>
              </div>
              <p className="cg-flowHint">{s.hint}</p>
            </div>
            {i < steps.length - 1 && <div className="cg-flowConnector" aria-hidden="true" data-reduced={reducedMotion ? '1' : '0'} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroBackground({ reducedMotion }: { reducedMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const stars = Array.from({ length: 90 }, (_, i) => {
      const r = Math.random() * 1.8 + 0.3;
      return {
        x: Math.random(),
        y: Math.random(),
        r,
        a: Math.random() * Math.PI * 2,
        s: (Math.random() * 0.35 + 0.1) * (i % 2 === 0 ? 1 : -1)
      };
    });

    const lines = Array.from({ length: 42 }, (_, i) => ({
      a: Math.random() * Math.PI * 2,
      x: Math.random(),
      y: Math.random(),
      len: Math.random() * 90 + 50,
      w: 0.6 + Math.random() * 1,
      s: (Math.random() * 0.18 + 0.05) * (i % 2 === 0 ? 1 : -1)
    }));

    const onPointer = (e: PointerEvent) => {
      const nx = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      const ny = (e.clientY / (window.innerHeight || 1)) * 2 - 1;
      pointer.current.x = clamp(nx, -1, 1);
      pointer.current.y = clamp(ny, -1, 1);
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', resize, { passive: true });

    resize();
    let start = performance.now();

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      ctx.clearRect(0, 0, w, h);

      // vignette
      const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, Math.max(w, h) * 0.65);
      g.addColorStop(0, 'rgba(220,179,108,0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // subtle grid-like constellation
      ctx.globalCompositeOperation = 'lighter';
      for (const s of stars) {
        const wobble = Math.sin(t * 0.4 + s.a) * 10;
        const px = pointer.current.x * 22;
        const py = pointer.current.y * 18;
        const x = s.x * w + Math.cos(t * 0.18 + s.a) * wobble + px * (0.2 + s.r / 3);
        const y = s.y * h + Math.sin(t * 0.16 + s.a) * wobble + py * (0.2 + s.r / 3);
        const alpha = 0.12 + (Math.sin(t * 0.9 + s.a) + 1) / 2 * 0.25;
        ctx.fillStyle = `rgba(220,179,108,${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // light lines
      for (const l of lines) {
        const dx = Math.cos(t * 0.08 + l.a) * (l.s * 90);
        const dy = Math.sin(t * 0.08 + l.a) * (l.s * 70);
        const ox = pointer.current.x * 36;
        const oy = pointer.current.y * 26;
        const x1 = l.x * w + ox + dx;
        const y1 = l.y * h + oy + dy;
        const x2 = x1 + Math.cos(l.a) * l.len;
        const y2 = y1 + Math.sin(l.a) * l.len;
        ctx.strokeStyle = `rgba(220,179,108,0.045)`;
        ctx.lineWidth = l.w;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onVis = () => {
      if (document.hidden) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      } else {
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(draw);
        }
      }
    };

    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        ctx?.clearRect(0, 0, c.width, c.height);
      }
    }
  }, [reducedMotion]);

  return (
    <>
      <canvas ref={canvasRef} className="cg-bgCanvas" aria-hidden="true" />
      <div className="cg-bgRays" aria-hidden="true" />
      <div className="cg-bgDust" aria-hidden="true" />
    </>
  );
}

export default function CinematicGuildLanding() {
  const reducedMotion = usePrefersReducedMotion();
  const pointer = usePointerParallax();

  // Ensure desktop “Skip to content” works even if browser jumps are blocked by layered layout.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#cg-main') {
      const el = document.getElementById('cg-main');
      el?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  }, [reducedMotion]);


  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setStatsVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const members = useOnceCountUp(950, statsVisible && !reducedMotion);
  const quests = useOnceCountUp(2330, statsVisible && !reducedMotion);
  const branches = useOnceCountUp(3, statsVisible && !reducedMotion);
  const outcomes = useOnceCountUp(107, statsVisible && !reducedMotion); // 1.07 Cr -> 107 lakhs approx visualization

  const story: RevealItem[] = useMemo(
    () => [
      {
        id: 'human-potential',
        eyebrow: 'Human Potential',
        title: 'Human potential deserves a guild.',
        body: 'Problems remain unsolved when knowledge is locked in individuals. Guild turns effort into repeatable progress.'
      },
      {
        id: 'needs',
        eyebrow: 'Organizations Have Needs',
        title: 'Needs want organized action.',
        body: 'Every community, institution, and frontier faces gaps. Guild provides the structure to name them and move.'
      },
      {
        id: 'quests',
        eyebrow: 'Guild Creates Quests',
        title: 'A quest is work with a proof path.',
        body: 'From plan to execution to verification, Guild makes contribution legible and measurable.'
      },
      {
        id: 'knowledge',
        eyebrow: 'Knowledge is Preserved',
        title: 'Lessons become civilization memory.',
        body: 'When quests finish, playbooks are preserved—so the next team starts where others ended.'
      }
    ],
    []
  );

  return (
    <>
      <SEO
        {...PAGE_SEO.home}
        title="The Guild — Cinematic Entry"
        description="Enter The Guild operating experience. Civilizations are built by people—organized through quests that preserve knowledge and compound impact."
        keywords={['The Guild', 'civilization', 'quests', 'knowledge', 'impact', 'human potential']}
      />

      <CinematicGuildLandingLayout>
      <div className="cg-root" data-reduced={reducedMotion ? '1' : '0'}>


        <a className="cg-skip" href="#cg-main">
          Skip to content
        </a>

        <HeroBackground reducedMotion={reducedMotion} />

        <header className="cg-top">
          <div className="cg-topLeft">
            <img src="/guild-logo.png" alt="The Guild" className="cg-topLogo" />
            <div className="cg-topTitle">
              <span className="cg-topBrand">THE GUILD</span>
              <span className="cg-topSub">Operating experience for human growth</span>
            </div>
          </div>

          <nav className="cg-topNav" aria-label="Primary">
            <Link to="/quests" className="cg-link">
              Browse Quests
            </Link>
            <Link to="/org-register" className="cg-btn">
              Partner With Us
            </Link>
          </nav>
        </header>

        <main id="cg-main" className="cg-main">
          {/* HERO */}
          <section className="cg-hero" aria-label="The Guild cinematic hero">
            <div className="cg-heroInner">
              <div className="cg-heroLeft">
                <div className="cg-heroEyebrow">Civilizations are built by people.</div>

                <h1 className="cg-h1">
                  <span className="cg-h1Line">Human Potential</span>
                  <span className="cg-h1Line cg-h1LineGold">Deserves a Guild.</span>
                </h1>

                <p className="cg-heroLead">
                  Build. Solve. Grow. Together.
                  <span className="cg-heroLeadMuted"> — a cinematic system for organized capability.</span>
                </p>

                <div className="cg-heroActions">
                  <Link to="/auth" className="cg-ctaPrimary" data-icon>
                    <span>Enter the Guild</span>
                    <span className="cg-ctaIcon" aria-hidden="true">
                      →
                    </span>
                  </Link>

                  <Link to="/impact" className="cg-ctaSecondary">
                    See Impact
                  </Link>
                </div>

                <div className="cg-heroMeta" aria-label="Highlights">
                  <div className="cg-chip">Verified proof path</div>
                  <div className="cg-chip">Federated chapters</div>
                  <div className="cg-chip">Knowledge preserved</div>
                </div>
              </div>

              <div className="cg-heroRight" aria-hidden={false}>
                <div
                  className="cg-pointerDepth"
                  style={
                    {
                      ['--px' as string]: String(pointer.x),
                      ['--py' as string]: String(pointer.y)
                    } as React.CSSProperties
                  }
                >
                  <InteractiveFederationNetwork pointer={pointer} reducedMotion={reducedMotion} />
                </div>
              </div>
            </div>

            <div className="cg-heroScrollCue" aria-hidden="true">
              <div className="cg-cueLine" />
              <div className="cg-cueText">Scroll to enter the story</div>
            </div>
          </section>

          <div className="cg-scrollstory-connector" aria-hidden="true" />

          {/* STORY */}
          <section className="cg-section cg-storySection" aria-label="Story">
            <div className="cg-sectionHeader">
              <div className="cg-eyebrow">Story</div>
              <h2 className="cg-h2">Organizations exist for action—and action becomes civilization.</h2>
            </div>

            <div className="cg-storyGrid">
              {story.map((item, idx) => (
                <RevealOnScroll key={item.id} className="cg-storyCard" delayMs={idx * 120}>
                  {item.eyebrow && <div className="cg-storyEyebrow">{item.eyebrow}</div>}
                  <h3 className="cg-storyTitle">{item.title}</h3>
                  <p className="cg-storyBody">{item.body}</p>

                  <div className="cg-storyTransition" aria-hidden="true">
                    <span className="cg-storySlash">↓</span>
                    <span className="cg-storyGlow" />
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </section>

          <div className="cg-scrollstory-connector" aria-hidden="true" />

          {/* STATS */}
          <section className="cg-section cg-statsSection" aria-label="Guild statistics">
            <div className="cg-sectionHeader">
              <div className="cg-eyebrow">Operating Metrics</div>
              <h2 className="cg-h2">Measured work. Proven outcomes. Compounding trust.</h2>
            </div>

            <div ref={statsRef} className="cg-statsGrid">
              <div className="cg-stat">
                <div className="cg-statLabel">Active Members</div>
                <div className="cg-statValue">{reducedMotion ? '950+' : `${members}+`}</div>
              </div>
              <div className="cg-stat">
                <div className="cg-statLabel">Completed Quests</div>
                <div className="cg-statValue">{reducedMotion ? '2,330' : quests.toLocaleString()}</div>
              </div>
              <div className="cg-stat">
                <div className="cg-statLabel">Active Chapters</div>
                <div className="cg-statValue">{reducedMotion ? '3 Branches' : `${branches} Branches`}</div>
              </div>
              <div className="cg-stat">
                <div className="cg-statLabel">Outcomes Verified</div>
                <div className="cg-statValue">{reducedMotion ? '₹1.07 Cr' : `₹${(outcomes / 100).toFixed(2)} Cr`}</div>
              </div>
            </div>
          </section>

          <div className="cg-scrollstory-connector" aria-hidden="true" />

          <QuestFlow reducedMotion={reducedMotion} />

          <div className="cg-scrollstory-connector" aria-hidden="true" />

          {/* ORGANIZATION SHOWCASE */}
          <section className="cg-section cg-orgsSection" aria-label="Organization showcase">
            <div className="cg-sectionHeader">
              <div className="cg-eyebrow">Organization Showcase</div>
              <h2 className="cg-h2">Projects that move people forward.</h2>
            </div>

            <div className="cg-orgGrid">
              {/* These are non-verifying placeholders. Replace later with real organizations if/when available. */}
              {[
                { name: 'Civic Atlas', role: 'Community Builders', status: 'Verified pathway', color: 'a' },
                { name: 'Learning District', role: 'Education Partners', status: 'Verified pathway', color: 'b' },
                { name: 'Quest Commons', role: 'Research & Skills', status: 'Verified pathway', color: 'c' },
                { name: 'Impact Studio', role: 'Outcome Delivery', status: 'Verified pathway', color: 'd' }
              ].map((o) => (
                <RevealOnScroll key={o.name} className="cg-orgCard" delayMs={60}>
                  <div className={`cg-orgMark cg-orgMark-${o.color}`} aria-hidden="true">
                    <span className="cg-orgMarkInner">G</span>
                  </div>
                  <div className="cg-orgName">{o.name}</div>
                  <div className="cg-orgRole">{o.role}</div>
                  <div className="cg-orgHoverRow">
                    <div className="cg-orgStatus">{o.status}</div>
                    <div className="cg-orgHoverHint">Hover to reveal projects</div>
                  </div>

                  <div className="cg-orgHoverDetails" aria-hidden="true">
                    <div className="cg-orgDetail">• Verified quest playbooks</div>
                    <div className="cg-orgDetail">• Community reception loop</div>
                    <div className="cg-orgDetail">• Knowledge hub publishing</div>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </section>

          <div className="cg-scrollstory-connector" aria-hidden="true" />

          {/* FINAL CTA */}
          <section className="cg-section cg-finalCta" aria-label="Final call to action">
            <div className="cg-finalInner">
              <div className="cg-eyebrow">Ready</div>
              <h2 className="cg-h2">Build with proof. Solve with knowledge. Grow with people.</h2>
              <div className="cg-finalActions">
                <Link to="/quests" className="cg-ctaPrimary" data-icon>
                  <span>Browse Active Quests</span>
                  <span className="cg-ctaIcon" aria-hidden="true">→</span>
                </Link>
                <Link to="/org-register" className="cg-ctaSecondary">Partner With Us</Link>
              </div>
              <p className="cg-finalFinePrint">Build verified proof of work, unlock career credentials, and coordinate community outcomes.</p>
            </div>
          </section>
        </main>

        <footer className="cg-footer" aria-label="Footer">
          <div className="cg-footerInner">
            <span className="cg-footerBrand">The Guild</span>
            <span className="cg-footerSep">•</span>
            <span className="cg-footerSmall">Civilization-oriented work verification platform</span>
            <span className="cg-footerSep">•</span>
            <Link to="/privacy" className="cg-footerLink">Privacy</Link>
            <Link to="/terms" className="cg-footerLink">Terms</Link>
          </div>
        </footer>
      </div>
      </CinematicGuildLandingLayout>
    </>
  );
}

