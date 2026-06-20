import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateLedgerRecord } from '../lib/repository';
import { Settings as SettingsIcon, Check, ShieldCheck, Clock, User } from 'lucide-react';
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

  if (!profile) return null;

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

      <div className="grid md:grid-cols-[2fr_1.2fr] gap-6">
        
        {/* Settings Form */}
        <div className="panel space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
            <User size={16} className="text-[var(--primary)]" />
            Personal Profile Parameters
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
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
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Development Path</label>
              <select
                value={path}
                onChange={e => setPath(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg p-2.5 text-xs cursor-pointer"
              >
                {PATHS.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
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
