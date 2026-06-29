import { Link } from 'react-router-dom';
import { Compass, Mail, Shield } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--card)] mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <Compass className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <span className="font-bold text-lg">Guild</span>
            </Link>
            <p className="text-xs text-[var(--text-muted)]">
              The Human Growth Engine connecting builders with opportunity.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/quests" className="hover:text-[var(--primary)]">Quest Board</Link></li>
              <li><Link to="/organizations" className="hover:text-[var(--primary)]">Organizations</Link></li>
              <li><Link to="/branches" className="hover:text-[var(--primary)]">Branches</Link></li>
              <li><Link to="/impact" className="hover:text-[var(--primary)]">Impact</Link></li>
              <li><Link to="/about" className="hover:text-[var(--primary)]">About</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/support" className="hover:text-[var(--primary)]">Support</Link></li>
              <li><Link to="/contact" className="hover:text-[var(--primary)] flex items-center gap-2">
                <Mail className="w-3 h-3" /> Contact
              </Link></li>
              <li><Link to="/faq" className="hover:text-[var(--primary)]">FAQ</Link></li>
              <li><Link to="/docs" className="hover:text-[var(--primary)]">Knowledge Base</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-[var(--primary)]">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[var(--primary)]">Terms of Service</Link></li>
              <li><Link to="/community" className="hover:text-[var(--primary)]">Community Guidelines</Link></li>
              <li><Link to="/refund" className="hover:text-[var(--primary)]">Refund & Cancellation</Link></li>
              <li><Link to="/cookies" className="hover:text-[var(--primary)]">Cookie Policy</Link></li>
              <li><Link to="/disclaimer" className="hover:text-[var(--primary)]">Disclaimer</Link></li>
              <li><Link to="/careers" className="hover:text-[var(--primary)]">Careers</Link></li>
              <li><Link to="/press" className="hover:text-[var(--primary)]">Press / Media</Link></li>
              <li><Link to="/brand" className="hover:text-[var(--primary)]">Brand Assets</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {currentYear} Guild. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Shield className="w-3 h-3" />
            <span>Trusted by organizations worldwide</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
