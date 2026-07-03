import { useState, useEffect } from 'react';
import { fetchKnowledgeBase } from '../lib/repository';
import type { KnowledgeRecord } from '../types/guild';
import EmptyState from '../components/EmptyState';
import { Search, BookOpen, Tag, Calendar, FileText, ArrowRight, X } from 'lucide-react';
import SEO, { PAGE_SEO } from '../components/SEO';

const KNOWLEDGE_TYPES = ['All', 'playbook', 'lesson', 'successStory', 'template', 'organizationInsight'];

export default function KnowledgeHub() {
  const [docs, setDocs] = useState<KnowledgeRecord[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<KnowledgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeRecord | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [docType, setDocType] = useState('All');

  const formatType = (t: string) => {
    const mapping: Record<string, string> = {
      All: 'All Docs',
      playbook: 'Playbook',
      PLAYBOOK: 'Playbook',
      lesson: 'Lesson Learned',
      LESSON: 'Lesson Learned',
      successStory: 'Success Story',
      SUCCESSSTORY: 'Success Story',
      template: 'Template',
      TEMPLATE: 'Template',
      organizationInsight: 'Organization Insight',
      ORGANIZATIONINSIGHT: 'Organization Insight'
    };
    return mapping[t] || (t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, ' $1'));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchKnowledgeBase();
        setDocs(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let result = docs;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(d => 
        d.title.toLowerCase().includes(searchLower) ||
        d.lessonsLearned?.toLowerCase().includes(searchLower) ||
        d.tags?.some(t => t.toLowerCase().includes(searchLower))
      );
    }
    if (docType !== 'All') {
      result = result.filter(d => d.type === docType);
    }
    setFilteredDocs(result);
  }, [search, docType, docs]);

  return (
    <><SEO {...PAGE_SEO.knowledgeHub} />
    <div className="space-y-8 py-4 text-left max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Guild Knowledge Hub</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Open-source civil intelligence. Read templates, playbooks, and audits submitted by members during quest completions.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="panel bg-[var(--card)] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search input */}
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search playbooks, lessons, tags..."
            className="pl-9 pr-4 py-2 border border-[var(--border)] rounded-xl bg-[var(--input-bg)] text-xs w-full focus:outline-none transition-all placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Filter type selector */}
        <div className="flex gap-2">
          {KNOWLEDGE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setDocType(t)}
              className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${docType === t ? 'bg-[var(--primary)] text-black border-transparent font-bold' : 'border-[var(--border)] hover:border-[var(--border-light)] text-[var(--text-secondary)]'}`}
            >
              {formatType(t)}
            </button>
          ))}
        </div>
      </div>

      {/* List / Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)]">Loading playbooks...</div>
      ) : filteredDocs.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredDocs.map(d => (
            <div key={d.id} className="panel p-5 bg-[var(--card)] border border-[var(--border)] rounded-xl space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-0.5 rounded border border-[var(--primary)]/20">
                  {formatType(d.type)}
                </span>
                <h3 className="text-base font-extrabold line-clamp-1">{d.title}</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-3">
                  {d.lessonsLearned}
                </p>
              </div>

              {/* Tags */}
              {d.tags && d.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {d.tags.map(tag => (
                    <span key={tag} className="text-[9px] text-[var(--text-muted)] font-bold flex items-center gap-0.5 bg-[var(--card-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                      <Tag size={8} /> {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--border)] pt-3 flex justify-between items-center text-xs">
                <span className="text-[var(--text-muted)] flex items-center gap-1"><Calendar size={11} /> Updated {new Date(d.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => setSelectedDoc(d)}
                  className="text-[var(--primary)] font-bold hover:underline flex items-center gap-0.5"
                >
                  Read Document <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No Documents Registered"
          description="We couldn't find any published templates or playbooks matching your query."
          whyItMatters="Playbooks are posted automatically when members submit Quest reports. If no member has published under this tag, the directory remains blank."
          actionText="Clear Filters"
          onAction={() => {
            setSearch('');
            setDocType('All');
          }}
          icon={<BookOpen size={22} />}
        />
      )}

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="panel bg-[var(--card)] border border-[var(--border)] max-w-2xl w-full max-h-[85vh] overflow-y-auto flex flex-col p-6 space-y-4 rounded-2xl animate-fade-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase font-bold text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
                  {formatType(selectedDoc.type)}
                </span>
                <h2 className="text-xl font-extrabold text-[var(--text)] mt-1.5">{selectedDoc.title}</h2>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--card-subtle)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label="Close document"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
              <div>
                <strong className="block text-[var(--text)] font-semibold mb-1">Lessons Learned:</strong>
                <p className="bg-[var(--card-subtle)] p-3.5 rounded-xl border border-[var(--border)] whitespace-pre-wrap">{selectedDoc.lessonsLearned || 'No lessons documented.'}</p>
              </div>

              {selectedDoc.advice && (
                <div>
                  <strong className="block text-[var(--text)] font-semibold mb-1">Advice & Playbook Checklist:</strong>
                  <p className="bg-[var(--card-subtle)] p-3.5 rounded-xl border border-[var(--border)] whitespace-pre-wrap">{selectedDoc.advice}</p>
                </div>
              )}

              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedDoc.tags.map(tag => (
                    <span key={tag} className="text-[9px] text-[var(--text-muted)] font-bold flex items-center gap-0.5 bg-[var(--card-subtle)] px-2 py-0.5 rounded border border-[var(--border)]">
                      <Tag size={8} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedDoc(null)}
                className="secondary px-4 py-2 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div></>
  );
}
