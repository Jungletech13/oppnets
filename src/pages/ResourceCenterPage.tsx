import { useState } from 'react';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, EmptyState } from '@/components/ui';
import { BookOpen, ArrowLeft, Clock, ChevronRight, Search } from 'lucide-react';
import { RESOURCE_ARTICLES, getResourceBySlug } from '@/data-phase2';
import type { ResourceCategory } from '@/types';

const CATEGORIES: (ResourceCategory | 'All')[] = [
  'All', 'Finding Partners', 'Starting Up', 'Checklists', 'Business Formation', 'Real Estate Investing', 'Grant Resources',
];

export function ResourceCenterPage({ initialSlug }: { initialSlug?: string }) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug ?? null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ResourceCategory | 'All'>('All');

  const selected = selectedSlug ? getResourceBySlug(selectedSlug) : null;

  if (selected) {
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setSelectedSlug(null)} className="btn-ghost text-sm mb-4"><ArrowLeft className="w-4 h-4" /> Back to Resource Center</button>

        <Badge tone="brand">{selected.category}</Badge>
        <h1 className="text-2xl font-bold text-ink-900 mt-3 mb-2">{selected.title}</h1>
        <div className="flex items-center gap-3 text-xs text-ink-500 mb-5">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selected.readTime}</span>
          <span>{new Date(selected.publishedAt).toLocaleDateString()}</span>
          <span>by {selected.authorName}</span>
        </div>

        <Card className="p-6">
          <div className="prose prose-sm max-w-none">
            {selected.content.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-ink-900 mt-5 mb-2">{line.slice(3)}</h2>;
              if (line.startsWith('- [ ] ')) return <div key={i} className="flex items-center gap-2 text-sm text-ink-700 ml-4 my-1"><span className="w-4 h-4 border-2 border-ink-300 rounded" /> {line.slice(6)}</div>;
              if (line.trim() === '') return <div key={i} className="h-3" />;
              return <p key={i} className="text-sm text-ink-700 leading-relaxed">{line}</p>;
            })}
          </div>
        </Card>

        <h2 className="text-sm font-semibold text-ink-900 mt-6 mb-3">More Resources</h2>
        <div className="space-y-2">
          {RESOURCE_ARTICLES.filter((a) => a.slug !== selected.slug).slice(0, 4).map((a) => (
            <button key={a.id} onClick={() => setSelectedSlug(a.slug)} className="w-full text-left flex items-center gap-3 p-3 rounded-lg hover:bg-ink-50">
              <BookOpen className="w-4 h-4 text-brand-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{a.title}</p>
                <p className="text-xs text-ink-500 truncate">{a.excerpt}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-400" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const filtered = RESOURCE_ARTICLES.filter((a) => {
    if (category !== 'All' && a.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <PageHeader title="Resource Center" subtitle="Practical guides and checklists to help you find partners, start ventures, and grow." />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input className="input pl-9" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${category === c ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200 hover:border-brand-300'}`}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-5 h-5" />} title="No articles found" description="Try a different search or category." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelectedSlug(a.slug)} className="text-left">
              <Card className="p-4 h-full hover:shadow-md transition-shadow">
                <Badge tone="neutral">{a.category}</Badge>
                <h3 className="text-sm font-semibold text-ink-900 mt-2 mb-1">{a.title}</h3>
                <p className="text-xs text-ink-600 line-clamp-3 mb-3">{a.excerpt}</p>
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <Clock className="w-3 h-3" /> {a.readTime}
                  <span>·</span>
                  <span>{new Date(a.publishedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
