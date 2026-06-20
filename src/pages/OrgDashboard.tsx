import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { fetchQuests, fetchOrganizationNeeds, fetchOrganizationActivities, fetchBranches, RECEPTIONISTS, getOrganizationActionItems, type ActionItem } from '../lib/repository';
import type { Organization, Quest, Need, OrganizationActivity } from '../types/guild';
import { Link } from 'react-router-dom';
import { Building, Award, ShieldCheck, Mail, Phone, ExternalLink, Calendar, HelpCircle, ArrowRight, Activity, Plus, FileText, CheckCircle, Clock, AlertCircle, Send, Check, Edit2, X, Globe, Users, TrendingUp, Target, DollarSign, Handshake, BarChart3 } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ActionCenter from '../components/ActionCenter';

const CATEGORIES = ['Business', 'NGO', 'College', 'School', 'Community', 'Government Related', 'Individual Initiative'] as const;
const VISIBILITY_OPTIONS = ['public', 'guildMembers', 'private', 'draft'] as const;

export default function OrgDashboard() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [activities, setActivities] = useState<OrganizationActivity[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    category: '',
    visibility: 'public' as 'public' | 'guildMembers' | 'private' | 'draft'
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      try {
        // Query Organization owned by user - accept both null archiveStatus (legacy) and 'active'
        const orgQuery = query(collection(db, 'organizations'), where('ownerId', '==', profile.uid));
        const orgSnap = await getDocs(orgQuery);
        if (!orgSnap.empty) {
          const orgData = { id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() } as Organization;
          setOrg(orgData);

          // Fetch quests posted by this org
          const qList = await fetchQuests();
          const orgQuests = qList.filter(q => q.organizationId === orgSnap.docs[0].id);
          setQuests(orgQuests);

          // Fetch needs for this org
          const orgNeeds = await fetchOrganizationNeeds(orgData.id);
          setNeeds(orgNeeds);

          // Fetch activities
          const orgActivities = await fetchOrganizationActivities(orgData.id);
          setActivities(orgActivities);

          // Fetch all branches for relationship center
          const branchList = await fetchBranches();
          setBranches(branchList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  // Generate action items for organization
  const actionItems = useMemo(() => {
    if (!org) return [];
    return getOrganizationActionItems(org, quests, needs);
  }, [org, quests, needs]);

  // Start editing
  const startEdit = () => {
    if (!org) return;
    setEditForm({
      name: org.name || '',
      description: org.description || '',
      website: org.website || '',
      phone: org.phone || '',
      email: org.email || '',
      address: org.address || '',
      category: org.category || 'Business',
      visibility: (org.visibility as any) || 'public'
    });
    setIsEditing(true);
    setSaveError('');
    setSaveSuccess('');
  };

  // Save organization edits
  const saveEdit = async () => {
    if (!org || !profile) return;
    setSavingEdit(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      await updateDoc(doc(db, 'organizations', org.id), {
        name: editForm.name,
        description: editForm.description,
        website: editForm.website,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        category: editForm.category as any,
        visibility: editForm.visibility,
        updatedAt: new Date().toISOString()
      });
      // Update local state
      setOrg({ ...org, name: editForm.name, description: editForm.description, website: editForm.website, phone: editForm.phone, email: editForm.email, address: editForm.address, category: editForm.category as any, visibility: editForm.visibility as any, updatedAt: new Date().toISOString() } as Organization);
      setSaveSuccess('Organization updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSaveError('');
    setSaveSuccess('');
  };

  if (!profile) return null;

  if (loading) {
    return <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading Organization space...</div>;
  }

  // If user doesn't own any org, show Org Landing redirect
  if (!org) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <EmptyState
          title="No Registered Organization Found"
          description="It looks like you haven't registered an organization space with this account yet."
          whyItMatters="To post quests, request volunteers, and manage student contractor cohorts, you must register a certified group."
          actionText="Register Organization"
          onAction={() => window.location.href = '/org-onboarding'}
          icon={<Building size={22} />}
        />
      </div>
    );
  }

  // Edit mode overlay
  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-up">
        <div className="panel p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Edit Organization</h2>
            <button onClick={cancelEdit} className="p-2 hover:bg-[var(--card-subtle)] rounded-lg">
              <X size={20} />
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm">{saveSuccess}</div>
          )}
          {saveError && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">{saveError}</div>
          )}

          <div className="grid gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Organization Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Description</label>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Website</label>
              <input
                type="text"
                value={editForm.website}
                onChange={e => setEditForm({ ...editForm, website: e.target.value })}
                className="text-sm"
                placeholder="https://"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Address</label>
              <input
                type="text"
                value={editForm.address}
                onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="text-sm"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Visibility</label>
                <select
                  value={editForm.visibility}
                  onChange={e => setEditForm({ ...editForm, visibility: e.target.value as any })}
                  className="text-sm"
                >
                  {VISIBILITY_OPTIONS.map(vis => (
                    <option key={vis} value={vis}>{vis}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveEdit}
              disabled={savingEdit}
              className="primary px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={cancelEdit} className="ghost px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Journey stages for organization lifecycle
  const JOURNEY_STAGES = [
    { key: 'new', label: 'Registered', desc: 'Initial registration complete' },
    { key: 'contacted', label: 'In Touch', desc: 'Connected with Relationship Manager' },
    { key: 'active', label: 'Active', desc: 'Currently working with Guild' },
    { key: 'trusted', label: 'Trusted', desc: 'Verifiedpartner organization' },
    { key: 'partner', label: 'Partner', desc: 'Strategic Guild partner' }
  ];
  const currentStageIndex = JOURNEY_STAGES.findIndex(s => s.key === org.currentStatus) || 0;

  // Find coordinator
  const manager = RECEPTIONISTS.find(r => r.uid === org.assignedReceptionistId) || RECEPTIONISTS[0];

  return (
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header Panel */}
      <div className="hero-panel bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)] p-8 rounded-2xl flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div>
          <span className="eyebrow block">Organization Space</span>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">{org.name}</h1>
            <button onClick={startEdit} className="p-1.5 rounded-lg hover:bg-[var(--card-subtle)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" title="Edit Organization">
              <Edit2 size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-muted)]">{org.category} Chapter</span>
            <span>•</span>
            <span className={`text-[10px] font-black uppercase tracking-wider ${org.trustLevel === 'new' ? 'text-amber-400' : 'text-emerald-400'}`}>
              Trust Level: {org.trustLevel}
            </span>
          </div>
        </div>

        {/* Verification Status */}
        <div className="panel bg-[var(--card)] p-4 rounded-xl border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs flex items-start gap-2.5 shadow-sm">
          <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block text-[var(--text)] font-semibold mb-0.5">Verification status</strong>
            <span>Verified organization entries receive prioritize visibility in member feeds.</span>
          </div>
        </div>

        {/* Organization Action Items */}
        {actionItems.length > 0 && (
          <div className="mt-4 md:mt-0">
            <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-black block mb-2">Your Action Items</span>
            <ActionCenter items={actionItems.slice(0, 3)} title="" maxItems={3} />
          </div>
        )}
      </div>

      {/* Organization Journey Progress */}
      <div className="panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4">Your Guild Journey</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {JOURNEY_STAGES.map((stage, idx) => (
            <React.Fragment key={stage.key}>
              <div className={`flex-shrink-0 flex flex-col items-center ${idx <= currentStageIndex ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx < currentStageIndex ? 'bg-[var(--primary)] text-black' : idx === currentStageIndex ? 'bg-[var(--primary)]/20 border border-[var(--primary)] text-[var(--primary)]' : 'bg-[var(--card-subtle)] border border-[var(--border)]'}`}>
                  {idx < currentStageIndex ? <Check size={14} /> : idx + 1}
                </div>
                <span className="text-[9px] font-bold mt-1.5 whitespace-nowrap">{stage.label}</span>
              </div>
              {idx < JOURNEY_STAGES.length - 1 && (
                <div className={`flex-shrink-0 h-0.5 flex-1 min-w-[20px] ${idx < currentStageIndex ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          Current: <span className="text-[var(--primary)] font-bold">{JOURNEY_STAGES[currentStageIndex]?.desc}</span>
        </p>
      </div>

      {/* PHASE 7: Organization Analytics */}
      <div className="panel p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart3 size={16} /> Organization Analytics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[var(--card-subtle)] rounded-xl border border-[var(--border)] text-center">
            <div className="text-2xl font-black text-[var(--primary)]">{needs.length}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Needs Submitted</div>
          </div>
          <div className="p-4 bg-[var(--card-subtle)] rounded-xl border border-[var(--border)] text-center">
            <div className="text-2xl font-black text-emerald-500">{quests.length}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Quests Posted</div>
          </div>
          <div className="p-4 bg-[var(--card-subtle)] rounded-xl border border-[var(--border)] text-center">
            <div className="text-2xl font-black text-blue-500">{activities.length}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Activities</div>
          </div>
          <div className="p-4 bg-[var(--card-subtle)] rounded-xl border border-[var(--border)] text-center">
            <div className="text-2xl font-black text-purple-500">{org.trustLevel || 'new'}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">Trust Level</div>
          </div>
        </div>
      </div>

      {/* Row 2: Relationship Manager presentation */}
      <div className="grid md:grid-cols-[1.5fr_1fr] gap-6">
        
        {/* Active Needs / Setup */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
            <span>Your Submitted Needs</span>
            <Link to={`/need-submit?id=${org.id}`} className="primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Plus size={12} /> Submit Need
            </Link>
          </h3>

          <div className="grid gap-2">
            {needs.length > 0 ? (
              needs.slice(0, 4).map(need => (
                <Link key={need.id} to={`/needs/${need.id}`} className="p-3 bg-[var(--card-subtle)] border border-[var(--border)] rounded-lg text-xs hover:border-[var(--primary)]/30 transition-colors flex justify-between items-center">
                  <span className="font-semibold text-[var(--text-secondary)] truncate flex-1">{need.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                    String(need.status) === 'submitted' ? 'bg-slate-500/20 text-slate-400' :
                    String(need.status) === 'underReview' ? 'bg-amber-500/20 text-amber-400' :
                    String(need.status) === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                    String(need.status) === 'inProgress' ? 'bg-blue-500/20 text-blue-400' :
                    String(need.status) === 'completed' ? 'bg-emerald-500/20 text-emerald-500' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {String(need.status).replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-6">
                <FileText size={24} className="mx-auto text-[var(--text-muted)] mb-2 opacity-50" />
                <p className="text-xs text-[var(--text-muted)]">No needs submitted yet.</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Submit your first need to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* PHASE 5: Relationship Center - Manager + Branch */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--primary)]">Relationship Center</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Your organization is directly supported by dedicated Guild Officers.
          </p>

          {/* Manager Card */}
          <div className="flex gap-3.5 items-center bg-[var(--card-subtle)] p-3.5 rounded-xl border border-[var(--border)]">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] bg-black flex-shrink-0">
              <img src={manager.photoURL} alt={manager.fullName} className="w-full h-full object-cover" />
            </div>
            <div>
              <strong className="text-sm font-bold text-[var(--text)] block leading-tight">{manager.fullName}</strong>
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">{manager.role}</span>
              <span className="text-[10px] text-[var(--primary)] font-bold block mt-1.5 flex items-center gap-1">
                <Calendar size={11} /> Next Contact: Tomorrow 11 AM
              </span>
            </div>
          </div>

          {/* Branch Info */}
          {org.branchId && branches.find(b => b.id === org.branchId) && (
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--card-subtle)]">
              <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] mb-2">Assigned Branch</div>
              {(() => {
                const branch = branches.find(b => b.id === org.branchId);
                return branch ? (
                  <div>
                    <div className="text-sm font-bold text-[var(--text)]">{branch.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{branch.city}, {branch.state}</div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Posted Quests List */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-black uppercase tracking-wider">Our Active Quests ({quests.length})</h2>
          <button className="primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1">
            <Plus size={14} /> Launch New Quest
          </button>
        </div>

        {quests.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {quests.map(q => (
              <div key={q.id} className="panel p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[10px] font-black uppercase text-[var(--primary)]">{q.difficulty}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-semibold">{q.mode}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-[var(--text)] mt-1">{q.title}</h4>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2 mt-1">{q.description}</p>
                </div>
                <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">Status: {q.status.toUpperCase()}</span>
                  <Link to={`/quests/${q.id}`} className="text-[var(--primary)] font-bold hover:underline flex items-center gap-0.5">
                    Evaluate Submissions <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No Posted Quests"
            description="You haven't posted any quests for Guild members to claim yet."
            whyItMatters="Quests are how organizations scale work. Your assigned coordinator will assist you in mapping your business needs to Quest parameters."
            actionText="Consult Relationship Manager"
            onAction={() => alert(`Email sent to ${manager.email}`)}
            icon={<Award size={22} />}
          />
        )}
      </section>

      {/* Activity Timeline */}
      {(activities.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">Activity Timeline</h2>
          <div className="panel p-4 rounded-xl border border-[var(--border)]">
            <div className="space-y-3">
              {activities.slice(0, 8).map((activity, idx) => (
                <div key={activity.id} className="flex gap-3 items-start">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    activity.type === 'outcomeDelivered' ? 'bg-emerald-500' :
                    activity.type === 'needSubmitted' ? 'bg-blue-500' :
                    activity.type === 'questCreated' ? 'bg-purple-500' :
                    activity.type === 'opportunityCreated' ? 'bg-amber-500' :
                    'bg-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[var(--text)] truncate">{activity.title}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{activity.description}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
