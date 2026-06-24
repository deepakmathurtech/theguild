import { useState, lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { logout } from './lib/auth';
import { useTheme } from './context/ThemeContext';

// Icons
import {
  TrendingUp, Compass, Building, Bell, User, Settings as SettingsIcon, LogOut,
  Menu, X, Sun, Moon, Award, Network, FileText, Target,
  ShieldCheck, Home as HomeIcon, ArrowLeftRight, Handshake, Users
} from 'lucide-react';

// Pages - Lazy loaded for better bundle size
const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const MemberOnboarding = lazy(() => import('./features/onboarding/MemberOnboarding'));
const OrgOnboarding = lazy(() => import('./features/onboarding/OrgOnboarding'));
const PublicOrgRegistration = lazy(() => import('./features/onboarding/PublicOrgRegistration'));
const OrgLanding = lazy(() => import('./pages/OrgLanding'));
const OrgDashboard = lazy(() => import('./pages/OrgDashboard'));
const OrgOutcomes = lazy(() => import('./pages/OrgOutcomes'));
const OrgNeedsPage = lazy(() => import('./pages/OrgNeedsPage'));
const QuestBoard = lazy(() => import('./pages/QuestBoard'));
const QuestDetails = lazy(() => import('./pages/QuestDetails'));
const MyQuests = lazy(() => import('./pages/MyQuests'));
const MyQuestWorkspace = lazy(() => import('./pages/MyQuestWorkspace'));
const UserQuestCenter = lazy(() => import('./pages/UserQuestCenter'));
const QuestApplications = lazy(() => import('./pages/QuestApplications'));
const SubmissionReviews = lazy(() => import('./pages/SubmissionReviews'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const BranchesPage = lazy(() => import('./pages/Branches'));
const Organizations = lazy(() => import('./pages/Organizations'));
const KnowledgeHub = lazy(() => import('./pages/KnowledgeHub'));
const VerificationCenter = lazy(() => import('./pages/VerificationCenter'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const Settings = lazy(() => import('./pages/Settings'));
const Impact = lazy(() => import('./pages/Impact'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'));
const Footer = lazy(() => import('./components/layout/Footer'));
const NeedDetails = lazy(() => import('./pages/NeedDetails'));
const NeedWizard = lazy(() => import('./pages/NeedWizard'));
const GrowthDashboard = lazy(() => import('./pages/GrowthDashboard'));
const NeedReviewQueue = lazy(() => import('./pages/NeedReviewQueue'));
const SubmissionReviewQueue = lazy(() => import('./pages/SubmissionReviewQueue'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Loading skeleton component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--card-subtle)]" />
        <span className="text-xs text-[var(--text-muted)]">Loading...</span>
      </div>
    </div>
  );
}

import './styles.css';

// Navigation items
const navItems = [
  { to: '/', label: 'Growth', icon: TrendingUp, end: true },
  { to: '/quests', label: 'Quests', icon: Compass },
  { to: '/organizations', label: 'Organizations', icon: Building },
  { to: '/branches', label: 'Network', icon: Network },
  { to: '/docs', label: 'Knowledge', icon: FileText },
  { to: '/impact', label: 'Impact', icon: Target },
  { to: '/org-register', label: 'Partner With Us', icon: Handshake },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const memberItems = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/my-quests', label: 'My Quests', icon: Compass },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

// Organization Representative navigation - exclusive when logged in as org rep
const organizationItems = [
  { to: '/org-dashboard', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/org-outcomes', label: 'Outcomes', icon: Award },
  { to: '/need-submit', label: 'Post Need', icon: Target },
  { to: '/my-needs', label: 'My Needs', icon: FileText },
    { to: '/org-team', label: 'Team', icon: Users },
  { to: '/org-messages', label: 'Messages', icon: Bell },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

// Layout Shell - Same as guild-auth
function AppShell() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  async function handleLogout() {
    await logout();
    navigate('/auth');
  }

  return (
    <div className="shell bg-[var(--bg)] text-[var(--text)]">
      {/* Desktop Sidebar - hidden on mobile, flex on desktop */}
      <aside className="sidebar hidden md:flex flex-col">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-extrabold text-lg shadow-md overflow-hidden">
            <img src="/guild-logo.png" alt="Guild" className="w-full h-full object-contain" />
          </div>
          <div>
            <strong className="block text-sm font-bold tracking-tight">GUILD</strong>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">V3 Platform</span>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Hide main nav for organization representatives - show ONLY org nav */}
          {profile?.role === 'organizationRepresentative' || profile?.role === 'organization' ? (
            <div>
              <div className="px-4 mb-4 p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] mb-1">Organization Mode</p>
                <p className="text-xs text-[var(--text-secondary)]">Your organization's workspace</p>
              </div>
              {organizationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `
                      relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-[var(--primary)]/20 text-[var(--primary)] ring-1 ring-[var(--primary)]/30'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)]/50'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ) : (
          <div>
            <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
              Core
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `
                    relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-[var(--card-subtle)] text-[var(--text)] ring-1 ring-[var(--border-light)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)]/50'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
          )}

          {/* Show member/admin items only for NON-org-rep users */}
          {profile && profile.role !== 'organizationRepresentative' && (
            <div>
              <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">
                Personal
              </p>
              {memberItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `
                      relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                      ${isActive
                        ? 'bg-[var(--card-subtle)] text-[var(--text)] ring-1 ring-[var(--border-light)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--card-subtle)]/50'}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
              {/* Show link to Guild OS admin portal for receptionist+ ( guild admin roles only ) */}
              {['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder'].includes(profile.role) && (
                <a
                  href="/admin"
                  className="relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Guild OS
                </a>
              )}
            </div>
          )}
        </nav>

        {/* Profile footer */}
        {profile && (
          <div className="mt-auto pt-6 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--card-subtle)]/50">
              <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-xs font-bold">
                {profile.fullName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{profile.fullName}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{profile.role === 'organizationRepresentative' ? 'Organization' : profile.role && ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder'].includes(profile.role) ? 'Admin' : `Rank ${profile.guildRank}`}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-[var(--error)]/10 hover:text-[var(--error)] text-[var(--text-muted)] transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Menu Drawer - shown when hamburger clicked */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg)] md:hidden flex flex-col p-6 animate-fade-up">
          <div className="flex justify-between items-center mb-8">
          <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-extrabold text-lg overflow-hidden">
                <img src="/guild-logo.png" alt="Guild" className="w-full h-full object-contain" />
              </div>
              <div>
                <strong className="block font-bold">GUILD</strong>
                <span className="text-xs text-[var(--text-muted)]">V3 Platform</span>
              </div>
            </div>
            <button
              className="p-3 rounded-xl hover:bg-[var(--card-subtle)] text-[var(--text-secondary)]"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto pb-6 custom-scrollbar">
            {/* Hide main nav for organization representatives - show ONLY org nav */}
            {profile?.role === 'organizationRepresentative' || profile?.role === 'organization' ? (
              <>
                <div className="mb-4 p-3 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Organization Mode</span>
                </div>
                {organizationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => `
                        flex gap-3 items-center px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all
                        ${isActive ? 'bg-[var(--primary)] text-black shadow-lg' : 'bg-[var(--card-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'}
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </>
            ) : (
            <>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex gap-3 items-center px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all
                      ${isActive ? 'bg-[var(--primary)] text-black shadow-lg' : 'bg-[var(--card-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                );
              })}

              {/* Show member/admin items only for NON-org-rep users */}
              {profile && profile.role as string !== 'organizationRepresentative' && (
                <>
                  <div className="h-px bg-[var(--border)] my-4" />
                  {memberItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => `
                          flex gap-3 items-center px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all
                          ${isActive ? 'bg-[var(--primary)] text-black shadow-lg' : 'bg-[var(--card-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'}
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                  {/* Show link to Guild OS admin portal for receptionist+ */}
                  {['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder'].includes(profile.role) && (
                    <a
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex gap-3 items-center px-4 py-3.5 rounded-2xl font-semibold text-sm bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30"
                    >
                      <ArrowLeftRight className="w-5 h-5" />
                      Guild OS
                    </a>
                  )}
                </>
              )}
            </>
          )}

          </nav>

          <button
            className="w-full py-4 rounded-2xl bg-[var(--error)]/10 text-[var(--error)] font-bold flex items-center justify-center gap-2"
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="main flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)]">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 mb-6 shrink-0">
          {/* Desktop: Just shows content area title */}
          <div className="hidden md:block">
            <h1 className="text-xl font-bold tracking-tight">GUILD Dashboard</h1>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
              Ready for Growth
            </div>
          </div>

          {/* Mobile: Hamburger, logo, notifications */}
          <div className="md:hidden flex items-center justify-between w-full">
            <button
              className="p-3 rounded-xl hover:bg-[var(--card-subtle)]"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-extrabold text-sm overflow-hidden">
                <img src="/guild-logo.png" alt="Guild" className="w-full h-full object-contain" />
              </div>
              <strong className="text-sm font-bold">GUILD</strong>
            </div>
            {profile ? (
              <NavLink to="/notifications" className="p-3 rounded-xl hover:bg-[var(--card-subtle)]">
                <Bell className="w-5 h-5" />
              </NavLink>
            ) : (
              <NavLink to="/auth" className="p-3 rounded-xl hover:bg-[var(--card-subtle)]">
                <User className="w-5 h-5" />
              </NavLink>
            )}
          </div>

          {/* Desktop: Right side controls */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-[var(--card-subtle)] text-[var(--text-secondary)] transition-colors"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {profile ? (
              <NavLink
                to="/profile"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card-subtle)] text-sm font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] text-xs font-bold">
                  {profile.fullName?.charAt(0)}
                </div>
                {profile.fullName?.split(' ')[0]}
              </NavLink>
            ) : (
              <NavLink
                to="/auth"
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-black text-sm font-bold"
              >
                Sign In
              </NavLink>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="animate-fade-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

// Role check types
type RequiredRole = 'applicant' | 'member' | 'receptionist' | 'cityGuildMaster' | 'stateGuildMaster' | 'centralGuildMaster' | 'guildFounder' | 'founder' | 'organizationRepresentative' | 'organization';

// Protected Route Guard
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">Validating session...</div>;
  }

  if (!firebaseUser) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Role-based Route Guard - ONLY checks actual role (One Account, One Active Role)
function RoleRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole: RequiredRole[] }) {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">Validating session...</div>;
  }

  if (!firebaseUser) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  // PHASE 1 FIX: Only use actual role - no preferredRole dual access
  const userRole = profile.role;
  const hasAccess = requiredRole.some(role => {
    // Handle organizationRepresentative as a converted role check
    if (role === 'organizationRepresentative') {
      // User must have converted TO organization representative role
      return userRole === 'organizationRepresentative';
    }
    // Otherwise check against actual guild role
    return userRole === role;
  });

  if (!hasAccess) {
    // Generate redirect URL based on whether onboarding is completed
    const redirectPath = !profile.onboardingCompleted ? '/onboarding' : '/';
    const roleDisplay = profile.role || 'Member';

    // Build context-specific guidance based on required role strings (case-insensitive)
    let guidance = 'Return to your dashboard to continue.';
    const requiredRoleStr = requiredRole.join(' ').toLowerCase();
    const currentRole = roleDisplay.toLowerCase();
    if (requiredRoleStr.includes('organizationrepresentative') && currentRole === 'member') {
      guidance = 'Organization Representative access requires account conversion. Visit /org-landing to start the conversion process.';
    } else if (requiredRoleStr.includes('receptionist') && currentRole === 'member') {
      guidance = 'Receptionist access requires verification. Contact your local branch for receptionist certification.';
    } else if (requiredRoleStr.includes('cityguildmaster') && currentRole === 'receptionist') {
      guidance = 'City Guild Master role required. Progress through the Guild ranks to qualify.';
    }

    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold text-[var(--text)]">Restricted Access</h2>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          This page requires: <span className="text-[var(--primary)] font-bold">{requiredRole.join(' or ')}</span>
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
          Your current access level: <span className="text-[var(--text)] font-semibold">{roleDisplay}</span>
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          {guidance}
        </p>
        <a href={redirectPath} className="inline-block mt-4 primary px-4 py-2 rounded-xl text-xs font-bold">
          Continue
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

// Dashboard Dynamic Route (renders dashboard if logged in, home page if guest)
function DynamicHomeRoute() {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">Validating session...</div>;
  }

  if (!firebaseUser) {
    return <Home />;
  }

  if (profile && !profile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Render the appropriate dashboard based on role
  if (profile?.role === 'organizationRepresentative' || profile?.role === 'organization') {
    return <OrgDashboard />;
  }
  return <GrowthDashboard />;
}

// Router configuration with optimized structure
const routerConfig = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <DynamicHomeRoute /> },
      { path: '/auth', element: <Auth /> },
      { path: '/onboarding', element: <PrivateRoute><MemberOnboarding /></PrivateRoute> },
      { path: '/quests', element: <QuestBoard /> },
      { path: '/quests/:id', element: <QuestDetails /> },
      { path: '/my-quests', element: <PrivateRoute><MyQuests /></PrivateRoute> },
      { path: '/my-quests/:questId', element: <PrivateRoute><MyQuestWorkspace /></PrivateRoute> },
      { path: '/quest-center', element: <PrivateRoute><UserQuestCenter /></PrivateRoute> },
      { path: '/quest-applications', element: <RoleRoute requiredRole={['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder']}><QuestApplications /></RoleRoute> },
      { path: '/organizations', element: <Organizations /> },
      { path: '/org/:id', element: <Organizations /> },
      { path: '/org-landing', element: <OrgLanding /> },
      { path: '/org-register', element: <PublicOrgRegistration /> },
      { path: '/org-onboarding', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><OrgOnboarding /></RoleRoute> },
      { path: '/org-dashboard', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><OrgDashboard /></RoleRoute> },
      { path: '/org-outcomes', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><OrgOutcomes /></RoleRoute> },
      { path: '/my-needs', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><OrgNeedsPage /></RoleRoute> },
            { path: '/org-messages', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><NotificationCenter /></RoleRoute> },
      { path: '/branches', element: <PrivateRoute><BranchesPage /></PrivateRoute> },
      { path: '/network', element: <Navigate to="/impact" replace /> },
      { path: '/docs', element: <PrivateRoute><KnowledgeHub /></PrivateRoute> },
      { path: '/impact', element: <Impact /> },
      { path: '/privacy', element: <PrivacyPolicy /> },
      { path: '/terms', element: <TermsOfService /> },
      { path: '/community', element: <CommunityGuidelines /> },
      { path: '/profile', element: <PrivateRoute><MemberProfile /></PrivateRoute> },
      { path: '/member/:id', element: <PrivateRoute><MemberProfile /></PrivateRoute> },
      { path: '/verification', element: <RoleRoute requiredRole={['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder']}><NeedReviewQueue /></RoleRoute> },
      { path: '/notifications', element: <PrivateRoute><NotificationCenter /></PrivateRoute> },
      { path: '/settings', element: <PrivateRoute><Settings /></PrivateRoute> },
      { path: '/needs/:id', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><NeedDetails /></RoleRoute> },
      { path: '/need-submit', element: <RoleRoute requiredRole={['organizationRepresentative', 'organization']}><NeedWizard /></RoleRoute> },
            { path: '/need-reviews', element: <RoleRoute requiredRole={['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder']}><NeedReviewQueue /></RoleRoute> },
      { path: '/org-management', element: <RoleRoute requiredRole={['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder', 'founder']}><SubmissionReviewQueue /></RoleRoute> },
      { path: '*', element: <NotFound /> }
    ]
  }
]);


export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={routerConfig} />
        </AuthProvider>
      </ThemeProvider>
    </Suspense>
  );
}
