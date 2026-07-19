import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';

const policies = [
  { title: 'Terms of Service', href: '/terms', summary: 'The agreement that governs account access, platform usage, quests, events, and dispute handling.' },
  { title: 'Privacy Policy', href: '/privacy', summary: 'How Guild collects, uses, secures, and shares user and organization information.' },
  { title: 'Community Guidelines', href: '/community', summary: 'The standards for respectful behavior, quality work, and safe participation.' },
  { title: 'Refund & Cancellation Policy', href: '/refund', summary: 'How refund requests and cancellations are reviewed for paid or booked experiences.' },
  { title: 'Payment & Commission Policy', href: '/payment-commission', summary: 'How payments, commissions, and platform charges are applied.' },
  { title: 'Payout Policy', href: '/payout', summary: 'How funds are settled and distributed to organizers and contributors.' },
  { title: 'Dispute Resolution Policy', href: '/dispute-resolution', summary: 'How conflicts, chargebacks, and case escalations are handled.' },
  { title: 'Prohibited Activities Policy', href: '/prohibited-activities', summary: 'The actions that are not permitted on the platform.' },
  { title: 'Intellectual Property Policy', href: '/intellectual-property', summary: 'How rights, ownership, and submissions are treated across quests and events.' },
  { title: 'Grievance Redressal Policy', href: '/grievance', summary: 'How members and organizations can raise concerns and receive a response.' },
  { title: 'Cookie Policy', href: '/cookies', summary: 'How browser storage and session tools support platform functionality.' },
  { title: 'Organization Verification Policy', href: '/verification-policy', summary: 'How organization identity and trust are established on the platform.' },
];

export default function LegalCenter() {
  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-6xl mx-auto py-12 px-6">
        <div className="mb-8 max-w-3xl">
          <p className="eyebrow">Guild Legal Center</p>
          <h1 className="text-3xl font-black tracking-tight">Legal and Compliance Center</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            These policies explain how Guild operates, how trust is maintained, and how members and organizations can seek help when something needs attention.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((policy) => (
            <Link
              key={policy.href}
              to={policy.href}
              className="group panel p-6 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{policy.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{policy.summary}</p>
                </div>
                <span className="text-xs font-semibold text-[var(--primary)]">Read →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
