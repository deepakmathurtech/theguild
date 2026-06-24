import SEO, { PAGE_SEO } from '../components/SEO';

export default function TermsOfService() {
  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-black mb-6">Terms of Service</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">Acceptance of Terms</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              By accessing Guild, you agree to these terms. If you do not agree, please do not use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">User Responsibilities</h2>
            <ul className="text-sm text-[var(--text-secondary)] list-disc pl-4 space-y-1">
              <li>Provide accurate information during registration</li>
              <li>Complete quest work in good faith</li>
              <li>Respect other members and organizations</li>
              <li>Follow Guild community guidelines</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Quest Participation</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              When you accept a quest, you agree to complete the stated work. Failure to do so
              may affect your reputation and future opportunities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Intellectual Property</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Work submitted for quests belongs to the organization unless otherwise arranged.
              Your contributions remain credited in Guild records.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Limitation of Liability</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Guild provides the platform as-is. We are not liable for disputes between
              members and organizations beyond our platform services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Account Termination</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              We reserve the right to terminate accounts that violate these terms or
              engage in harmful behavior.
            </p>
          </section>

          <p className="text-xs text-[var(--text-muted)] pt-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </>
  );
}