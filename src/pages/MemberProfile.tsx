import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateLedgerRecord, RECEPTIONISTS } from '../lib/repository';
import {
  Award, ShieldCheck, Mail, Calendar, Phone, Plus, ExternalLink,
  BookOpen, Star, Compass, UserCheck, Briefcase, FileText, CheckCircle
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { PAGE_SEO } from '../components/SEO';

export default function MemberProfile() {
  const { profile } = useAuth();

  // SEO: Set page title
  useEffect(() => {
    document.title = PAGE_SEO.memberProfile.title;
  }, []);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'quests' | 'achievements'>('portfolio');
  
  // Proof creation inputs
  const [addingProof, setAddingProof] = useState(false);
  const [proofTitle, setProofTitle] = useState('');
  const [proofDesc, setProofDesc] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [proofSkills, setProofSkills] = useState('');

  if (!profile) return null;

  const handleAddProofOfWork = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArray = proofSkills.split(',').map(s => s.trim()).filter(Boolean);
      const newProof = {
        id: `pow-${Date.now()}`,
        title: proofTitle,
        description: proofDesc,
        link: proofLink,
        skillsVerified: skillsArray,
        createdAt: new Date().toISOString(),
        status: 'pending' as const
      };

      const updatedProofs = [...(profile.proofs || []), newProof];

      await updateLedgerRecord(
        'users',
        profile.uid,
        {
          proofs: updatedProofs,
          activityHistory: [...(profile.activityHistory || []), `Submitted Proof of Work: ${proofTitle}`]
        },
        profile,
        'Add Proof of Work'
      );

      setProofTitle('');
      setProofDesc('');
      setProofLink('');
      setProofSkills('');
      setAddingProof(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Profile Header */}
      <div className="panel bg-[var(--card)] relative overflow-hidden flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        
        {/* Profile Pic */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-black font-extrabold text-3xl flex items-center justify-center border border-[var(--border-light)] shadow-lg overflow-hidden flex-shrink-0">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.fullName} className="w-full h-full object-cover" />
          ) : (
            profile.fullName.charAt(0)
          )}
        </div>

        {/* User Info Details */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap gap-2.5 items-center">
            <h1 className="text-2xl font-black tracking-tight leading-none">{profile.fullName}</h1>
            {profile.verificationStatus === 'verified' ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck size={12} className="fill-emerald-500/10" />
                Verified Member
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Pending Verification
              </span>
            )}
            <span className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest bg-[var(--primary)]/10 px-2 py-0.5 rounded-full border border-[var(--primary)]/20">
              Rank {profile.guildRank}
            </span>
          </div>

          <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed font-normal">
            {profile.bio || 'This member has not written a public bio dossier yet.'}
          </p>

          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1.5"><Mail size={13} className="text-[var(--primary)]" /> {profile.email}</span>
            {profile.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-[var(--primary)]" /> {profile.phone}</span>}
            <span className="flex items-center gap-1.5"><Calendar size={13} className="text-[var(--primary)]" /> Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Skills, Goals, Interests Dossier */}
      <div className="grid md:grid-cols-[1fr_2fr] gap-6">
        
        {/* Dossier Sidebar */}
        <div className="space-y-6">
          <div className="panel space-y-4">
            <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-wider">Capabilities Dossier</h3>
            
            {/* Skills */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Verified Skills</span>
              <div className="flex flex-wrap gap-1">
                {profile.skills && profile.skills.length > 0 ? (
                  profile.skills.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-[var(--card-subtle)] border border-[var(--border)] text-[10px] font-bold rounded">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No verified skills entered.</span>
                )}
              </div>
            </div>

            {/* Skills To Learn */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Skills Learning Target</span>
              <div className="flex flex-wrap gap-1">
                {profile.skillsToLearn && profile.skillsToLearn.length > 0 ? (
                  profile.skillsToLearn.map(s => (
                    <span key={s} className="px-2 py-0.5 bg-[var(--card-subtle)] border border-[var(--border)] text-[10px] font-bold rounded text-[var(--primary)]">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No skills targeted yet.</span>
                )}
              </div>
            </div>

            {/* Goals */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Development Goals</span>
              <ul className="text-xs space-y-1 text-[var(--text-secondary)] font-medium list-disc list-inside">
                {profile.goals && profile.goals.length > 0 ? (
                  profile.goals.map(g => <li key={g}>{g}</li>)
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">No growth targets declared.</span>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Portfolio Tabs Area */}
        <div className="space-y-6">
          <div className="flex border-b border-[var(--border)]">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 cursor-pointer transition-all ${activeTab === 'portfolio' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              Portfolio & Proof of Work
            </button>
            <button
              onClick={() => setActiveTab('quests')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 cursor-pointer transition-all ${activeTab === 'quests' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              Completed Campaigns ({profile.completedQuests || 0})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 cursor-pointer transition-all ${activeTab === 'achievements' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
            >
              Certificates & Unlocks
            </button>
          </div>

          {/* TAB 1: Proof of Work Portfolio */}
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={15} className="text-[var(--primary)]" />
                  Proof of Work Dossier
                </h3>
                <button
                  onClick={() => setAddingProof(!addingProof)}
                  className="primary px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Add Project Proof
                </button>
              </div>

              {/* Add Proof Form overlay/panel */}
              {addingProof && (
                <form onSubmit={handleAddProofOfWork} className="panel bg-[var(--card-subtle)] space-y-4 border border-[var(--primary)]/20 animate-fade-up">
                  <div className="grid sm:grid-cols-2 gap-4 text-left">
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 required">Project / Deliverable Title</label>
                      <input
                        type="text"
                        required
                        value={proofTitle}
                        onChange={e => setProofTitle(e.target.value)}
                        placeholder="e.g. Ludhiana Municipality Portal"
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Project Link / Repo URL</label>
                      <input
                        type="url"
                        value={proofLink}
                        onChange={e => setProofLink(e.target.value)}
                        placeholder="https://github.com/..."
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 required">Impact / Development Report</label>
                    <textarea
                      required
                      value={proofDesc}
                      onChange={e => setProofDesc(e.target.value)}
                      placeholder="Detail your engineering decisions, team contributions, and outcome metrics..."
                      className="text-xs min-h-[80px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Skills Demonstrated (comma separated)</label>
                    <input
                      type="text"
                      value={proofSkills}
                      onChange={e => setProofSkills(e.target.value)}
                      placeholder="React, TypeScript, Node.js"
                      className="text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setAddingProof(false)} className="ghost px-4 py-2 rounded-lg text-xs">
                      Cancel
                    </button>
                    <button type="submit" className="primary px-5 py-2 rounded-lg text-xs font-bold">
                      Record Proof
                    </button>
                  </div>
                </form>
              )}

              {/* Proofs List */}
              {profile.proofs && profile.proofs.length > 0 ? (
                <div className="grid gap-4">
                  {profile.proofs.map(p => (
                    <div key={p.id} className="panel p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-sm font-extrabold text-[var(--text)] block">{p.title}</strong>
                          <span className="text-[10px] text-[var(--text-muted)] font-semibold block mt-0.5">Recorded {new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-black border ${p.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                          {p.status}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-normal">{p.description}</p>
                      
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {p.skillsVerified.map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[var(--card-subtle)] border border-[var(--border)] text-[9px] font-bold rounded">
                            {s}
                          </span>
                        ))}
                      </div>

                      {p.link && (
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-[var(--primary)] font-bold hover:underline pt-2 border-t border-[var(--border)] w-full"
                        >
                          Access Deliverable Project <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No Proof of Work Dossiers"
                  description="You haven't recorded any custom project proofs yet."
                  whyItMatters="Verified evidence is the cornerstone of organizational trust inside the Guild network. Unproven claims carry no rank reputation."
                  actionText="Add First Project"
                  onAction={() => setAddingProof(true)}
                  icon={<Briefcase size={22} />}
                />
              )}
            </div>
          )}

          {/* TAB 2: Completed Quests */}
          {activeTab === 'quests' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={15} className="text-emerald-500" />
                Completed Campaign Logs
              </h3>
              
              <div className="panel p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)]">
                No verified campaign outcomes logged on the Firestore ledger. Join active quests to accumulate completed operations.
              </div>
            </div>
          )}

          {/* TAB 3: Achievements & Certificates */}
          {activeTab === 'achievements' && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Star size={15} className="text-[var(--primary)]" />
                Certificates & Badge Unlocks
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="panel p-4 bg-[var(--card-subtle)] border border-[var(--border)] flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-[var(--text)] block">Welcome Recruit Badge</strong>
                    <span className="text-[10px] text-[var(--text-muted)]">Completed onboarding selection wizard.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
