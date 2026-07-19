import { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function GrievanceForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issue, setIssue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-3xl mx-auto py-12 px-6">
        <div className="mb-6">
          <p className="eyebrow">Guild Grievance Desk</p>
          <h1 className="text-3xl font-black tracking-tight">Submit a grievance</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Use this form to report issues related to privacy, payments, safety, moderation, or platform operations. We will review your concern and contact you if we need more details.
          </p>
        </div>

        {submitted ? (
          <div className="panel rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-lg font-bold">Your grievance has been recorded</h2>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Thank you. Our team will review this request and follow up through the contact details you provided.
            </p>
            <Link to="/grievance" className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]">Back to policy overview</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="panel rounded-2xl border border-[var(--border-subtle)] p-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-3 text-sm" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">Describe your concern</label>
              <textarea value={issue} onChange={(e) => setIssue(e.target.value)} required rows={6} className="w-full rounded-xl border border-[var(--border)] bg-[var(--input-bg)] px-3 py-3 text-sm" />
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)] p-3 text-xs text-[var(--text-secondary)]">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--primary)]" />
              <span>We may need to contact you for supporting evidence. Please include relevant links, screenshots, or transaction references where possible.</span>
            </div>
            <button type="submit" className="primary rounded-xl px-4 py-2.5 text-sm font-bold">Submit grievance</button>
          </form>
        )}
      </div>
    </>
  );
}
