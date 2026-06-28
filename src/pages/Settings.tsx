import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateLedgerRecord, calculateProfileScore } from '../lib/repository';
import { Settings as SettingsIcon, Check, ShieldCheck, Clock, User, Target, Star, Heart, Zap, Plus, X } from 'lucide-react';
import { PAGE_SEO } from '../components/SEO';

const PATHS = [
  { id: 'builder', title: 'Builder' },
  { id: 'creator', title: 'Creator' },
  { id: 'researcher', title: 'Researcher' },
  { id: 'entrepreneur', title: 'Entrepreneur' },
  { id: 'operator', title: 'Operator' },
  { id: 'leader', title: 'Leader' },
  { id: 'explorer', title: 'Explorer' }
];

const SKILL_OPTIONS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
  'UI/UX', 'Figma', 'Product', 'Marketing', 'Sales', 'Data Analysis',
  'AI/ML', 'DevOps', 'Cloud', 'Security', 'Legal', 'Finance'
];

export default function Settings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // SEO: Set page title
  useEffect(() => {
    document.title = PAGE_SEO.settings.title;
  }, []);

  // States
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [path, setPath] = useState(profile?.pathSelected || 'builder');
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [goals, setGoals] = useState<string[]>(profile?.goals || []);
  const [newGoal, setNewGoal] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'skills' | 'path'>('profile');

  if (!profile) return null;

  // Profile completion score
  const completionScore = calculateProfileScore(profile);

  const handleAddSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleAddInterest = (skill: string) => {
    if (skill && !interests.includes(skill)) {
      setInterests([...interests, skill]);
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setGoals(goals.filter(g => g !== goal));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    try {
      await updateLedgerRecord(
        'users',
        profile.uid,
        {
          fullName,
          bio,
          phone,
          pathSelected: path,
          skills,
          interests,
          goals,
          activityHistory: [...(profile.activityHistory || []), 'Updated Profile Settings']
        },
        profile,
        'Update Profile Settings'
      );
      setSuccess('Settings updated successfully.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-4 text-left max-w-3xl mx-auto animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Profile Settings</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Customize your profile parameters, select development paths, and review your activity log history.
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-400 font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Profile completion indicator */}
      <div className="panel bg-[var(--card-subtle)] flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-black font-black text-2xl">
            {completionScore}%
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">Profile Completeness</h3>
            <p className="text-[10px] text-[var(--text-muted)]">
              {completionScore < 50 ? 'Complete more fields to unlock opportunities' :
               completionScore < 80 ? 'Almost there! Add more detail to stand out' :
               'Your profile is ready for paid quests'}
            </p>
          </div>
        </div>
        {profile.verificationStatus === 'verified' ? (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} /> Verified
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            <Clock size={14} /> Pending Verification
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all ${activeTab === 'profile' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          <User size={14} className="inline mr-1.5" /> Profile
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all ${activeTab === 'skills' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          <Zap size={14} className="inline mr-1.5" /> Skills & Interests
        </button>
        <button
          onClick={() => setActiveTab('path')}
          className={`pb-3 px-4 font-bold text-xs border-b-2 transition-all ${activeTab === 'path' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)]'}`}
        >
          <Target size={14} className="inline mr-1.5" /> Growth Path
        </button>
      </div>

      <div className="grid md:grid-cols-[2fr_1.2fr] gap-6">

        {/* Settings Form Area */}
        <div className="panel space-y-4">
          <form onSubmit={handleSave} className="space-y-4">

            {/* TAB: Profile */}
            {activeTab === 'profile' && (
              <>
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <User size={16} className="text-[var(--primary)]" />
                  Personal Profile Parameters
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Bio Dossier</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary w-full py-2.5 rounded-xl font-bold text-xs"
            >
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
              </>
            )}

            {/* TAB: Skills & Interests */}
            {activeTab === 'skills' && (
              <>
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={16} className="text-[var(--primary)]" />
                  Skills & Interests Configuration
                </h3>

                {/* Skills */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Verified Skills</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {skills.map(s => (
                      <span key={s} className="px-2 py-1 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-bold rounded flex items-center gap-1">
                        {s}
                        <button type="button" onClick={() => handleRemoveSkill(s)} className="hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={e => { if (e.target.value) { handleAddSkill(e.target.value); e.target.value = ''; } }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] text-xs shadow-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all outline-none appearance-none"
                    value=""
                  >
                    <option value="">+ Add a skill...</option>
                    {SKILL_OPTIONS.filter(s => !skills.includes(s)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Interests */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Learning Interests</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {interests.map(i => (
                      <span key={i} className="px-2 py-1 bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[10px] font-bold rounded flex items-center gap-1">
                        {i}
                        <button type="button" onClick={() => handleRemoveInterest(i)} className="hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={e => { if (e.target.value) { handleAddInterest(e.target.value); e.target.value = ''; } }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] text-xs shadow-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all outline-none appearance-none"
                  >
                    <option value="">+ Add an interest...</option>
                    {SKILL_OPTIONS.filter(s => !interests.includes(s)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Goals */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Development Goals</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {goals.map(g => (
                      <span key={g} className="px-2 py-1 bg-[var(--card-subtle)] border border-[var(--border)] text-[10px] font-bold rounded flex items-center gap-1">
                        <Star size={10} className="text-[var(--primary)]" /> {g}
                        <button type="button" onClick={() => handleRemoveGoal(g)} className="hover:text-red-400">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGoal}
                      onChange={e => setNewGoal(e.target.value)}
                      placeholder="Add a development goal..."
                      className="text-xs flex-1"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddGoal())}
                    />
                    <button type="button" onClick={handleAddGoal} className="primary px-3 py-2 rounded-lg text-xs">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB: Growth Path */}
            {activeTab === 'path' && (
              <>
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Target size={16} className="text-[var(--primary)]" />
                  Development Path Selection
                </h3>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Select Your Primary Path</label>
                  <select
                    value={path}
                    onChange={e => setPath(e.target.value)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] text-xs shadow-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all outline-none appearance-none"
                  >
                    {PATHS.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg text-xs">
                  <strong className="block text-[var(--text)] mb-1">Path Guide:</strong>
                  <p className="text-[var(--text-muted)]">
                    Your development path determines which quest categories you're matched with and shapes your growth trajectory within the guild network.
                  </p>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Activity Logs history */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={16} className="text-[var(--primary)]" />
            Activity Log History
          </h3>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {profile.activityHistory && profile.activityHistory.length > 0 ? (
              profile.activityHistory.map((act, index) => (
                <div key={index} className="p-2.5 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg text-[10px] text-[var(--text-secondary)] leading-relaxed font-semibold">
                  {act}
                </div>
              ))
            ) : (
              <p className="text-[10px] text-[var(--text-muted)] text-center py-6">No activity logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
