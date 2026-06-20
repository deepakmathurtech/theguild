import { useState } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useNavigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { logout } from './lib/auth';
import { useTheme } from './context/ThemeContext';

// Icons
import {
  TrendingUp, Compass, Building, Bell, User, Settings as SettingsIcon, Shield, LogOut,
  Menu, X, Sun, Moon, Award, Network, FileText, Target, ChevronRight,
  ShieldCheck, Home as HomeIcon, BarChart3
} from 'lucide-react';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import MemberOnboarding from './features/onboarding/MemberOnboarding';
import OrgOnboarding from './features/onboarding/OrgOnboarding';
import OrgLanding from './pages/OrgLanding';
import OrgDashboard from './pages/OrgDashboard';
import OrgOutcomes from './pages/OrgOutcomes';
import QuestBoard from './pages/QuestBoard';
import QuestDetails from './pages/QuestDetails';
import MemberProfile from './pages/MemberProfile';
import BranchesPage from './pages/Branches';
import Organizations from './pages/Organizations';
import KnowledgeHub from './pages/KnowledgeHub';
import VerificationCenter from './pages/VerificationCenter';
import NotificationCenter from './pages/NotificationCenter';
import Settings from './pages/Settings';
import Impact from './pages/Impact';
import NeedDetails from './pages/NeedDetails';
import NeedWizard from './pages/NeedWizard';
import SubmissionReviewQueue from './pages/SubmissionReviewQueue';
import GrowthDashboard from './pages/GrowthDashboard';

import './styles.css';

// Navigation items
const navItems = [
  { to: '/', label: 'Growth', icon: TrendingUp, end: true },
  { to: '/quests', label: 'Quests', icon: Compass },
  { to: '/organizations', label: 'Orgs', icon: Building },
  { to: '/branches', label: 'Network', icon: Network },
  { to: '/docs', label: 'Knowledge', icon: FileText },
  { to: '/impact', label: 'Impact', icon: Target },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

const memberItems = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/notifications', label: 'Alerts', icon: Bell },
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

        <nav className="flex-1 space-y-6 overflow-y-auto">
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

          {profile && (
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
                <p className="text-[10px] text-[var(--text-muted)]">Rank {profile.guildRank}</p>
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

          <nav className="flex-1 space-y-4 overflow-y-auto pb-6">
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

            {profile && (
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
        <div className="flex-1 overflow-y-auto">
          <div className="animate-fade-up">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

// Role check types
type RequiredRole = 'applicant' | 'member' | 'receptionist' | 'cityGuildMaster' | 'stateGuildMaster' | 'centralGuildMaster' | 'guildFounder' | 'organizationRepresentative';

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

// Role-based Route Guard
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

  const userRole = profile.preferredRole || profile.role;
  const hasAccess = requiredRole.some(role => {
    if (role === 'organizationRepresentative') return userRole === 'Organization Representative';
    return userRole === role || profile.role === role;
  });

  if (!hasAccess) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold text-red-500">Access Denied</h2>
        <p className="text-xs text-[var(--text-muted)] mt-2">You don't have permission to view this page.</p>
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

  return <Outlet />;
}

// Router configuration defined below - kept as reference for routing structure
const routerConfig = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        path: '/',
        element: <DynamicHomeRoute />,
        children: [
          { index: true, element: <OrgDashboardOrGrowthDashboard /> }
        ]
      },
      { path: '/auth', element: <Auth /> },
      { path: '/onboarding', element: <PrivateRoute><MemberOnboarding /></PrivateRoute> },
      // Public quests (visible to all logged in users)
      { path: '/quests', element: <PrivateRoute><QuestBoard /></PrivateRoute> },
      { path: '/quests/:id', element: <PrivateRoute><QuestDetails /></PrivateRoute> },
      // Organizations (visible to all logged in users)
      { path: '/organizations', element: <PrivateRoute><Organizations /></PrivateRoute> },
      { path: '/org-landing', element: <OrgLanding /> },
      // Organization Representative only
      { path: '/org-onboarding', element: <RoleRoute requiredRole={['organizationRepresentative']}><OrgOnboarding /></RoleRoute> },
      { path: '/org-dashboard', element: <RoleRoute requiredRole={['organizationRepresentative']}><OrgDashboard /></RoleRoute> },
      { path: '/org-outcomes', element: <RoleRoute requiredRole={['organizationRepresentative']}><OrgOutcomes /></RoleRoute> },
      // Network/Branches visible to all
      { path: '/branches', element: <PrivateRoute><BranchesPage /></PrivateRoute> },
      // Legacy route for backward compatibility
      { path: '/network', element: <Navigate to="/branches" replace /> },
      // Knowledge Hub
      { path: '/docs', element: <PrivateRoute><KnowledgeHub /></PrivateRoute> },
      // Impact (visible to all)
      { path: '/impact', element: <Impact /> },
      // Profile (private, all members)
      { path: '/profile', element: <PrivateRoute><MemberProfile /></PrivateRoute> },
      // Verification Center - Receptionist+ only
      { path: '/verification', element: <RoleRoute requiredRole={['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder']}><VerificationCenter /></RoleRoute> },
      // Notifications
      { path: '/notifications', element: <PrivateRoute><NotificationCenter /></PrivateRoute> },
      // Settings
      { path: '/settings', element: <PrivateRoute><Settings /></PrivateRoute> },
      // Needs - Organization Representative only
      { path: '/needs/:id', element: <RoleRoute requiredRole={['organizationRepresentative']}><NeedDetails /></RoleRoute> },
      { path: '/need-submit', element: <RoleRoute requiredRole={['organizationRepresentative']}><NeedWizard organizationId="" organizationName="" /></RoleRoute> },
      // Submission Reviews - Receptionist+ only
      { path: '/submission-reviews', element: <RoleRoute requiredRole={['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'guildFounder']}><SubmissionReviewQueue /></RoleRoute> }
    ]
  }
]);

function OrgDashboardOrGrowthDashboard() {
  const { profile } = useAuth();
  if (profile?.preferredRole === 'Organization Representative') {
    return <OrgDashboard />;
  }
  // Default is Member Growth Dashboard
  return <GrowthDashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={routerConfig} />
      </AuthProvider>
    </ThemeProvider>
  );
}
