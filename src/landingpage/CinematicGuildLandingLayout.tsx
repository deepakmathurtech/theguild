import type { PropsWithChildren } from 'react';


/**
 * Isolated layout wrapper for the cinematic landing page.
 * The goal is to avoid conflicts with the app Shell/sidebar styles.
 */
export default function CinematicGuildLandingLayout({ children }: PropsWithChildren) {
  return (
    <div className="cg-landing-isolated" data-cg-landing-isolated="true">
      {children}
    </div>
  );
}

