import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO, { PAGE_SEO } from '../components/SEO';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page Not Found | Guild — The Human Growth Engine';
  }, []);

  return (
    <>
      <SEO
        title="Page Not Found"
        description="The page you are looking for does not exist or has been moved."
        keywords={['404', 'not found', 'guild']}
        noIndex
      />
      <div className="space-y-6 py-10 text-left max-w-2xl mx-auto animate-fade-up">
        <div className="panel p-8 rounded-2xl bg-[var(--card)] border border-[var(--border)]">
          <h1 className="text-3xl font-black tracking-tight">404</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            The page you are looking for could not be found.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/"
              className="primary px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              Back to Home
            </Link>
            <Link
              to="/quests"
              className="secondary px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2"
            >
              Browse Quests
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

