import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import GuildLoading from '../components/v2/GuildLoading';
import { updateLedgerRecord, calculateProfileScore, fetchUserOrganization } from '../lib/repository';
import { db } from '../lib/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import SEO, { PAGE_SEO } from '../components/SEO';
import {
  Settings as SettingsIcon, Check, ShieldCheck, Clock, User, Target,
  Star, Zap, Plus, X, Building2, Globe, Phone, Mail, MapPin, FileText,
  ArrowRight
} from 'lucide-react';
import type { Organization } from '../types/guild';
import { Link } from 'react-router-dom';

const PATHS = [
  { id: 'builder', title: 'Builder', desc: 'Build products, tools, and systems' },
  { id: 'creator', title: 'Creator', desc: 'Create content, design, and media' },
  { id: 'researcher', title: 'Researcher', desc: 'Research, analyse, and document' },
  { id: 'entrepreneur', title: 'Entrepreneur', desc: 'Launch ventures and lead initiatives' },
  { id: 'operator', title: 'Operator', desc: 'Run processes and manage operations' },
  { id: 'leader', title: 'Leader', desc: 'Lead teams and coordinate outcomes' },
  { id: 'explorer', title: 'Explorer', desc: 'Explore domains and discover opportunities' }
];

const SKILL_OPTIONS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
  'UI/UX', 'Figma', 'Product', 'Marketing', 'Sales', 'Data Analysis',
  'AI/ML', 'DevOps', 'Cloud', 'Security', 'Legal', 'Finance'
];

const ORG_CATEGORIES = ['Business', 'NGO', 'College', 'School', 'Community', 'Government Related', 'Individual Initiative'];
const ORG_VISIBILITY = ['public', 'guildMembers', 'private', 'draft'];

export default function Settings() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  // Member states
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [path, setPath] = useState(profile?.pathSelected || 'builder');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [goals, setGoals] = useState<string[]>(profile?.goals || []);
  const [newGoal, setNewGoal] = useState('');

  const isOrgRep = profile?.role === 'organizationRepresentative' || profile?.role === 'organization';

  // Org settings states
  const [org, setOrg] = useState<Organization | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: '', description: '', website: '', phone: '', email: '',
    address: '', category: 'Business', industry: '',
    visibility: 'public' as string
  });
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState('');
  const [orgError, setOrgError] = useState('');

  // Tab — org reps default to 'org', members to 'profile'
  const [activeTab, setActiveTab] = useState<'profile' | 'skills' | 'path' | 'org'>(
    isOrgRep ? 'org' : 'profile'
  );

  // Load org for org reps
  useEffect(() => {
    if (!isOrgRep || !profile) return;
    setLoadingOrg(true);
    fetchUserOrganization(profile).then(orgData => {
      if (orgData) {
        setOrg(orgData);
        setOrgForm({
          name: orgData.name || '',
          description: orgData.description || '',
          website: orgData.website || '',
          phone: orgData.phone || '',
          email: orgData.email || '',
          address: orgData.address || '',
          category: orgData.category || 'Business',
          industry: orgData.industry || '',
          visibility: orgData.visibility || 'public'
        });
      }
    }).finally(() => setLoadingOrg(false));
  }, [isOrgRep, profile]);

  if (loading) return <GuildLoading label="Loading settings..." />;
  if (!profile) return null;

  const completionScore = calculateProfileScore(profile);

  const handleAddSkill = (skill: string) => { if (skill && !skills.includes(skill)) setSkills([...skills, skill]); };
  const handleRemoveSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));
  const handleAddInterest = (skill: string) => { if (skill && !interests.includes(skill)) setInterests([...interests, skill]); };
  const handleRemoveInterest = (interest: string) => setInterests(interests.filter(i => i !== interest));
  const handleAddGoal = () => { if (newGoal.trim()) { setGoals([...goals, newGoal.trim()]); setNewGoal(''); } };
  const handleRemoveGoal = (goal: string) => setGoals(goals.filter(g => g !== goal));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      await updateLedgerRecord('users', profile.uid, {
        fullName, bio, phone, pathSelected: path, skills, interests, goals,
        activityHistory: [...(profile.activityHistory || []), 'Updated Profile Settings']
      }, profile, 'Update Profile Settings');
      setSuccess('Settings saved successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setOrgSaving(true);
    setOrgError('');
    setOrgSuccess('');
    try {
      await updateDoc(doc(db, 'organizations', org.id), {
        ...orgForm,
        updatedAt: new Date().toISOString()
      });
      setOrg({ ...org, ...orgForm, updatedAt: new Date().toISOString() } as Organization);
      setOrgSuccess('Organization settings saved.');
    } catch (err: any) {
      setOrgError(err.message || 'Failed to save');
    } finally {
      setOrgSaving(false);
    }
  };

  return (
    <><SEO {...PAGE_SEO.settings} />
    <div className="space-y-8 py-4 text-left max-w-4xl mx-auto animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Account Settings</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {isOrgRep
              ? 'Manage your organization profile, contact details, and account preferences.'
              : 'Update your profile, skills, growth path, and account preferences.'}
          </p>
        </div>
        {isOrgRep && (
          <Link to="/org-dashboard" className="ghost px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5">
            Organization Dashboard <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {/* Status Bar */}
      <div className="panel bg-[var(--card-subtle)] flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-4">
          {isOrgRep ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                <Building2 size={22} className="text-black" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">{org?.name || 'Your Organization'}</h3>
                <p className="text-[10px] text-[var(--text-muted)]">{org?.category} · {org?.trustLevel ? `${org.trustLevel.charAt(0).toUpperCase() + org.trustLevel.slice(1)} Partner` : 'New Partner'}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-black text-xl">
                {completionScore}%
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Profile Completeness</h3>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {completionScore < 50 ? 'Complete more fields to unlock opportunities' :
                   completionScore < 80 ? 'Almost there — add more detail to stand out' :
                   'Your profile is ready for paid quests'}
                </p>
              </div>
            </>
          )}
        </div>
        {profile.verificationStatus === 'verified' ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full flex-shrink-0">
            <ShieldCheck size={14} /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full flex-shrink-0">
            <Clock size={14} /> Pending Verification
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border)] gap-1 overflow-x-auto">
        {isOrgRep && (
          <button onClick={() => setActiveTab('org')}
            className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${activeTab === 'org' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
            <Building2 size={14} className="inline mr-1.5" />Organization
          </button>
        )}
        <button onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${activeTab === 'profile' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
          <User size={14} className="inline mr-1.5" />Personal Info
        </button>
        {!isOrgRep && (
          <>
            <button onClick={() => setActiveTab('skills')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${activeTab === 'skills' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
              <Zap size={14} className="inline mr-1.5" />Skills & Interests
            </button>
            <button onClick={() => setActiveTab('path')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${activeTab === 'path' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}>
              <Target size={14} className="inline mr-1.5" />Growth Path
            </button>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-[2fr_1.2fr] gap-6">
        <div className="panel space-y-5">

          {/* ─── ORG TAB ─── */}
          {activeTab === 'org' && (
            <>
              {loadingOrg ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">Loading organization data...</p>
              ) : !org ? (
                <div className="py-6 text-center space-y-3">
                  <Building2 size={32} className="mx-auto text-[var(--text-muted)] opacity-40" />
                  <p className="text-xs text-[var(--text-muted)]">No organization linked to this account.</p>
                  <Link to="/org-register" className="primary px-4 py-2 rounded-xl text-xs font-bold inline-flex">
                    Register Organization
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleOrgSave} className="space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={16} className="text-[var(--primary)]" />
                    Organization Profile
                  </h3>

                  {orgSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
                      <Check size={14} /> {orgSuccess}
                    </div>
                  )}
                  {orgError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-bold">
                      {orgError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Organization Name</label>
                    <input type="text" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })} className="text-sm" required />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Description</label>
                    <textarea rows={3} value={orgForm.description} onChange={e => setOrgForm({ ...orgForm, description: e.target.value })}
                      className="text-sm" placeholder="Describe your organization's mission and focus area..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        <Globe size={10} className="inline mr-1" />Website
                      </label>
                      <input type="text" value={orgForm.website} onChange={e => setOrgForm({ ...orgForm, website: e.target.value })}
                        className="text-sm" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        Industry / Sector
                      </label>
                      <input type="text" value={orgForm.industry} onChange={e => setOrgForm({ ...orgForm, industry: e.target.value })}
                        className="text-sm" placeholder="Healthcare, Education, Tech..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        <Phone size={10} className="inline mr-1" />Phone
                      </label>
                      <input type="text" value={orgForm.phone} onChange={e => setOrgForm({ ...orgForm, phone: e.target.value })} className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                        <Mail size={10} className="inline mr-1" />Email
                      </label>
                      <input type="email" value={orgForm.email} onChange={e => setOrgForm({ ...orgForm, email: e.target.value })} className="text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      <MapPin size={10} className="inline mr-1" />Address
                    </label>
                    <input type="text" value={orgForm.address} onChange={e => setOrgForm({ ...orgForm, address: e.target.value })} className="text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Category</label>
                      <select value={orgForm.category} onChange={e => setOrgForm({ ...orgForm, category: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]">
                        {ORG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Visibility</label>
                      <select value={orgForm.visibility} onChange={e => setOrgForm({ ...orgForm, visibility: e.target.value })}
                        className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]">
                        {ORG_VISIBILITY.map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <button type="submit" disabled={orgSaving} className="primary w-full py-2.5 rounded-xl font-bold text-xs">
                    {orgSaving ? 'Saving...' : 'Save Organization Settings'}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ─── PROFILE TAB ─── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                <User size={16} className="text-[var(--primary)]" />
                Personal Information
              </h3>

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
                  <Check size={14} /> {success}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="text-sm" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} className="text-sm"
                  placeholder="Tell Guild who you are, what you do, and what you're building..." />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  <Phone size={10} className="inline mr-1" />Phone
                </label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="text-sm" />
              </div>

              <button type="submit" disabled={saving} className="primary w-full py-2.5 rounded-xl font-bold text-xs">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* ─── SKILLS TAB ─── */}
          {activeTab === 'skills' && (
            <form onSubmit={handleSave} className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={16} className="text-[var(--primary)]" />
                Skills & Interests
              </h3>

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
                  <Check size={14} /> {success}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Your Skills</label>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <span key={s} className="px-2 py-1 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-bold rounded flex items-center gap-1">
                      {s}
                      <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-red-400"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <select onChange={e => { if (e.target.value) { handleAddSkill(e.target.value); (e.target as HTMLSelectElement).value = ''; } }}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]" defaultValue="">
                  <option value="">+ Add a skill...</option>
                  {SKILL_OPTIONS.filter(s => !skills.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Interests</label>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map(i => (
                    <span key={i} className="px-2 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold rounded flex items-center gap-1">
                      {i}
                      <button type="button" onClick={() => handleRemoveInterest(i)} className="hover:text-red-400"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <select onChange={e => { if (e.target.value) { handleAddInterest(e.target.value); (e.target as HTMLSelectElement).value = ''; } }}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--text)] text-xs outline-none focus:border-[var(--primary)]" defaultValue="">
                  <option value="">+ Add an interest...</option>
                  {SKILL_OPTIONS.filter(s => !interests.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Development Goals</label>
                <div className="flex flex-wrap gap-1.5">
                  {goals.map(g => (
                    <span key={g} className="px-2 py-1 bg-[var(--card-subtle)] border border-[var(--border)] text-[10px] font-bold rounded flex items-center gap-1">
                      <Star size={10} className="text-[var(--primary)]" /> {g}
                      <button type="button" onClick={() => handleRemoveGoal(g)} className="hover:text-red-400"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)}
                    placeholder="Add a goal..." className="text-xs flex-1"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddGoal())} />
                  <button type="button" onClick={handleAddGoal} className="primary px-3 py-2 rounded-lg text-xs"><Plus size={14} /></button>
                </div>
              </div>

              <button type="submit" disabled={saving} className="primary w-full py-2.5 rounded-xl font-bold text-xs">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {/* ─── PATH TAB ─── */}
          {activeTab === 'path' && (
            <form onSubmit={handleSave} className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Target size={16} className="text-[var(--primary)]" />
                Growth Path
              </h3>

              {success && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
                  <Check size={14} /> {success}
                </div>
              )}

              <div className="grid gap-2">
                {PATHS.map(p => (
                  <button key={p.id} type="button" onClick={() => setPath(p.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${path === p.id ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)] bg-[var(--card-subtle)] hover:border-[var(--primary)]/40'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text)]">{p.title}</span>
                      {path === p.id && <Check size={14} className="text-[var(--primary)]" />}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>

              <button type="submit" disabled={saving} className="primary w-full py-2.5 rounded-xl font-bold text-xs">
                {saving ? 'Saving...' : 'Save Growth Path'}
              </button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Activity Log */}
          <div className="panel space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={16} className="text-[var(--primary)]" />
              Activity Log
            </h3>
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {profile.activityHistory && profile.activityHistory.length > 0 ? (
                [...profile.activityHistory].reverse().map((act, index) => (
                  <div key={index} className="p-2.5 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text-secondary)] leading-relaxed font-semibold">
                    {act}
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-[var(--text-muted)] text-center py-4">No activity logged yet.</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="panel space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Quick Links</h3>
            <div className="space-y-1.5">
              {isOrgRep ? (
                <>
                  <Link to="/org-dashboard" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    Organization Dashboard <ArrowRight size={12} />
                  </Link>
                  <Link to="/need-submit" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    Submit a Need <ArrowRight size={12} />
                  </Link>
                  <Link to="/org-outcomes" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    View Outcomes <ArrowRight size={12} />
                  </Link>
                  <Link to="/verification" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors">
                    Get Verified <ShieldCheck size={12} />
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/profile" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    View Profile <ArrowRight size={12} />
                  </Link>
                  <Link to="/guild-card" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    Guild Passport <ArrowRight size={12} />
                  </Link>
                  <Link to="/quests" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    Browse Quests <ArrowRight size={12} />
                  </Link>
                  <Link to="/public-profile-settings" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
                    Public Profile <ArrowRight size={12} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div></>
  );
}
