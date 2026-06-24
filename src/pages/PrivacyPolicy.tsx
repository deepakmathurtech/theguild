import SEO, { PAGE_SEO } from '../components/SEO';

export default function PrivacyPolicy() {
  return (
    <>
      <SEO {...PAGE_SEO.home} />
      <div className="page-shell max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-black mb-6">Privacy Policy</h1>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">Information We Collect</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Guild collects information you provide directly, including your name, email, and profile details when you register.
              We also collect data about your quest participation, submissions, and platform activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">How We Use Your Information</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Your information is used to provide Guild services, match you with appropriate quests,
              communicate about opportunities, and improve our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data Sharing</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              We do not sell your personal information. Your data is shared only with organizations
              when you apply to their quests, and with Guild operations team members as needed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Data Security</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              We implement industry-standard security measures to protect your data.
              While no system is completely secure, we take reasonable precautions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Your Rights</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              You may access, update, or delete your account information at any time through your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Contact</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              For privacy questions, contact support through your Guild dashboard.
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