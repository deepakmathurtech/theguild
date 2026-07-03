import { useState, useEffect } from 'react';
import SEO, { PAGE_SEO } from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { fetchQuests } from '../lib/repository';
import type { Quest } from '../types/guild';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { Search, MapPin, Award, Compass, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 12;

const CATEGORIES = ['All', 'builder', 'creator', 'researcher', 'entrepreneur', 'operator', 'leader'];
const DIFFICULTIES = ['All', 'easy', 'medium', 'hard', 'legendary'];
const MODES = ['All', 'Remote', 'Physical', 'Hybrid'];
const QUEST_TYPES = ['All', 'standard', 'openSource'];

export default function QuestBoard() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [filteredQuests, setFilteredQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [mode, setMode] = useState('All');
  const [questType, setQuestType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchQuests();
        setQuests(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper: Check if user can view "assigned" status quests (participants + staff)
  const canViewAssignedQuest = (quest: Quest) => {
    if (!profile) return false;
    // User is assigned member - can view their own quests
    if (quest.acceptedMembers?.includes(profile.uid)) return true;
    // Staff roles can view
    const staffRoles = ['receptionist', 'cityGuildMaster', 'stateGuildMaster', 'centralGuildMaster', 'nationalGuildMaster', 'guildFounder', 'founder'];
    if (staffRoles.includes(profile.role)) return true;
    return false;
  };

  // Filter logic - show only open quests (not in progress/completed/closed/archived)
  // Hide "assigned" quests from public - only show to participants and staff
  useEffect(() => {
    let result = quests.filter(q => {
      if (!q.status) return false;
      // Show open and underReview to everyone
      if (['open', 'underReview'].includes(q.status)) return true;
      // Show assigned only to participants and staff
      if (q.status === 'assigned') return canViewAssignedQuest(q);
      return false;
    });

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(q => 
        q.title.toLowerCase().includes(searchLower) || 
        q.description.toLowerCase().includes(searchLower) ||
        q.requiredSkills?.some(s => s.toLowerCase().includes(searchLower))
      );
    }
    if (category !== 'All') {
      result = result.filter(q => q.category?.toLowerCase() === category.toLowerCase());
    }
    if (difficulty !== 'All') {
      result = result.filter(q => q.difficulty?.toLowerCase() === difficulty.toLowerCase());
    }
    if (mode !== 'All') {
      result = result.filter(q => q.mode?.toLowerCase() === mode.toLowerCase());
    }
    // Filter by quest type (Phase 2 Open Source: standard vs openSource)
    if (questType !== 'All') {
      result = result.filter(q => (q.questType || 'standard') === questType);
    }

    setFilteredQuests(result);
    setCurrentPage(1);
  }, [search, category, difficulty, mode, questType, quests]);

  // Pagination
  const totalPages = Math.ceil(filteredQuests.length / ITEMS_PER_PAGE);
  const paginatedQuests = filteredQuests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <><SEO {...PAGE_SEO.quests} />
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Active Quest Board</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Find verified work, apply with intent, earn XP, and strengthen your Guild Passport with every approved contribution.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="panel bg-[var(--card)] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quests, skills..."
            className="pl-9 pr-4 py-2 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-xs w-full focus:outline-none transition-all placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Category Select */}
          <div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--input-bg)] select-none cursor-pointer"
            >
              <option disabled>Category</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Paths' : (c.charAt(0).toUpperCase() + c.slice(1))}</option>
              ))}
            </select>
          </div>

          {/* Difficulty Select */}
          <div>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--input-bg)] cursor-pointer"
            >
              <option disabled>Difficulty</option>
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>{d === 'All' ? 'All Difficulties' : (d.charAt(0).toUpperCase() + d.slice(1))}</option>
              ))}
            </select>
          </div>

          {/* Mode Select */}
          <div>
            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              className="px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--input-bg)] cursor-pointer"
            >
              <option disabled>Mode</option>
              {MODES.map(m => (
                <option key={m} value={m}>{m === 'All' ? 'All Modes' : m}</option>
              ))}
            </select>
          </div>

          {/* Quest Type Select (Phase 2: Open Source) */}
          <div>
            <select
              value={questType}
              onChange={e => setQuestType(e.target.value)}
              className="px-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--input-bg)] cursor-pointer"
            >
              <option disabled>Quest Type</option>
              {QUEST_TYPES.map(t => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Types' : t === 'openSource' ? 'Open Source' : 'Standard'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quest Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] font-semibold">
          Loading active quests...
        </div>
      ) : filteredQuests.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {paginatedQuests.map(q => {
            const hasApplied = profile && q.applicants?.includes(profile.uid);
            return (
              <div key={q.id} className="panel flex flex-col justify-between space-y-4 card-premium">
                <div className="space-y-3">

                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-0.5 rounded border border-[var(--primary)]/20">
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--card-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                        {q.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-semibold flex items-center gap-1">
                      <MapPin size={10} className="text-[var(--primary)]" />
                      {q.mode}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold line-clamp-1">{q.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3 mt-1.5">{q.description}</p>
                  </div>

                  {q.requiredSkills && q.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {q.requiredSkills.slice(0, 3).map(s => (
                        <span key={s} className="text-[9px] text-[var(--text-muted)] font-semibold bg-[var(--card-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                          {s}
                        </span>
                      ))}
                      {q.requiredSkills.length > 3 && (
                        <span className="text-[9px] text-[var(--text-muted)] font-semibold bg-[var(--card-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                          +{q.requiredSkills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--border)] pt-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-4">
                    <span className="font-bold flex items-center gap-1 text-[var(--primary)]">
                      <Award size={13} />
                      {q.reputationPoints} Rep
                    </span>
                    {q.isPaid && q.paymentAmount && (
                      <span className="font-bold flex items-center gap-0.5 text-emerald-400">
                        INR {q.paymentAmount}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/quests/${q.id}`}
                    className="btn-premium btn-premium-secondary focus-ring-premium px-4 py-1.5 rounded-lg text-xs font-bold touch-target"
                  >
                    {hasApplied ? 'View Your Application' : 'View Details'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Quests Found"
          description="We couldn't find any active quests matching your search query or filter selection."
          whyItMatters="The Quest Board updates dynamically as local organizations post operations. If filters are too restrictive, opportunities will be hidden."
          actionText="Clear Filters"
          onAction={() => {
            setSearch('');
            setCategory('All');
            setDifficulty('All');
            setMode('All');
          }}
          icon={<Compass size={22} />}
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--text-muted)]">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredQuests.length)} of {filteredQuests.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card-subtle)] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${currentPage === page ? 'bg-[var(--primary)] text-black' : 'border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card-subtle)]'}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card-subtle)] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div></>
  );
}
