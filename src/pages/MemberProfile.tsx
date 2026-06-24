import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import { updateLedgerRecord, RECEPTIONISTS, fetchOrganizationNeeds, getUserQuestStats, fetchQuestsByNeedId, type UserQuestStats } from '../lib/repository';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import {
  Award, ShieldCheck, Mail, Calendar, Phone, Plus, ExternalLink,
  BookOpen, Star, Compass, UserCheck, Briefcase, FileText, CheckCircle,
  MapPin, Building2, Target, TrendingUp, DollarSign, Play, Clock, Archive
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { PAGE_SEO } from '../components/SEO';
import type { Organization, Need } from '../types/guild';
import { Link } from 'react-router-dom';

export default function MemberProfile() {
  const { profile } = useAuth();
  const params = useParams<{ id: string }>();
  const viewMemberId = params.id;
  const isViewingOther = !!viewMemberId && viewMemberId !== profile?.uid;

  // Viewed member data (when viewing another member's profile)
  const [viewedMember, setViewedMember] = useState<{
    displayName: string;
    photoURL: string;
    bio: string;
    role: string;
    verificationLevel: string;
    reputationPoints: number;
    joinedAt: string;
  } | null>(null);
  const [loadingViewedMember, setLoadingViewedMember] = useState(false);

  const isOrgRep = profile?.role === 'organizationRepresentative';

  // Organization data for org reps
  const [userOrg, setUserOrg] = useState<Organization | null>(null);
  const [orgNeeds, setOrgNeeds] = useState<Need[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(false);

  // SEO: Set page title
  useEffect(() => {
    document.title = isOrgRep ? 'Organization Profile' : PAGE_SEO.memberProfile.title;
  }, [isOrgRep]);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'quests' | 'achievements' | 'needs'>('portfolio');
  const [questStats, setQuestStats] = useState<UserQuestStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Quest link expansion state
  const [selectedNeedQuests, setSelectedNeedQuests] = useState<{ needId: string; quests: any[] } | null>(null);
  const [expandedNeedId, setExpandedNeedId] = useState<string | null>(null);
  const [loadingNeedQuests, setLoadingNeedQuests] = useState<string | null>(null);

  // Load quest stats
  useEffect(() => {
    if (!profile?.uid) return;
    const userId = profile.uid;
    async function loadQuestStats() {
      setLoadingStats(true);
      try {
        const stats = await getUserQuestStats(userId);
        setQuestStats(stats);
      } catch (err) {
        console.error('Failed to load quest stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }
    loadQuestStats();
  }, [profile]);

  // Load quests for a specific need when expanded
  async function toggleNeedQuests(needId: string) {
    if (expandedNeedId === needId) {
      setExpandedNeedId(null);
      setSelectedNeedQuests(null);
    } else {
      setExpandedNeedId(needId);
      setLoadingNeedQuests(needId);
      try {
        const quests = await fetchQuestsByNeedId(needId);
        setSelectedNeedQuests({ needId, quests });
      } catch (err) {
        console.error('Failed to load need quests:', err);
      } finally {
        setLoadingNeedQuests(null);
      }
    }
  }

  // Fetch organization for org reps
  useEffect(() => {
    if (isOrgRep && profile?.uid) {
      const userId = profile.uid;
      async function loadOrgData() {
        setLoadingOrg(true);
        try {
          // Debug: fetch ALL needs first
          const allNeedsQuery = query(collection(db, 'needs'), where('archiveStatus', '==', 'active'));
          const allNeedsSnap = await getDocs(allNeedsQuery);
          console.log('[MemberProfile] ALL needs count:', allNeedsSnap.size);

          const orgQuery = query(collection(db, 'organizations'), where('ownerId', '==', userId));
          const orgSnap = await getDocs(orgQuery);
          if (!orgSnap.empty) {
            const orgData = { id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() } as Organization;
            setUserOrg(orgData);
            // Fetch org needs
            const needs = await fetchOrganizationNeeds(orgData.id);
            console.log('[MemberProfile] orgId:', orgData.id, '| needs found:', needs.length);
            if (needs.length > 0) {
              console.log('[MemberProfile] sample need:', needs[0]);
            }
            setOrgNeeds(needs);
          }
        } catch (err) {
          console.error('Error loading org:', err);
        } finally {
          setLoadingOrg(false);
        }
      }
      loadOrgData();
    }
  }, [isOrgRep, profile]);

  // Load viewed member data when viewing another member's profile
  useEffect(() => {
    if (!isViewingOther || !viewMemberId) return;

    async function loadViewedMember() {
      setLoadingViewedMember(true);
      try {
        const memberDoc = await getDoc(doc(db, 'users', viewMemberId!));
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          setViewedMember({
            displayName: data.displayName || data.fullName || 'Unknown Member',
            photoURL: data.photoURL || '',
            bio: data.bio || '',
            role: data.role || 'member',
            verificationLevel: data.verificationLevel || 'none',
            reputationPoints: data.reputationPoints || 0,
            joinedAt: data.createdAt || data.joinedAt || ''
          });
        } else {
          setViewedMember(null);
        }
      } catch (err) {
        console.error('Failed to load member:', err);
        setViewedMember(null);
      } finally {
        setLoadingViewedMember(false);
      }
    }
    loadViewedMember();
  }, [isViewingOther, viewMemberId]);

  // Proof creation inputs
  const [addingProof, setAddingProof] = useState(false);
  const [proofTitle, setProofTitle] = useState('');
  const [proofDesc, setProofDesc] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [proofSkills, setProofSkills] = useState('');

  if (!profile) return null;

  // Show another member's profile
  if (isViewingOther && viewedMember) {
    return (
      <div className="space-y-8 py-4 text-left max-w-3xl mx-auto animate-fade-up">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Member Profile</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Viewing member details</p>
        </div>

        {/* Member Header */}
        <div className="panel space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[var(--primary)]/20 flex items-center justify-center overflow-hidden border border-[var(--border)]">
              {viewedMember.photoURL ? (
                <img src={viewedMember.photoURL} alt={viewedMember.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-[var(--primary)]">{viewedMember.displayName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{viewedMember.displayName}</h2>
              <p className="text-xs text-[var(--text-muted)]">{viewedMember.role}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded border border-[var(--primary)]/20">
              {viewedMember.verificationLevel} Verified
            </span>
            <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded">
              +{viewedMember.reputationPoints} Rep
            </span>
          </div>

          {viewedMember.bio && (
            <p className="text-sm text-[var(--text-secondary)]">{viewedMember.bio}</p>
          )}

          {viewedMember.joinedAt && (
            <p className="text-xs text-[var(--text-muted)]">
              Joined {new Date(viewedMember.joinedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show another member's profile - loading or not found
  if (isViewingOther) {
    if (loadingViewedMember) {
      return <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading member profile...</div>;
    }
    if (!viewedMember) {
      return <div className="p-12 text-center text-xs text-[var(--text-muted)]">Member not found</div>;
    }
  }

  // Show organization profile for org reps
  if (isOrgRep) {
    if (loadingOrg) {
      return <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading organization profile...</div>;
    }

    return (
      <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
        {/* Organization Profile Header */}
        <div className="panel bg-gradient-to-br from-[var(--primary)]/10 to-[var(--card)] border border-[var(--primary)]/20 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Org Logo */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center border border-[var(--border-light)] shadow-lg overflow-hidden flex-shrink-0">
              {userOrg?.logo ? (
                <img src={userOrg.logo} alt={userOrg.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-10 h-10 text-[var(--primary)]" />
              )}
            </div>

            {/* Org Info */}
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap gap-2 items-center">
                <h1 className="text-2xl font-black tracking-tight leading-none">{userOrg?.name || 'Your Organization'}</h1>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={12} />
                  Organization Verified
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] max-w-xl leading-relaxed font-normal">
                {userOrg?.description || 'Organization description not available.'}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] font-medium">
                <span className="flex items-center gap-1.5"><Mail size={13} className="text-[var(--primary)]" /> {userOrg?.email}</span>
                {userOrg?.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-[var(--primary)]" /> {userOrg.phone}</span>}
                <span className="flex items-center gap-1.5"><Building2 size={13} className="text-[var(--primary)]" /> {userOrg?.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="panel p-4 text-center">
            <div className="text-2xl font-black text-[var(--primary)]">{orgNeeds.length}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Needs Posted</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-2xl font-black text-emerald-500">{userOrg?.trustLevel || 'new'}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Trust Level</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-2xl font-black text-blue-500">{userOrg?.assignedReceptionistId ? '1' : '0'}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Relationship Manager</div>
          </div>
          <div className="panel p-4 text-center">
            <div className="text-2xl font-black text-purple-500">{userOrg?.currentStatus || 'new'}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Status</div>
          </div>
        </div>

        {/* Recent Needs */}
        <div className="panel">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider">Your Submitted Needs</h3>
            <Link to="/need-submit" className="primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Plus size={12} /> Submit New Need
            </Link>
          </div>
          {orgNeeds.length > 0 ? (
            <div className="grid gap-2">
              {orgNeeds.slice(0, 5).map(need => (
                <Link key={need.id} to={`/needs/${need.id}`} className="p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg text-xs hover:border-[var(--primary)]/30 transition-colors flex justify-between items-center">
                  <span className="font-semibold text-[var(--text-secondary)] truncate flex-1">{need.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                    need.status === 'submitted' ? 'bg-slate-500/20 text-slate-400' :
                    need.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                    need.status === 'inProgress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {need.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Target size={24} className="mx-auto text-[var(--text-muted)] mb-2 opacity-50" />
              <p className="text-xs text-[var(--text-muted)]">No needs submitted yet.</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Submit your first need to get started.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link to="/org-dashboard" className="panel p-4 text-center hover:border-[var(--primary)]/30 transition-colors cursor-pointer">
            <Building2 className="w-6 h-6 mx-auto text-[var(--primary)] mb-2" />
            <span className="text-xs font-bold block">Dashboard</span>
            <span className="text-[10px] text-[var(--text-muted)]">Manage your org</span>
          </Link>
          <Link to="/need-submit" className="panel p-4 text-center hover:border-[var(--primary)]/30 transition-colors cursor-pointer">
            <Target className="w-6 h-6 mx-auto text-[var(--primary)] mb-2" />
            <span className="text-xs font-bold block">Post Need</span>
            <span className="text-[10px] text-[var(--text-muted)]">Request help</span>
          </Link>
          <Link to="/org-outcomes" className="panel p-4 text-center hover:border-[var(--primary)]/30 transition-colors cursor-pointer">
            <TrendingUp className="w-6 h-6 mx-auto text-[var(--primary)] mb-2" />
            <span className="text-xs font-bold block">Outcomes</span>
            <span className="text-[10px] text-[var(--text-muted)]">Track results</span>
          </Link>
        </div>
      </div>
    );
  }

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

          {/* Jurisdiction (hidden from member view - only shown in admin dashboard) */}
          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] font-medium mt-2">
            {profile.jurisdiction && profile.jurisdiction.cityName && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[var(--primary)]" />
                {profile.jurisdiction.cityName}{profile.jurisdiction.stateName ? `, ${profile.jurisdiction.stateName}` : ''}
              </span>
            )}
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
            {isOrgRep && userOrg && (
              <button
                onClick={() => setActiveTab('needs')}
                className={`pb-3 px-4 font-bold text-xs border-b-2 cursor-pointer transition-all ${activeTab === 'needs' ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'}`}
              >
                Organization Needs ({orgNeeds.length})
              </button>
            )}
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

              {loadingStats ? (
                <div className="panel p-6 text-center text-xs text-[var(--text-muted)]">
                  Loading quest statistics...
                </div>
              ) : questStats ? (
                <>
                  {/* Quest Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="panel p-4 text-center">
                      <div className="text-2xl font-black text-[var(--primary)]">{questStats.totalApplications}</div>
                      <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Applications</div>
                    </div>
                    <div className="panel p-4 text-center">
                      <div className="text-2xl font-black text-amber-400">{questStats.pending}</div>
                      <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Pending</div>
                    </div>
                    <div className="panel p-4 text-center">
                      <div className="text-2xl font-black text-emerald-400">{questStats.accepted}</div>
                      <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Active</div>
                    </div>
                    <div className="panel p-4 text-center">
                      <div className="text-2xl font-black text-purple-400">{questStats.completed}</div>
                      <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Completed</div>
                    </div>
                  </div>

                  {/* Type breakdown */}
                  {(questStats.standardQuests > 0 || questStats.openSourceQuests > 0) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="panel p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target size={14} className="text-blue-400" />
                          <span className="text-xs font-bold">Standard Quests</span>
                        </div>
                        <span className="text-sm font-black text-blue-400">{questStats.standardQuests}</span>
                      </div>
                      <div className="panel p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-purple-400" />
                          <span className="text-xs font-bold">Open Source</span>
                        </div>
                        <span className="text-sm font-black text-purple-400">{questStats.openSourceQuests}</span>
                      </div>
                    </div>
                  )}

                  {/* History link */}
                  <Link to="/quest-center" className="primary px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                    <Compass size={14} /> View Quest Center
                  </Link>
                </>
              ) : (
                <div className="panel p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)]">
                  No quest activity recorded. Join quests to start your campaign history.
                </div>
              )}
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

          {/* TAB 4: Organization Needs */}
          {activeTab === 'needs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Target size={15} className="text-[var(--primary)]" />
                Organization Needs
              </h3>

              {loadingOrg ? (
                <div className="panel p-6 text-center text-xs text-[var(--text-muted)]">
                  Loading organization needs...
                </div>
              ) : orgNeeds.length > 0 ? (
                <div className="grid gap-3">
                  {orgNeeds.map(need => (
                    <div key={need.id} className="panel p-4 bg-[var(--card)] border border-[var(--border)] rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <Link to={`/needs/${need.id}`} className="text-sm font-bold text-[var(--text)] hover:text-[var(--primary)] transition-colors">
                          {need.title}
                        </Link>
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                          need.status === 'submitted' ? 'bg-slate-500/20 text-slate-400' :
                          need.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                          need.status === 'inProgress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {need.status}
                        </span>
                      </div>
                      {need.description && (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{need.description}</p>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Posted {need.createdAt ? new Date(need.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                        <button
                          onClick={() => toggleNeedQuests(need.id!)}
                          className="text-[10px] text-[var(--primary)] font-bold hover:underline"
                        >
                          {loadingNeedQuests === need.id ? 'Loading...' : expandedNeedId === need.id ? 'Hide Quests' : 'View Quests'}
                        </button>
                      </div>
                      {/* Linked Quests (expanded view) */}
                      {expandedNeedId === need.id && selectedNeedQuests?.needId === need.id && (
                        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Quests from this Need</span>
                          {loadingNeedQuests === need.id ? (
                            <p className="text-xs text-[var(--text-muted)]">Loading quests...</p>
                          ) : selectedNeedQuests.quests.length > 0 ? (
                            <div className="grid gap-2">
                              {selectedNeedQuests.quests.map(quest => (
                                <Link key={quest.id} to={`/quests/${quest.id}`} className="p-2 bg-[var(--card-subtle)] border border-[var(--border)] rounded text-xs flex justify-between items-center hover:border-[var(--primary)]/30 transition-colors">
                                  <span className="font-medium text-[var(--text)] truncate flex-1">{quest.title}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                                    quest.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                                    quest.status === 'inProgress' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-slate-500/20 text-slate-400'
                                  }`}>
                                    {quest.status}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--text-muted)]">No quests have been created from this need yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)]">
                  No needs submitted yet. Submit your first need to get help from the guild network.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
