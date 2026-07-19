import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../SEO';

export type LegalSection = {
  title: string;
  body: string;
  items?: string[];
};

type LegalPolicyPageProps = {
  title: string;
  summary: string;
  sections: LegalSection[];
  action?: { label: string; to: string };
  intro?: React.ReactNode;
  footer?: React.ReactNode;
};

export default function LegalPolicyPage({ title, summary, sections, action, intro, footer }: LegalPolicyPageProps) {
  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-4xl mx-auto py-12 px-6">
        <div className="mb-8">
          <p className="eyebrow">Guild Legal Center</p>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] max-w-2xl">{summary}</p>
          {intro}
        </div>

        <div className="grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="panel p-6 rounded-2xl border border-[var(--border-subtle)]">
              <h2 className="text-lg font-bold mb-3">{section.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{section.body}</p>
              {section.items && (
                <ul className="mt-3 list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-2">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>

        {action && (
          <Link to={action.to} className="primary inline-flex mt-6 px-4 py-2 rounded-xl text-sm font-bold">
            {action.label}
          </Link>
        )}

        {footer && <div className="mt-8 text-sm text-[var(--text-muted)]">{footer}</div>}
      </div>
    </>
  );
}
