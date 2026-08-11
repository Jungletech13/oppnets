import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, EmptyState, Avatar, Modal, Field } from '@/components/ui';
import { Search, MapPin, ShieldCheck, Building2, Plus, Bookmark, BookmarkCheck, AlertCircle } from 'lucide-react';
import { COMPANIES as DEMO_COMPANIES } from '@/data-phase2';
import { fetchCompanies, createCompany, fetchSavedListings, toggleSavedListing } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import { mapCompanyRow } from '@/lib/domain-mappers';
import { isE2EMode } from '@/lib/runtime';
import type { Company, CompanySize } from '@/types';

const SIZES: (CompanySize | 'All')[] = ['All', '1-10', '11-50', '51-200', '201-500', '500+'];

export function CompaniesPage() {
  const { navigate } = useApp();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [size, setSize] = useState<CompanySize | 'All'>('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dbCompanies, setDbCompanies] = useState<Company[]>(isE2EMode ? DEMO_COMPANIES : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isE2EMode) {
      setDbCompanies(DEMO_COMPANIES);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchCompanies();
      const mapped = (data || []).map((row) => mapCompanyRow(row as Record<string, unknown>));
      setDbCompanies(mapped);
      if (session) {
        const saved = await fetchSavedListings();
        setSavedIds(new Set((saved ?? []).filter((row) => row.listing_type === 'company').map((row) => row.listing_id)));
      }
    } catch {
      setError('Could not load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const allCompanies = dbCompanies;

  const filtered = allCompanies.filter((c) => {
    if (size !== 'All' && c.size !== size) return false;
    if (verifiedOnly && !c.verified) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.services.some((s) => s.toLowerCase().includes(q));
    }
    return true;
  });

  const handleSave = async (coId: string) => {
    if (!session) return;
    try {
      const result = await toggleSavedListing('company', coId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (result.saved) next.add(coId);
        else next.delete(coId);
        return next;
      });
    } catch { /* ignore */ }
  };

  return (
    <div>
      <PageHeader title="Company Directory" subtitle="Discover verified companies, their teams, and open opportunities." />

      {session && (
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mb-5"><Plus className="w-4 h-4" /> Create company page</button>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-warning-700 bg-warning-50 rounded-lg p-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input className="input pl-9" placeholder="Search by name, service, or keyword..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={size} onChange={(e) => setSize(e.target.value as CompanySize | 'All')}>
          {SIZES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly(!verifiedOnly)} className={`min-h-11 text-xs rounded-full px-3 py-1.5 border transition-colors ${verifiedOnly ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200'}`}>Verified only</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-pulse bg-ink-100 rounded-xl h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Building2 className="w-5 h-5" />} title="No companies found" description="Try adjusting your filters." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="relative">
              {session && (
                <button aria-label={savedIds.has(c.id) ? `Remove ${c.name} from saved listings` : `Save ${c.name}`} onClick={(e) => { e.stopPropagation(); handleSave(c.id); }} className="absolute top-1 right-1 z-10 min-w-11 min-h-11 flex items-center justify-center bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors">
                  {savedIds.has(c.id) ? <BookmarkCheck className="w-4 h-4 text-brand-600" /> : <Bookmark className="w-4 h-4 text-ink-400" />}
                </button>
              )}
              <button onClick={() => navigate({ name: 'company', companyId: c.id })} className="text-left w-full">
                <Card className="p-4 h-full hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar src={c.logoUrl} name={c.name} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-ink-900 truncate">{c.name}</h3>
                        {c.verified && <ShieldCheck className="w-4 h-4 text-accent-600 shrink-0" />}
                      </div>
                      <p className="text-xs text-ink-500">{c.size} employees</p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-ink-500"><MapPin className="w-3 h-3" /> {c.location}</div>
                    </div>
                  </div>
                  <p className="text-xs text-ink-600 line-clamp-2 mb-3">{c.description}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {c.services.slice(0, 3).map((s) => <span key={s} className="text-xs bg-ink-50 text-ink-600 rounded-full px-2 py-0.5">{s}</span>)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ink-500">
                    {c.opportunityIds.length > 0 && <Badge tone="accent">{c.opportunityIds.length} open opportunit{c.opportunityIds.length === 1 ? 'y' : 'ies'}</Badge>}
                  </div>
                </Card>
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={loadCompanies} />}
    </div>
  );
}

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mission, setMission] = useState('');
  const [services, setServices] = useState('');
  const [industries, setIndustries] = useState('');
  const [size, setSize] = useState<CompanySize>('1-10');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createCompany({
        name,
        description,
        mission,
        services: services.split(',').map((s) => s.trim()).filter(Boolean),
        industries: industries.split(',').map((s) => s.trim()).filter(Boolean),
        size,
        location,
        website,
        contact_info: contactInfo,
      });
      onCreated();
      onClose();
    } catch {
      setError('Could not create your company page. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Create company page">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="flex items-center gap-2 text-sm text-error-700 bg-error-50 rounded-lg p-3"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        <Field label="Company name" required>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Bright & Co Cleaning" />
        </Field>
        <Field label="Description" required>
          <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Describe your company..." />
        </Field>
        <Field label="Mission">
          <input className="input" value={mission} onChange={(e) => setMission(e.target.value)} placeholder="Your company mission..." />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Services (comma-separated)">
            <input className="input" value={services} onChange={(e) => setServices(e.target.value)} placeholder="Cleaning, Renovation..." />
          </Field>
          <Field label="Industries (comma-separated)">
            <input className="input" value={industries} onChange={(e) => setIndustries(e.target.value)} placeholder="Real Estate, Technology..." />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Size">
            <select className="input" value={size} onChange={(e) => setSize(e.target.value as CompanySize)}>
              {SIZES.filter((s) => s !== 'All').map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Website">
            <input type="url" className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Contact info">
            <input className="input" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="hello@company.com" />
          </Field>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Creating...' : 'Create company page'}</button>
        </div>
      </form>
    </Modal>
  );
}
