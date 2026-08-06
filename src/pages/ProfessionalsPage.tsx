import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, EmptyState, Avatar, Modal, Field } from '@/components/ui';
import { Search, MapPin, Star, ShieldCheck, Sparkles, Store, Plus, Bookmark, BookmarkCheck, AlertCircle } from 'lucide-react';
import { PROFESSIONALS as DEMO_PROFESSIONALS } from '@/data-phase2';
import { fetchProfessionals, createProfessional, toggleSavedListing, isListingSaved } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import type { Professional, ProfessionalCategory } from '@/types';

const CATEGORIES: (ProfessionalCategory | 'All')[] = [
  'All', 'Attorney', 'CPA', 'Bookkeeper', 'Marketing Agency', 'Designer', 'Developer',
  'Contractor', 'Architect', 'Engineer', 'Insurance Professional', 'Business Consultant',
  'HR Firm', 'Payroll Provider', 'Lender', 'Grant Writer', 'Financial Advisor',
  'Commercial Real Estate Agent', 'Manufacturer', 'Logistics Provider', 'Other',
];

interface DbProfessional extends Professional {
  professional_reviews?: Professional['reviews'];
}

export function ProfessionalsPage() {
  const { navigate } = useApp();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProfessionalCategory | 'All'>('All');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dbPros, setDbPros] = useState<DbProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const loadProfessionals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfessionals();
      const mapped: DbProfessional[] = (data || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        businessName: r.business_name as string,
        logoUrl: (r.logo_url as string) || '',
        category: r.category as ProfessionalCategory,
        description: (r.description as string) || '',
        services: (r.services as string[]) || [],
        industriesServed: (r.industries_served as string[]) || [],
        location: (r.location as string) || '',
        remote: (r.remote as boolean) ?? true,
        portfolio: (r.portfolio as Professional['portfolio']) || [],
        certifications: (r.certifications as string[]) || [],
        website: (r.website as string) || '',
        yearsInBusiness: (r.years_in_business as number) || 1,
        contactMethods: (r.contact_methods as string[]) || [],
        responseTime: (r.response_time as string) || 'Within 24 hours',
        pricingModel: (r.pricing_model as Professional['pricingModel']) || 'Contact for quote',
        availability: (r.availability as Professional['availability']) || 'Available',
        reviews: (r.professional_reviews as Professional['reviews']) || [],
        verified: (r.verified as boolean) ?? false,
        premium: (r.premium as boolean) ?? false,
        sponsored: (r.sponsored as boolean) ?? false,
        ownerId: (r.owner_id as string) || '',
      }));
      setDbPros(mapped);
      if (session) {
        const saved = new Set<string>();
        for (const p of mapped) {
          if (await isListingSaved('professional', p.id)) saved.add(p.id);
        }
        setSavedIds(saved);
      }
    } catch {
      setError('Could not load professionals. Showing demo data instead.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  const allPros = [...dbPros, ...DEMO_PROFESSIONALS.filter((dp) => !dbPros.some((db) => db.id === dp.id))];

  const filtered = allPros.filter((p) => {
    if (category !== 'All' && p.category !== category) return false;
    if (remoteOnly && !p.remote) return false;
    if (verifiedOnly && !p.verified) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.businessName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.services.some((s) => s.toLowerCase().includes(q));
    }
    return true;
  });

  const sponsored = filtered.filter((p) => p.sponsored);
  const regular = filtered.filter((p) => !p.sponsored);

  const handleSave = async (proId: string) => {
    if (!session) return;
    try {
      const result = await toggleSavedListing('professional', proId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (result.saved) next.add(proId);
        else next.delete(proId);
        return next;
      });
    } catch { /* ignore */ }
  };

  return (
    <div>
      <PageHeader title="Professional Marketplace" subtitle="Hire verified professionals for your venture. Attorneys, CPAs, contractors, designers, and more." />

      {session && (
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm mb-5"><Plus className="w-4 h-4" /> List your professional services</button>
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
        <select className="input sm:w-48" value={category} onChange={(e) => setCategory(e.target.value as ProfessionalCategory | 'All')}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setRemoteOnly(!remoteOnly)} className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${remoteOnly ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200'}`}>Remote OK</button>
        <button onClick={() => setVerifiedOnly(!verifiedOnly)} className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${verifiedOnly ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-600 border-ink-200'}`}>Verified only</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-pulse bg-ink-100 rounded-xl h-48" />)}
        </div>
      ) : (
        <>
          {sponsored.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2 text-xs text-ink-500"><Sparkles className="w-3.5 h-3.5" /> Sponsored</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sponsored.map((p) => <ProfessionalCard key={p.id} pro={p} saved={savedIds.has(p.id)} onSave={session ? () => handleSave(p.id) : undefined} onClick={() => navigate({ name: 'professional', professionalId: p.id })} />)}
              </div>
            </div>
          )}

          {regular.length === 0 && sponsored.length === 0 ? (
            <EmptyState icon={<Store className="w-5 h-5" />} title="No professionals found" description="Try adjusting your filters." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {regular.map((p) => <ProfessionalCard key={p.id} pro={p} saved={savedIds.has(p.id)} onSave={session ? () => handleSave(p.id) : undefined} onClick={() => navigate({ name: 'professional', professionalId: p.id })} />)}
            </div>
          )}
        </>
      )}

      {showCreate && <CreateProfessionalModal onClose={() => setShowCreate(false)} onCreated={loadProfessionals} />}
    </div>
  );
}

function ProfessionalCard({ pro, saved, onSave, onClick }: { pro: Professional; saved: boolean; onSave?: () => void; onClick: () => void }) {
  const avgRating = pro.reviews.length > 0 ? pro.reviews.reduce((sum, r) => sum + r.rating, 0) / pro.reviews.length : 0;
  return (
    <div className="relative">
      {onSave && (
        <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors">
          {saved ? <BookmarkCheck className="w-4 h-4 text-brand-600" /> : <Bookmark className="w-4 h-4 text-ink-400" />}
        </button>
      )}
      <button onClick={onClick} className="text-left w-full">
        <Card className="p-4 h-full hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3 mb-3">
            <Avatar src={pro.logoUrl} name={pro.businessName} size={48} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-ink-900 truncate">{pro.businessName}</h3>
              <p className="text-xs text-ink-500">{pro.category}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {pro.verified && <ShieldCheck className="w-3.5 h-3.5 text-accent-600" />}
                {avgRating > 0 && <span className="flex items-center gap-0.5 text-xs text-ink-600"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {avgRating.toFixed(1)}</span>}
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-600 line-clamp-2 mb-3">{pro.description}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {pro.services.slice(0, 3).map((s) => <span key={s} className="text-xs bg-ink-50 text-ink-600 rounded-full px-2 py-0.5">{s}</span>)}
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <MapPin className="w-3 h-3" /> {pro.location}
            {pro.remote && <Badge tone="brand">Remote</Badge>}
          </div>
        </Card>
      </button>
    </div>
  );
}

function CreateProfessionalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<ProfessionalCategory>('Attorney');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(true);
  const [services, setServices] = useState('');
  const [website, setWebsite] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createProfessional({
        business_name: businessName,
        category,
        description,
        location,
        remote,
        services: services.split(',').map((s) => s.trim()).filter(Boolean),
        website,
        years_in_business: yearsInBusiness,
      });
      onCreated();
      onClose();
    } catch {
      setError('Could not create your listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="List your professional services">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="flex items-center gap-2 text-sm text-error-700 bg-error-50 rounded-lg p-3"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        <Field label="Business name" required>
          <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required placeholder="e.g. Stone Legal Group" />
        </Field>
        <Field label="Category" required>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ProfessionalCategory)}>
            {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Description" required>
          <textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Describe your services..." />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Location">
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
          </Field>
          <Field label="Years in business">
            <input type="number" min={0} className="input" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Services (comma-separated)">
          <input className="input" value={services} onChange={(e) => setServices(e.target.value)} placeholder="Entity Formation, Contract Drafting..." />
        </Field>
        <Field label="Website">
          <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="rounded" /> Available remotely
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Creating...' : 'Create listing'}</button>
        </div>
      </form>
    </Modal>
  );
}
