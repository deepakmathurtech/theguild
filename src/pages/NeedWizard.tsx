import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createNeed, logOrganizationActivity, fetchOrganizationById, fetchUserOrganization } from '../lib/repository';
import { ChevronRight, ChevronLeft, FileText, Target, Tag, Clock, Check, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { NeedCategory, BudgetRange, Organization } from '../types/guild';

const CATEGORIES: { id: NeedCategory; title: string; desc: string }[] = [
  { id: 'Technology', title: 'Technology', desc: 'Software, apps, websites, automation' },
  { id: 'Research', title: 'Research', desc: 'Data collection, analysis, studies' },
  { id: 'Education', title: 'Education', desc: 'Training, tutoring, workshops' },
  { id: 'Community', title: 'Community', desc: 'Events, outreach, volunteers' },
  { id: 'Marketing', title: 'Marketing', desc: 'Social media, content, campaigns' },
  { id: 'Design', title: 'Design', desc: 'UI/UX, graphics, branding' },
  { id: 'Operations', title: 'Operations', desc: 'Admin, documentation, processes' },
  { id: 'Other', title: 'Other', desc: 'Something else entirely' }
];

const PRIORITIES = [
  { id: 'low', title: 'Low', desc: 'Can wait 2-4 weeks', color: 'text-slate-400' },
  { id: 'medium', title: 'Medium', desc: 'Needed within 2 weeks', color: 'text-amber-400' },
  { id: 'high', title: 'High', desc: 'Urgent - within 1 week', color: 'text-orange-500' },
  { id: 'urgent', title: 'Urgent', desc: 'Critical - immediate need', color: 'text-red-500' }
];

const BUDGET_RANGES: { id: BudgetRange; title: string; desc: string }[] = [
  { id: 'volunteer', title: 'Volunteer / Unpaid', desc: 'Community contribution' },
  { id: 'under5k', title: 'Under ₹5,000', desc: 'Small token of appreciation' },
  { id: '5k-25k', title: '₹5,000 - ₹25,000', desc: 'Standard project budget' },
  { id: '25k-100k', title: '₹25,000 - ₹1,00,000', desc: 'Medium project budget' },
  { id: '100k-500k', title: '₹1,00,000 - ₹5,00,000', desc: 'Large project budget' },
  { id: '500k-plus', title: '₹5,00,000+', desc: 'Enterprise level budget' },
  { id: 'toDiscuss', title: 'To Be Discussed', desc: 'Open to negotiation' }
];

const TIMELINES = [
  'Within 1 week',
  'Within 2 weeks',
  'Within 1 month',
  'Within 3 months',
  'Flexible / To be discussed'
];

export default function NeedWizard() {
  // ALL hooks must be at top - before any returns!
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [category, setCategory] = useState<NeedCategory>('Technology' as NeedCategory);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [budgetRange, setBudgetRange] = useState<BudgetRange>('' as BudgetRange);
  const [timeline, setTimeline] = useState('');
  const [deadline, setDeadline] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);

  // Get organization from URL param OR profile's ownerId
  const organizationId = searchParams.get('id') || '';
  const organizationName = org?.name || '';

  useEffect(() => {
    async function loadOrg() {
      let orgId = organizationId;
      // If no URL param, try to get org from user's ownerId
      if (!orgId && profile?.uid) {
        try {
          const userOrg = await fetchUserOrganization(profile);
          orgId = userOrg?.id || '';
          if (userOrg) setOrg(userOrg);
        } catch (e) {
          console.error('Failed to load user org:', e);
        }
      }

      if (!orgId) {
        setLoading(false);
        return;
      }
      if (org && org.id === orgId) {
        setLoading(false);
        return;
      }
      try {
        const orgData = await fetchOrganizationById(orgId);
        setOrg(orgData);
      } catch (e) {
        console.error('Failed to load organization:', e);
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, [organizationId, profile?.uid]);

  // NOW returns are allowed
  if (!profile) return null;
  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  // Error if no organization
  if (!org || !org.id) {
    return (
      <div className="panel p-8 text-center">
        <h3>No Organization Selected</h3>
        <p className="text-[var(--text-secondary)] mt-2">
          Please navigate to your organization dashboard and click "Post Need" from there.
        </p>
        <a href="/org-dashboard" className="primary inline-block mt-4">Go to Dashboard</a>
      </div>
    );
  }

  const canProceed = () => {
    if (step === 1) return title.trim().length >= 5 && description.trim().length >= 20;
    if (step === 2) return desiredOutcome.trim().length >= 10;
    if (step === 3) return !!category;
    if (step === 4) return !!priority && !!timeline;
    if (step === 5) return true;
    return true;
  };

  const handleNext = () => {
    if (step < 6) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const need = await createNeed(
        org.id,
        organizationName,
        {
          title: title.trim(),
          description: description.trim(),
          desiredOutcome: desiredOutcome.trim(),
          category,
          priority,
          ...(budgetRange ? { budgetRange } : {}),
          ...(timeline ? { timeline } : {}),
          ...(deadline ? { deadline } : {}),
          supportingDocuments: documents.length > 0 ? documents : []
        },
        profile
      );

      await logOrganizationActivity(
        org.id,
        'needSubmitted',
        `Need Submitted: ${title}`,
        `${title} has been submitted for ${category} work with ${priority} priority`,
        need.id,
        'needs'
      );

      navigate(`/needs/${need.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Desired Outcome' },
    { num: 3, label: 'Category' },
    { num: 4, label: 'Priority & Timeline' },
    { num: 5, label: 'Documents' },
    { num: 6, label: 'Review' }
  ];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 text-left">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Submit Your Need</h2>
            <p className="text-xs text-[var(--text-muted)]">Tell us what help you require</p>
          </div>
          <span className="text-xs font-black uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
            Step {step} of 6
          </span>
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
              <FileText size={16} />
              <span className="text-sm font-bold">What do you need help with?</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Need Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Build a volunteer management system"
                className="text-sm"
              />
              {step === 1 && title.length > 0 && title.length < 5 && (
                <p className="text-[10px] text-red-400 mt-1">Title must be at least 5 characters</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Description *
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your need in detail. What specifically do you want to achieve?"
                className="min-h-[120px] text-sm"
              />
              {step === 1 && description.length > 0 && description.length < 20 && (
                <p className="text-[10px] text-red-400 mt-1">Description must be at least 20 characters</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Desired Outcome */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
              <Target size={16} />
              <span className="text-sm font-bold">What should the result look like?</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Desired Outcome *
              </label>
              <textarea
                value={desiredOutcome}
                onChange={e => setDesiredOutcome(e.target.value)}
                placeholder="Describe what success looks like. What will be delivered? What problem will be solved?"
                className="min-h-[150px] text-sm"
              />
            </div>

            <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
              <AlertCircle size={14} className="inline mr-1" />
              Be specific. The clearer you are, the better we can match you with capable members.
            </div>
          </div>
        )}

        {/* Step 3: Category */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
              <Tag size={16} />
              <span className="text-sm font-bold">What category does this fit into?</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${category === cat.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)]'}`}
                >
                  <div className="text-sm font-bold">{cat.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Priority & Timeline */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-up">
            <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
              <Clock size={16} />
              <span className="text-sm font-bold">When do you need this?</span>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Priority Level
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPriority(p.id as 'low' | 'medium' | 'high' | 'urgent')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${priority === p.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)]'}`}
                  >
                    <div className={`text-sm font-bold ${p.color}`}>{p.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Target Timeline
              </label>
              <div className="grid sm:grid-cols-2 gap-2">
                {TIMELINES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeline(t)}
                    className={`p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${timeline === t ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Budget Range (Optional)
              </label>
              <div className="grid sm:grid-cols-2 gap-2">
                {BUDGET_RANGES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setBudgetRange(b.id)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${budgetRange === b.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Documents */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
              <Upload size={16} />
              <span className="text-sm font-bold">Supporting Documents (Optional)</span>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Upload any documents that would help us understand your need better - briefs, examples, requirements documents, etc.
            </p>

            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center">
              <Upload size={32} className="mx-auto text-[var(--text-muted)] mb-2" />
              <p className="text-xs text-[var(--text-muted)]">Drag and drop files here</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">PDF, DOC, PNG, JPG up to 10MB</p>
            </div>

            <p className="text-xs text-[var(--text-muted)] text-center">
              You can skip this step if you don't have documents ready.
            </p>
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-2 text-[var(--primary)] mb-2">
              <Check size={16} />
              <span className="text-sm font-bold">Review Your Submission</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Need Title</div>
                <div className="text-sm font-bold">{title}</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Description</div>
                <div className="text-sm text-[var(--text-secondary)]">{description}</div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)]">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Desired Outcome</div>
                <div className="text-sm text-[var(--text-secondary)]">{desiredOutcome}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Category</div>
                  <div className="text-sm font-bold">{category}</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Priority</div>
                  <div className="text-sm font-bold capitalize">{priority}</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Timeline</div>
                  <div className="text-sm font-bold">{timeline || 'Not specified'}</div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--card-subtle)] border border-[var(--border)]">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Budget</div>
                  <div className="text-sm font-bold">{budgetRange ? BUDGET_RANGES.find(b => b.id === budgetRange)?.title : 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center border-t border-[var(--border)] pt-4 mt-8">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="ghost px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Back
          </button>

          {step === 6 ? (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className="primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1"
            >
              {loading ? 'Submitting...' : 'Submit Need'}
              <Check size={14} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1"
            >
              Continue <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
