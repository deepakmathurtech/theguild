import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateLedgerRecord } from '../../lib/repository';
import { ChevronRight, ChevronLeft, Check, Compass, Award, Rocket, Code, Edit2, Users, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PATHS = [
  { id: 'builder', title: 'Builder', desc: 'Engineers, coders, makers, designers', icon: <Code size={18} /> },
  { id: 'creator', title: 'Creator', desc: 'Writers, artists, video makers, designers', icon: <Edit2 size={18} /> },
  { id: 'researcher', title: 'Researcher', desc: 'Scientists, data analysts, academics', icon: <Compass size={18} /> },
  { id: 'entrepreneur', title: 'Entrepreneur', desc: 'Startups, venture creators, innovators', icon: <Rocket size={18} /> },
  { id: 'operator', title: 'Operator', desc: 'Project managers, detail planners, executioners', icon: <Award size={18} /> },
  { id: 'leader', title: 'Leader', desc: 'Community organizers, team mentors', icon: <Users size={18} /> },
  { id: 'explorer', title: 'Explorer', desc: 'General contributors seeking opportunities', icon: <Compass size={18} /> }
];

const SKILL_OPTIONS = [
  'React', 'TypeScript', 'Node.js', 'Firebase', 'PostgreSQL', 'Python', 'UI Design', 'Copywriting', 
  'Content Strategy', 'Video Editing', 'Market Research', 'Project Management', 'Agile Operations',
  'Public Speaking', 'Community Moderation', 'Data Analysis', 'Financial Modeling', 'Pitching'
];

export default function MemberOnboarding() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [path, setPath] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>([]);
  const [availability, setAvailability] = useState('10-20 hours/week');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('ludhiana-hq');

  // Goals handler
  const toggleGoal = (goal: string) => {
    setGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };

  // Skills handler
  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  // Skills to Learn handler
  const toggleLearnSkill = (skill: string) => {
    setSkillsToLearn(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handleNext = () => {
    if (step < 8) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const branchMapping: Record<string, string> = {
        'ludhiana-hq': 'The Guild - Ludhiana',
        'punjab-state': 'The Guild - Punjab',
        'delhi-hq': 'The Guild - Delhi NCR'
      };

      await updateLedgerRecord(
        'users',
        profile.uid,
        {
          pathSelected: path,
          goals,
          skills,
          skillsToLearn,
          availability,
          bio,
          phone,
          onboardingStep: 8,
          onboardingCompleted: true,
          'jurisdiction.guildBranchId': branch,
          'jurisdiction.guildBranchName': branchMapping[branch] || 'The Guild - Ludhiana',
          activityHistory: [...(profile.activityHistory || []), 'Completed Onboarding Process']
        },
        profile,
        'Member Onboarding Complete'
      );
      navigate('/');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="grid md:grid-cols-[280px_1fr] gap-8 wizard-shell bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-lg min-h-[500px]">
        {/* Steps Sidebar Indicator */}
        <div className="border-r border-[var(--border)] pr-6 flex flex-col justify-between">
          <div className="grid gap-2">
            <h3 className="text-left text-sm font-black uppercase tracking-wider text-[var(--primary)] mb-4">Onboarding Progress</h3>
            {[
              'Welcome', 'Choose Path', 'Set Goals', 'Current Skills', 'Skills to Learn', 'Availability', 'Bio & Branch', 'Complete'
            ].map((label, idx) => {
              const currentStep = idx + 1;
              const isActive = step === currentStep;
              const isCompleted = step > currentStep;
              return (
                <button
                  key={label}
                  disabled={currentStep > step}
                  onClick={() => setStep(currentStep)}
                  className="wizard-step-button"
                  aria-current={isActive ? 'step' : undefined}
                  data-complete={isCompleted}
                >
                  <div className="wizard-step-marker">{currentStep}</div>
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
          
          <div className="text-[10px] text-[var(--text-muted)] font-medium leading-relaxed mt-4 pt-4 border-t border-[var(--border)]">
            "A civilization where each generation starts stronger than the previous one."
          </div>
        </div>

        {/* Dynamic Wizard Body */}
        <div className="flex flex-col justify-between min-h-[420px] text-left animate-fade-up" key={step}>
          <div>
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Welcome to the Guild Growth Engine</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  We exist to ensure human potential is not wasted. Guild helps members become more capable, connected, and useful through hands-on quests, verified outcomes, and organization-backed proof of work.
                </p>
                <div className="p-4 rounded-xl bg-[var(--card-subtle)] border border-[var(--border)] mt-4">
                  <span className="text-[10px] uppercase font-bold text-[var(--primary)] tracking-widest block mb-2">Guild Ethics code</span>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    By entering the Guild, you agree to build real skills, act honorably, document your contributions, and collaborate with receptionists and organizations to drive civil development.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Choose Path */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Choose Your Development Path</h2>
                <p className="text-sm text-[var(--text-secondary)]">Select a starting path. You can always change this later in settings.</p>
                <div className="grid gap-3 mt-4">
                  {PATHS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPath(p.id)}
                      className={`flex gap-4 items-center p-3.5 rounded-xl border text-left cursor-pointer transition-all ${path === p.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)]'}`}
                    >
                      <div className={`p-2.5 rounded-lg border ${path === p.id ? 'border-[var(--primary)]/30 bg-[var(--primary)]/15 text-[var(--primary)]' : 'border-[var(--border)] bg-[var(--card-subtle)]'}`}>
                        {p.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold">{p.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{p.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Goals */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">What are your primary goals?</h2>
                <p className="text-sm text-[var(--text-secondary)]">Choose one or more areas you want to concentrate on.</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  {[
                    'Learn Practical Engineering',
                    'Gain Management Experience',
                    'Build Portfolio Projects',
                    'Expand Local Connections',
                    'Contribute to Non-Profits',
                    'Explore Technical Research',
                    'Earn Revenue from Quests',
                    'Find Mentors and Partners'
                  ].map(goal => {
                    const isSelected = goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        onClick={() => toggleGoal(goal)}
                        className={`p-4 rounded-xl border text-left cursor-pointer text-sm font-semibold transition-all ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--text)] font-bold' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Skills */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Select your current skills</h2>
                <p className="text-sm text-[var(--text-secondary)]">These will show on your profile as verified assets once proved.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SKILL_OPTIONS.map(skill => {
                    const isSelected = skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${isSelected ? 'bg-[var(--primary)] text-black border-transparent font-bold' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Skills To Learn */}
            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Skills you want to learn</h2>
                <p className="text-sm text-[var(--text-secondary)]">We will highlight quests that teach or verify these capabilities.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SKILL_OPTIONS.map(skill => {
                    const isSelected = skillsToLearn.includes(skill);
                    return (
                      <button
                        key={skill}
                        onClick={() => toggleLearnSkill(skill)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${isSelected ? 'bg-[var(--accent)] text-black border-transparent font-bold' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 6: Availability */}
            {step === 6 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Define your weekly availability</h2>
                <p className="text-sm text-[var(--text-secondary)]">This helps matching engines suggest suitable timelines.</p>
                <div className="grid gap-3 mt-4">
                  {['Less than 5 hours/week', '5-10 hours/week', '10-20 hours/week', '20-40 hours/week', 'Full time involvement'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAvailability(opt)}
                      className={`p-4 rounded-xl border text-left text-sm font-semibold cursor-pointer transition-all ${availability === opt ? 'border-[var(--primary)] bg-[var(--primary)]/5 font-bold' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 7: Profile Creation & Branch Selection */}
            {step === 7 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Select Branch & Tell Us About Yourself</h2>
                <p className="text-sm text-[var(--text-secondary)]">Select your local Guild Chapter and write a short introductory bio.</p>
                
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Federation Branch</label>
                    <select
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-2.5 text-sm"
                    >
                      <option value="ludhiana-hq">The Guild - Ludhiana (Punjab)</option>
                      <option value="punjab-state">The Guild - Punjab (Chandigarh HQ)</option>
                      <option value="delhi-hq">The Guild - Delhi NCR (Capital HQ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Bio Introduction</label>
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Share your goals, previous projects, or what you are excited about building in the Guild..."
                      className="min-h-[100px] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Contact Phone (Optional)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 99999-99999"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Recommended Quests preview */}
            {step === 8 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">You are ready to enter the Guild!</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                  Based on your choice as a <strong className="text-[var(--text)] font-semibold">{path}</strong>, your local branch coordinator will review your profile to assign your initial Quest matching.
                </p>
                
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-left flex gap-3 items-start mt-4">
                  <div className="p-1 rounded bg-emerald-500 text-black">
                    <Check size={14} />
                  </div>
                  <div>
                    <strong className="text-xs text-emerald-400 font-bold block mb-0.5">ONBOARDING PREPARATION COMPLETE</strong>
                    <span className="text-xs text-[var(--text-secondary)]">Your growth progress scorecard, reputation index, and proof matrix are initialized.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between items-center border-t border-[var(--border)] pt-4 mt-6">
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className="ghost flex gap-1 items-center px-4 py-2 rounded-xl text-xs"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            {step === 8 ? (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="primary flex gap-1.5 items-center px-6 py-2.5 rounded-xl font-bold"
              >
                <span>{loading ? 'Initializing Profile...' : 'Complete & Go to Dashboard'}</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={step === 2 && !path}
                className="primary flex gap-1.5 items-center px-6 py-2.5 rounded-xl font-bold"
              >
                <span>Continue</span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
