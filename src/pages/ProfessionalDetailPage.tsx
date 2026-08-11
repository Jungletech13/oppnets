import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Avatar, EmptyState, Modal } from '@/components/ui';
import { MapPin, Star, ShieldCheck, Globe, Clock, DollarSign, Mail, CheckCircle2, Sparkles, ArrowLeft, Briefcase, Bookmark, BookmarkCheck, AlertCircle, Send } from 'lucide-react';
import { getProfessional } from '@/data-phase2';
import { fetchProfessional, sendInquiry, toggleSavedListing, isListingSaved } from '@/lib/queries';
import { useAuth } from '@/lib/auth';
import type { Industry, Professional, ProfessionalCategory } from '@/types';

interface DbProfessional extends Professional {
  professional_reviews?: Professional['reviews'];
}

export function ProfessionalDetailPage({ professionalId }: { professionalId: string }) {
  const { navigate } = useApp();
  const { session } = useAuth();
  const [pro, setPro] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInquiry, setShowInquiry] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const loadProfessional = useCallback(async () => {
    setLoading(true);
    const demo = getProfessional(professionalId);
    try {
      const data = await fetchProfessional(professionalId);
      if (data) {
        const r = data as Record<string, unknown>;
        const mapped: DbProfessional = {
          id: r.id as string,
          businessName: r.business_name as string,
          logoUrl: (r.logo_url as string) || '',
          category: r.category as ProfessionalCategory,
          description: (r.description as string) || '',
          services: (r.services as string[]) || [],
          industriesServed: (r.industries_served as Industry[]) || [],
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
        };
        setPro(mapped);
        setIsDemo(false);
      } else {
        setPro(demo ?? null);
        setIsDemo(!!demo);
      }
      if (session) {
        setSaved(await isListingSaved('professional', professionalId));
      }
    } catch {
      setPro(demo ?? null);
      setIsDemo(!!demo);
    } finally {
      setLoading(false);
    }
  }, [professionalId, session]);

  useEffect(() => {
    loadProfessional();
  }, [loadProfessional]);

  const handleSave = async () => {
    if (!session) return;
    try {
      const result = await toggleSavedListing('professional', professionalId);
      setSaved(result.saved);
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse bg-ink-100 rounded-xl h-96" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div>
        <PageHeader title="Professional not found" />
        <EmptyState icon={<Briefcase className="w-5 h-5" />} title="Not found" description="This professional profile does not exist." />
      </div>
    );
  }

  const avgRating = pro.reviews.length > 0 ? pro.reviews.reduce((sum, r) => sum + r.rating, 0) / pro.reviews.length : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate({ name: 'professionals' })} className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4" /> Back to Professionals</button>
        {session && !isDemo && (
          <button onClick={handleSave} className="btn-ghost text-sm">
            {saved ? <><BookmarkCheck className="w-4 h-4 text-brand-600" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
          </button>
        )}
      </div>

      {pro.sponsored && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-ink-500"><Sparkles className="w-3.5 h-3.5" /> Sponsored listing</div>
      )}
      {isDemo && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Demonstration listing. This is not a verified real-world provider and cannot receive inquiries.</div>}

      <Card className="p-6 mb-5">
        <div className="flex items-start gap-4 mb-4">
          <Avatar src={pro.logoUrl} name={pro.businessName} size={72} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink-900">{pro.businessName}</h1>
              {pro.verified && <ShieldCheck className="w-5 h-5 text-accent-600" />}
              {pro.premium && <Badge tone="brand">Premium</Badge>}
            </div>
            <p className="text-sm text-ink-500 mt-0.5">{pro.category}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-ink-600">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {pro.location}</span>
              {pro.remote && <Badge tone="brand">Remote OK</Badge>}
              {avgRating > 0 && <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {avgRating.toFixed(1)} ({pro.reviews.length} review{pro.reviews.length !== 1 ? 's' : ''})</span>}
            </div>
          </div>
        </div>
        <p className="text-sm text-ink-700 leading-relaxed mb-4">{pro.description}</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2 text-ink-600"><Clock className="w-4 h-4 text-ink-400" /> {pro.responseTime}</div>
          <div className="flex items-center gap-2 text-ink-600"><DollarSign className="w-4 h-4 text-ink-400" /> {pro.pricingModel}</div>
          <div className="flex items-center gap-2 text-ink-600"><Briefcase className="w-4 h-4 text-ink-400" /> {pro.yearsInBusiness} year{pro.yearsInBusiness !== 1 ? 's' : ''} in business</div>
          {pro.website && !isDemo && <a href={pro.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-brand-600 hover:underline"><Globe className="w-4 h-4" /> Website</a>}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Services</h2>
          <div className="flex flex-wrap gap-1.5">
            {pro.services.map((s) => <span key={s} className="text-xs bg-brand-50 text-brand-700 rounded-full px-2.5 py-1">{s}</span>)}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Industries Served</h2>
          <div className="flex flex-wrap gap-1.5">
            {pro.industriesServed.map((ind) => <span key={ind} className="text-xs bg-ink-50 text-ink-600 rounded-full px-2.5 py-1">{ind}</span>)}
          </div>
        </Card>
      </div>

      {pro.certifications.length > 0 && (
        <Card className="p-5 mt-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Certifications</h2>
          <div className="space-y-2">
            {pro.certifications.map((c) => <div key={c} className="flex items-center gap-2 text-sm text-ink-700"><CheckCircle2 className="w-4 h-4 text-accent-600" /> {c}</div>)}
          </div>
        </Card>
      )}

      {pro.portfolio.length > 0 && (
        <Card className="p-5 mt-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Portfolio</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {pro.portfolio.map((item) => (
              <div key={item.id} className="border border-ink-200 rounded-lg overflow-hidden">
                <img src={item.imageUrl} alt={item.title} className="w-full h-32 object-cover" />
                <div className="p-3">
                  <h3 className="text-sm font-medium text-ink-900">{item.title}</h3>
                  <p className="text-xs text-ink-500 mt-0.5">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5 mt-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Reviews ({pro.reviews.length})</h2>
        {pro.reviews.length === 0 ? (
          <p className="text-sm text-ink-500">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {pro.reviews.map((r) => (
              <div key={r.id} className="border-b border-ink-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-ink-900">{r.authorName}</span>
                  {r.verified && <ShieldCheck className="w-3.5 h-3.5 text-accent-600" />}
                  <span className="flex items-center gap-0.5 text-xs text-ink-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-ink-200'}`} />)}
                  </span>
                  <span className="text-xs text-ink-400 ml-auto">{new Date(r.at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-ink-700">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 mt-5">
        <h2 className="text-sm font-semibold text-ink-900 mb-3">Contact</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {pro.contactMethods.map((m) => <span key={m} className="flex items-center gap-1.5 text-sm text-ink-700 bg-ink-50 rounded-lg px-3 py-1.5"><Mail className="w-4 h-4 text-ink-400" /> {m}</span>)}
        </div>
        {isDemo ? (
          <p className="text-sm text-ink-500">Inquiries are disabled for demonstration listings.</p>
        ) : session ? (
          inquirySent ? (
            <div className="flex items-center gap-2 text-sm text-accent-700 bg-accent-50 rounded-lg p-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Your inquiry has been sent. The professional will respond through the platform.
            </div>
          ) : (
            <button onClick={() => setShowInquiry(true)} className="btn-primary">Contact this professional</button>
          )
        ) : (
          <p className="text-sm text-ink-500">Sign in to contact this professional.</p>
        )}
      </Card>

      {showInquiry && (
        <InquiryModal
          professionalName={pro.businessName}
          onClose={() => setShowInquiry(false)}
          onSent={() => { setInquirySent(true); setShowInquiry(false); }}
          professionalId={professionalId}
        />
      )}
    </div>
  );
}

function InquiryModal({ professionalName, professionalId, onClose, onSent }: { professionalName: string; professionalId: string; onClose: () => void; onSent: () => void }) {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await sendInquiry(professionalId, message);
      onSent();
    } catch {
      setError('Could not send your inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Contact ${professionalName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="flex items-center gap-2 text-sm text-error-700 bg-error-50 rounded-lg p-3"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        <p className="text-sm text-ink-600">Describe your needs and the professional will respond through the platform.</p>
        <textarea className="input min-h-32" value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="I'm looking for help with..." />
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Sending...' : <><Send className="w-4 h-4" /> Send inquiry</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
