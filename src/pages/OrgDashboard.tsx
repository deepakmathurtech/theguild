import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchQuests, fetchOrganizationNeeds, fetchOrganizationActivities, RECEPTIONISTS } from '../lib/repository';
import type { Organization, Quest, Need, OrganizationActivity } from '../types/guild';
import { Link } from 'react-router-dom';
import { Building, Award, ShieldCheck, Mail, Phone, ExternalLink, Calendar, HelpCircle, ArrowRight, Activity, Plus, FileText, CheckCircle, Clock, AlertCircle, Send } from 'lucide-react';
import EmptyState from '../components/EmptyState';

export default function OrgDashboard() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [activities, setActivities] = useState<OrganizationActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      try {
        // Query Organization owned by user
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
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

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

  // Find coordinator
  const manager = RECEPTIONISTS.find(r => r.uid === org.assignedReceptionistId) || RECEPTIONISTS[0];

  return (
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header Panel */}
      <div className="hero-panel bg-gradient-to-br from-[var(--card)] to-[var(--bg-alt)] p-8 rounded-2xl flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
        <div>
          <span className="eyebrow block">Organization Space</span>
          <h1 className="text-3xl font-extrabold tracking-tight">{org.name}</h1>
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

        {/* Relationship Manager presentation */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--primary)]">Relationship Manager</h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Your organization is directly supported by a dedicated Guild Officer. Contact them directly to coordinate quest launches.
          </p>

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
