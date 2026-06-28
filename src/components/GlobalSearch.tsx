import { useState, useEffect, useRef } from 'react';
import { Search, Compass, Building, User, BookOpen, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { fetchUserDirectory, fetchOrgDirectory } from '../lib/repository';
import { ecosystemLinks } from '../lib/ecosystemLinks';

interface SearchResult {
  id: string;
  type: 'quest' | 'organization' | 'profile' | 'document';
  title: string;
  subtitle: string;
  url: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const output: SearchResult[] = [];
      const searchLower = term.toLowerCase();

      try {
        // OPTIMIZED: Use where clauses to filter on server side, then client-side match for more specific results
        // Query Quests - filter by archiveStatus first
        const questSnap = await getDocs(query(
          collection(db, 'quests'),
          where('archiveStatus', '==', 'active'),
          limit(20)
        ));
        questSnap.docs.forEach(doc => {
          const d = doc.data();
          if (d.title?.toLowerCase().includes(searchLower) || d.description?.toLowerCase().includes(searchLower)) {
            output.push({
              id: doc.id,
              type: 'quest',
              title: d.title,
              subtitle: `Quest - ${d.category || 'General'}`,
              url: `/quests/${doc.id}`
            });
          }
        });

        // OPTIMIZED: Use organizationDirectory instead of full organizations collection
        const orgDir = await fetchOrgDirectory(undefined, 20);
        orgDir.forEach(org => {
          if (org.name?.toLowerCase().includes(searchLower)) {
            output.push({
              id: org.id,
              type: 'organization',
              title: org.name,
              subtitle: `Organization - ${org.category || 'General'}${org.branchName ? ` - ${org.branchName}` : ''}`,
              url: `/organizations`
            });
          }
        });

        // OPTIMIZED: Use userDirectory instead of full users collection
        const userDir = await fetchUserDirectory(undefined, 20);
        userDir.forEach(user => {
          if (user.fullName?.toLowerCase().includes(searchLower)) {
            output.push({
              id: user.uid,
              type: 'profile',
              title: user.fullName,
              subtitle: `Member - Rank ${user.guildRank || 'Applicant'} - ${user.branchName || 'No branch'}`,
              url: ecosystemLinks.passport(user.uid)
            });
          }
        });

        // Query Docs / Knowledge Base - filter by status
        const kbSnap = await getDocs(query(
          collection(db, 'knowledgeBase'),
          where('status', '==', 'published'),
          limit(20)
        ));
        kbSnap.docs.forEach(doc => {
          const d = doc.data();
          if (d.title?.toLowerCase().includes(searchLower) || d.lessonsLearned?.toLowerCase().includes(searchLower)) {
            output.push({
              id: doc.id,
              type: 'document',
              title: d.title,
              subtitle: `Knowledge Hub - ${d.type || 'Lesson'}`,
              url: `/docs#${doc.id}`
            });
          }
        });

        // Limit final results
        setResults(output.slice(0, 10));

      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [term]);

  return (
    <div className="relative w-full max-w-md">
      {/* Search Input Trigger */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Global search (quests, orgs, skills, docs)..."
          onClick={() => setIsOpen(true)}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setIsOpen(true);
          }}
          className="pl-9 pr-4 py-2 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-xs w-full focus:outline-none transition-all placeholder:text-[var(--text-muted)]"
        />
        {term && (
          <button onClick={() => setTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Results Panel */}
      {isOpen && (term.trim().length > 0 || results.length > 0) && (
        <div
          ref={modalRef}
          className="absolute left-0 right-0 mt-2 bg-[var(--card)] border border-[var(--border-light)] rounded-xl shadow-lg z-50 p-3 max-h-[360px] overflow-y-auto backdrop-blur-xl bg-opacity-96 text-left"
        >
          {searching ? (
            <div className="p-4 text-center text-xs text-[var(--text-muted)] font-semibold">
              Searching database...
            </div>
          ) : results.length > 0 ? (
            <div className="grid gap-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-muted)] px-2 pb-1.5 block">Search Results</span>
              {results.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.url}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--card-subtle)] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--card-subtle)] text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:bg-[var(--card)] flex items-center justify-center border border-[var(--border)] transition-all">
                    {item.type === 'quest' && <Compass size={14} />}
                    {item.type === 'organization' && <Building size={14} />}
                    {item.type === 'profile' && <User size={14} />}
                    {item.type === 'document' && <BookOpen size={14} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text)]">{item.title}</div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.subtitle}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              No matching records found. Try another query.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
