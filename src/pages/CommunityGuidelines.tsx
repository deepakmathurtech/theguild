import SEO, { PAGE_SEO } from '../components/SEO';

export default function CommunityGuidelines() {
  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-black mb-6">Community Guidelines</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">Our Community</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Guild is a community of builders, creators, and researchers committed to civilizational growth.
              These guidelines ensure we maintain a respectful, productive environment for all members.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Respect & Integrity</h2>
            <ul className="text-sm text-[var(--text-secondary)] list-disc pl-4 space-y-1">
              <li>Treat all members with respect and professionalism</li>
              <li>Provide honest, constructive feedback on quest submissions</li>
              <li>Give credit where credit is due</li>
              <li>Report concerns through appropriate channels</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Quality Work</h2>
            <ul className="text-sm text-[var(--text-secondary)] list-disc pl-4 space-y-1">
              <li>Complete quest work in good faith</li>
              <li>Submit thorough, well-documented solutions</li>
              <li>Verify your work before submission</li>
              <li>Be responsive to feedback from reviewers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Collaboration</h2>
            <ul className="text-sm text-[var(--text-secondary)] list-disc pl-4 space-y-1">
              <li>Share knowledge freely with fellow members</li>
              <li>Help others grow and succeed</li>
              <li>Participate in knowledge base contributions</li>
              <li>Engage constructively in discussions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">What We Don't Tolerate</h2>
            <ul className="text-sm text-[var(--text-secondary)] list-disc pl-4 space-y-1">
              <li>Spam, self-promotion, or off-topic content</li>
              <li>Disrespectful or discriminating behavior</li>
              <li>Plagiarism or intellectual property theft</li>
              <li>Attempts to game the reputation system</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Enforcement</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Violations may result in warnings, reputation penalties, or account suspension.
              Repeated violations or severe misconduct may lead to permanent removal from the platform.
              If you see violations, please report them through your Guild dashboard.
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