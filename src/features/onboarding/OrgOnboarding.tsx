import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createLedgerRecord, RECEPTIONISTS } from '../../lib/repository';
import { Building, ChevronRight, Check, ShieldCheck, Mail, Phone, Users, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Organization } from '../../types/guild';

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

export default function OrgOnboarding() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [orgType, setOrgType] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Ludhiana');
  const [branch, setBranch] = useState('ludhiana-hq');

  // Matched Receptionist (assigned relationship manager)
  const matchedReceptionist = RECEPTIONISTS[Math.floor(Math.random() * RECEPTIONISTS.length)];

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const selectedTypeConfig = ORG_TYPES.find(o => o.id === orgType);
      const servicesMatched = selectedTypeConfig ? selectedTypeConfig.services : [];

      const orgData: Omit<Organization, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'archiveStatus' | 'jurisdiction'> = {
        name,
        searchName: name.toLowerCase(),
        category: orgType as any,
        contactPerson,
        email,
        phone,
        city,
        description,
        needs: servicesMatched,
        opportunities: [],
        currentStatus: 'new',
        ownerId: profile.uid,
        trustLevel: 'new',
        relationshipNotes: `Assigned automatically during onboarding matching to receptionist: ${matchedReceptionist.fullName}`,
        assignedReceptionistId: matchedReceptionist.uid
      };

      await createLedgerRecord<Organization>(
        'organizations',
        orgData as any,
        profile,
        `Created organization: ${name} (matched with ${matchedReceptionist.fullName})`
      );

      navigate('/organizations');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeObj = ORG_TYPES.find(o => o.id === orgType);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-left">
      <div className="wizard-shell bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-lg">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 mb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Register Organization</h2>
            <p className="text-xs text-[var(--text-muted)]">Scale your projects and find qualified execution assistance</p>
          </div>
          <span className="text-xs font-black uppercase text-[var(--primary)] bg-[var(--primary)]/10 px-3 py-1 rounded-full border border-[var(--primary)]/20">
            Step {step} of 3
          </span>
        </div>

        {/* Step 1: Type Selection */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-up">
            <h3 className="text-lg font-bold">Select Organization Category</h3>
            <p className="text-sm text-[var(--text-secondary)]">Based on this selection, we will tailor the suggested Guild developer cohorts, volunteers, and services.</p>
            
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {ORG_TYPES.map(o => (
                <button
                  key={o.id}
                  onClick={() => setOrgType(o.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between h-[120px] ${orgType === o.id ? 'border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]' : 'border-[var(--border)] hover:border-[var(--border-light)]'}`}
                >
                  <div className="text-sm font-bold flex justify-between items-center w-full">
                    {o.title}
                    {orgType === o.id && <Check size={14} className="text-[var(--primary)]" />}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Information form */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-up">
            <h3 className="text-lg font-bold">Enter Details for {orgType}</h3>
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Organization Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ludhiana Tech Builders"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your organization's core projects, mission, and how Guild members can contribute..."
                  className="min-h-[100px] text-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="Jane Doe"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 required">Contact Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contact@org.org"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Federation Branch Base</label>
                  <select
                    value={branch}
                    onChange={e => {
                      setBranch(e.target.value);
                      const mapping: Record<string, string> = { 'ludhiana-hq': 'Ludhiana', 'punjab-state': 'Chandigarh', 'delhi-hq': 'Delhi' };
                      setCity(mapping[e.target.value] || 'Ludhiana');
                    }}
                    className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-2.5 text-sm"
                  >
                    <option value="ludhiana-hq">The Guild - Ludhiana (Punjab)</option>
                    <option value="punjab-state">The Guild - Punjab (Chandigarh)</option>
                    <option value="delhi-hq">The Guild - Delhi NCR</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Matchmaking Receptionist and Services overview */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-up">
            <h3 className="text-lg font-bold">Relationship Match & Guild Services</h3>
            <p className="text-sm text-[var(--text-secondary)]">Your organization has been matched with a Guild Relationship Manager for direct collaboration.</p>
            
            {/* Receptionist detail */}
            <div className="p-5 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 mt-4 flex gap-4 items-center">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-[var(--primary)]/30 bg-black flex-shrink-0">
                <img src={matchedReceptionist.photoURL} alt={matchedReceptionist.fullName} className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--primary)] tracking-widest block mb-0.5">Assigned Relationship Manager</span>
                <strong className="text-base font-extrabold text-[var(--text)] block">{matchedReceptionist.fullName}</strong>
                <span className="text-xs text-[var(--text-muted)] font-medium block mb-2">{matchedReceptionist.role}</span>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1 text-[var(--text-secondary)]"><Mail size={12} /> {matchedReceptionist.email}</span>
                  <span className="flex items-center gap-1 text-[var(--text-secondary)]"><Phone size={12} /> {matchedReceptionist.phone}</span>
                </div>
              </div>
            </div>

            {/* Matched Services */}
            <div className="space-y-2.5 mt-6">
              <strong className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">Tailored Services Ready to Deploy:</strong>
              <div className="grid gap-2">
                {selectedTypeObj?.services.map(service => (
                  <div key={service} className="flex gap-2.5 items-center bg-[var(--card-subtle)] p-2.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                    <Check size={14} className="text-emerald-500" />
                    <span>{service}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between items-center border-t border-[var(--border)] pt-4 mt-8">
          <button
            onClick={handlePrev}
            disabled={step === 1}
            className="ghost px-4 py-2 rounded-xl text-xs flex items-center gap-1.5"
          >
            Back
          </button>
          
          {step === 3 ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="primary px-6 py-2.5 rounded-xl font-bold text-xs"
            >
              {loading ? 'Registering Org...' : 'Confirm & Open Org Space'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !orgType) || (step === 2 && (!name || !description || !contactPerson || !email))}
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
