import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { createLedgerRecord } from '../../lib/repository';
import type { Organization, GuildUser, Jurisdiction } from '../../types/guild';
import { Building, ChevronRight, Check, Mail, Phone, User, MapPin, FileText, AlertTriangle, Loader, ArrowRight, Lock, Users, ShieldCheck, Zap, ArrowDown, HelpCircle, Info } from 'lucide-react';

// Organization types
const ORG_TYPES = [
  { id: 'NGO', title: 'NGO / Non-Profit', desc: 'Volunteers, charity campaigns, awareness events, local aid', services: ['Volunteer Coordination', 'Public Awareness Campaigns', 'Community Projects', 'Grant Reporting'] },
  { id: 'Startup', title: 'Startup / Innovation', desc: 'High growth tech projects, web builders, design cohorts', services: ['Software Engineers', 'Product Designers', 'Market Research', 'Social Media Outreach'] },
  { id: 'Business', title: 'SME / Enterprise', desc: 'Established trade companies, project execution assistance', services: ['Operational Auditing', 'Document Digitization', 'Technical Writing', 'Data Entry Cohorts'] },
  { id: 'College', title: 'College / University', desc: 'Student growth initiatives, practical training setups', services: ['Student Internships', 'Campus Events', 'Joint Research Projects', 'Industry Partnerships'] },
  { id: 'School', title: 'School / Academy', desc: 'Primary/secondary learning groups, extra-curriculars', services: ['Tutor Recruiting', 'Digital Skill Workshops', 'Mentorship Programs'] },
  { id: 'Community', title: 'Community Initiative', desc: 'Informal citizen cohorts, clean-ups, local improvements', services: ['Volunteer Sourcing', 'Event Management', 'Public Relations'] },
  { id: 'Government Related', title: 'Government Affiliate', desc: 'Municipal boards, civic administration, regional systems', services: ['Policy Auditing', 'Administrative Assistants', 'Public Health Outreach'] },
  { id: 'Individual Initiative', title: 'Individual Project', desc: 'Sole builders, creators running independent quests', services: ['Peer-to-Peer Collaborators', 'Beta Testers', 'Distribution Networks'] }
];

// Hard-coded receptionist roster (same as in OrgOnboarding)
const RECEPTIONISTS = [
  { uid: 'rec_amit', fullName: 'Amit Sharma', role: 'Relationship Manager', email: 'amit.sharma@theguild.org', phone: '+91 98765-43210', photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces' },
  { uid: 'recPriya', fullName: 'Priya Singh', role: 'Relationship Manager', email: 'priya.singh@theguild.org', phone: '+91 98765-43211', photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces' },
  { uid: 'recRaj', fullName: 'Raj Kumar', role: 'Relationship Manager', email: 'raj.kumar@theguild.org', phone: '+91 98765-43212', photoURL: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces' },
  { uid: 'recAnita', fullName: 'Anita Verma', role: 'Relationship Manager', email: 'anita.verma@theguild.org', phone: '+91 98765-43213', photoURL: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces' }
];

// Branch jurisdictions map
const BRANCHES: Record<string, { jurisdiction: Jurisdiction; name: string }> = {
  'ludhiana': { jurisdiction: { cityId: 'ludhiana', cityName: 'Ludhiana', stateId: 'punjab', stateName: 'Punjab', countryId: 'india', countryName: 'India' }, name: 'The Guild - Ludhiana' },
  'chandigarh': { jurisdiction: { cityId: 'chandigarh', cityName: 'Chandigarh', stateId: 'punjab', stateName: 'Punjab', countryId: 'india', countryName: 'India' }, name: 'The Guild - Chandigarh' },
  'delhi': { jurisdiction: { cityId: 'delhi', cityName: 'Delhi', stateId: 'delhi', stateName: 'Delhi', countryId: 'india', countryName: 'India' }, name: 'The Guild - Delhi NCR' }
};

const DEFAULT_BRANCH = BRANCHES['ludhiana'];

export default function PublicOrgRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Account form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Organization form
  const [orgType, setOrgType] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ludhiana');

  // Get matched receptionist
  const matchedReceptionist = RECEPTIONISTS[Math.floor(Math.random() * RECEPTIONISTS.length)];

  // Get branch info
  const branchInfo = BRANCHES[selectedBranch] || DEFAULT_BRANCH;
  const selectedTypeObj = ORG_TYPES.find(o => o.id === orgType);

  function validateStep1() {
    if (!fullName || fullName.length < 2) return 'Please enter your full name';
    if (!email || !email.includes('@')) return 'Please enter a valid email';
    if (!password || password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return '';
  }

  function validateStep2() {
    if (!orgType) return 'Please select an organization type';
    if (!orgName || orgName.length < 2) return 'Please enter organization name';
    if (!orgDescription || orgDescription.length < 20) return 'Please enter a description (at least 20 characters)';
    return '';
  }

  async function handleNext() {
    const validationError = step === 1 ? validateStep1() : validateStep2();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    if (step < 3) setStep(step + 1);
  }

  function handlePrev() {
    if (step > 1) setStep(step - 1);
    setError('');
  }

  async function validateEmail() {
    // Check if email exists in Firebase Auth
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length > 0) {
      return { field: 'email', message: 'This email is already registered. Please use a different email or try logging in.' };
    }
    // Check if email exists in Firestore users collection
    const userQuery = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const userSnap = await getDocs(userQuery);
    if (!userSnap.empty) {
      return { field: 'email', message: 'This email is already linked to a Guild member account.' };
    }
    // Check if email exists in organizations collection
    const orgQuery = query(collection(db, 'organizations'), where('ownerEmail', '==', email.toLowerCase()));
    const orgSnap = await getDocs(orgQuery);
    if (!orgSnap.empty) {
      return { field: 'email', message: 'This email is already registered as an organization email. Please use a different email.' };
    }
    return null;
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');

    try {
      // Validate email before registration
      const emailError = await validateEmail();
      if (emailError) {
        setError(emailError.message);
        setLoading(false);
        return;
      }

      // Step 1: Create Firebase Auth account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Step 2: Create user profile with organizationRepresentative role
      const userProfile: GuildUser = {
        uid: user.uid,
        email: user.email || email,
        fullName,
        photoURL: '',
        role: 'organizationRepresentative', // Single role for org representative
        status: 'active',
        city: branchInfo.jurisdiction.cityName,
        contactInformation: phone,
        skills: [],
        interests: [],
        bio: orgDescription,
        verificationStatus: 'pending',
        guildRank: 'F',
        reputationScore: 0,
        experiencePoints: 0,
        knowledgeEntriesCount: 0,
        completedQuests: 0,
        verifiedOutcomes: 0,
        revenueEarned: 0,
        activityHistory: ['Public Organization Registration'],
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archiveStatus: 'active',
        jurisdiction: branchInfo.jurisdiction,
        onboardingStep: 7,
        onboardingCompleted: true,
        proofs: [],
        certificates: [],
        achievements: []
      };

      await setDoc(doc(db, 'users', user.uid), { ...userProfile, createdAtServer: serverTimestamp() });

      // Step 3: Create organization
      const orgData: Omit<Organization, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'archiveStatus' | 'jurisdiction'> = {
        name: orgName,
        searchName: orgName.toLowerCase(),
        category: orgType as Organization['category'],
        contactPerson: fullName,
        email,
        phone,
        city: branchInfo.jurisdiction.cityName,
        description: orgDescription,
        needs: selectedTypeObj?.services || [],
        opportunities: [],
        currentStatus: 'new',
        ownerId: user.uid,
        ownerEmail: email,
        trustLevel: 'new',
        relationshipNotes: `Assigned automatically during public registration. Matched with Relationship Manager: ${matchedReceptionist.fullName}`,
        assignedReceptionistId: matchedReceptionist.uid,
        branchId: selectedBranch,
        branchName: branchInfo.name
      };

      await createLedgerRecord('organizations', orgData as any, userProfile, `Organization Created via Public Registration by ${fullName}`);

      // Sign in after registration
      await signInWithEmailAndPassword(auth, email, password);

      // Navigate to org dashboard
      navigate('/org-dashboard');
    } catch (e: any) {
      console.error('Registration error:', e);
      // Handle specific Firebase auth errors
      if (e.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else if (e.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (e.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(e.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-left">
      {/* Intro for non-logged-in users */}
      {step === 1 && (
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 border border-[var(--primary)]/20">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-[var(--primary)]" />
            Partner With The Guild
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Register your organization to access verified member cohorts, manage talent pipelines, and coordinate workforce deployments through dedicated relationship managers.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <Users className="w-5 h-5 text-[var(--primary)] mb-1" />
              <span className="text-xs font-bold block">Verified Talent</span>
              <span className="text-[10px] text-[var(--text-muted)]">Access vetted professionals & students</span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />
              <span className="text-xs font-bold block">Receptionist Led</span>
              <span className="text-[10px] text-[var(--text-muted)]">Dedicated relationship manager</span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <FileText className="w-5 h-5 text-blue-500 mb-1" />
              <span className="text-xs font-bold block">Coordination Logs</span>
              <span className="text-[10px] text-[var(--text-muted)]">Track deliverables & outcomes</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--card)]/50 p-2 rounded-lg">
            <HelpCircle className="w-4 h-4 flex-shrink-0" />
            <span>New to Guild? <a href="/docs" className="text-[var(--primary)] font-medium underline">Learn how it works</a> or start registration below.</span>
          </div>
        </div>
      )}

      <div className="wizard-shell bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-lg">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Register Your Organization</h2>
            <p className="text-xs text-[var(--text-muted)]">Create account and organization in one flow</p>
          </div>
          <span className="text-xs font-black uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
            Step {step} of 3
          </span>
        </div>

        {/* Step 1: Account Credentials */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <Info className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--text)]">One account, one role:</strong> This account represents you as the organization contact. You'll have a <span className="text-[var(--primary)] font-medium">single role</span> as organization representative, separate from member accounts.
              </div>
            </div>

            <h3 className="text-lg font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-[var(--primary)]" /> Create Your Account
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              This account will represent your organization. You'll have a single role as organization representative.
            </p>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@yourorg.com"
                  className="text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Organization Details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--text)]">Your branch determines:</strong> The Guild location nearest you. Your organization's city branch connects you to local talent pools and assigns a <span className="text-emerald-500 font-medium">dedicated relationship manager</span> who will coordinate your workforce needs.
              </div>
            </div>

            <h3 className="text-lg font-bold flex items-center gap-2">
              <Building className="w-5 h-5 text-[var(--primary)]" /> Organization Details
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Tell us about your organization so we can match you with the right resources.
            </p>

            {/* Branch Selection */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 required">Guild Branch Location</label>
              <div className="grid sm:grid-cols-3 gap-3">
                {Object.entries(BRANCHES).map(([key, branch]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedBranch(key)}
                    className={`p-3 rounded-lg border text-center transition-all ${selectedBranch === key ? 'border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)]'}`}
                  >
                    <span className={`text-xs font-bold block ${selectedBranch === key ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {branch.jurisdiction.cityName}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{branch.jurisdiction.stateName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Org Type */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 required">Organization Type</label>
              <div className="grid sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1">
                {ORG_TYPES.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOrgType(o.id)}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${orgType === o.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)]'}`}
                  >
                    <span className="font-bold block">{o.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Org Name */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Organization Name</label>
              <input
                type="text"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Ludhiana Tech Builders"
                className="text-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 99999-99999"
                className="text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Description</label>
              <textarea
                value={orgDescription}
                onChange={e => setOrgDescription(e.target.value)}
                placeholder="Describe your organization's mission and how Guild members can contribute..."
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[var(--text-secondary)]">
                <strong className="text-[var(--text)]">Almost done!</strong> Review your details and confirm. Once registered, your assigned relationship manager will reach out within 24 hours to kickstart coordination.
              </div>
            </div>

            <h3 className="text-lg font-bold flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" /> Review & Confirm
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Your organization will be linked to a Guild Relationship Manager who will assist you.
            </p>

            {/* Account Summary */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-2">Account</span>
              <div className="text-sm">
                <strong>{fullName}</strong>
                <span className="text-[var(--text-muted)]"> ({email})</span>
              </div>
            </div>

            {/* Organization Summary */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold block mb-2">Organization</span>
              <div className="space-y-1 text-sm">
                <div><span className="text-[var(--text-muted)]">Name:</span> <strong>{orgName}</strong></div>
                <div><span className="text-[var(--text-muted)]">Type:</span> {selectedTypeObj?.title}</div>
                <div><span className="text-[var(--text-muted)]">Branch:</span> {branchInfo.name}</div>
              </div>
            </div>

            {/* Receptionist Assignment */}
            <div className="p-4 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 flex gap-4 items-center">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-[var(--primary)]/30 bg-black flex-shrink-0">
                <img src={matchedReceptionist.photoURL} alt={matchedReceptionist.fullName} className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--primary)] tracking-widest block mb-0.5">Assigned Relationship Manager</span>
                <strong className="text-sm font-bold text-[var(--text)] block">{matchedReceptionist.fullName}</strong>
                <span className="text-xs text-[var(--text-muted)]">{matchedReceptionist.role}</span>
              </div>
            </div>

            {/* Services Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Available Services:</span>
              <div className="flex flex-wrap gap-2">
                {selectedTypeObj?.services.map(s => (
                  <span key={s} className="text-[10px] bg-[var(--card-subtle)] border border-[var(--border)] px-2 py-1 rounded text-[var(--text-secondary)]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/5 flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 text-[var(--error)] flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[var(--error)]">{error}</span>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center border-t border-[var(--border)] pt-4 mt-6">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="ghost px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1"
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  Confirm & Register <Check className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}