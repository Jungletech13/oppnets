import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Avatar, EmptyState } from '@/components/ui';
import { MapPin, Star, ShieldCheck, Globe, Mail, ArrowLeft, Building2, Briefcase, Target, Bookmark, BookmarkCheck } from 'lucide-react';
import { getCompany } from '@/data-phase2';
import { fetchCompany, toggleSavedListing, isListingSaved } from '@/lib/queries';
import { getProfile } from '@/data';
import { useAuth } from '@/lib/auth';
import type { Company, CompanySize, Industry } from '@/types';

interface DbCompany extends Company {
  company_reviews?: Company['reviews'];
}

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const { navigate, opportunities } = useApp();
  const { session } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const loadCompany = useCallback(async () => {
    setLoading(true);
    const demo = getCompany(companyId);
    try {
      const data = await fetchCompany(companyId);
      if (data) {
        const r = data as Record<string, unknown>;
        const mapped: DbCompany = {
          id: r.id as string,
          name: r.name as string,
          logoUrl: (r.logo_url as string) || '',
          description: (r.description as string) || '',
          mission: (r.mission as string) || '',
          services: (r.services as string[]) || [],
          industries: (r.industries as Industry[]) || [],
          size: (r.size as CompanySize) || '1-10',
          location: (r.location as string) || '',
          website: (r.website as string) || '',
          contactInfo: (r.contact_info as string) || '',
          teamMemberIds: (r.team_member_ids as string[]) || [],
          opportunityIds: (r.opportunity_ids as string[]) || [],
          portfolio: (r.portfolio as Company['portfolio']) || [],
          reviews: (r.company_reviews as Company['reviews']) || [],
          verified: (r.verified as boolean) ?? false,
          ownerId: (r.owner_id as string) || '',
        };
        setCompany(mapped);
        setIsDemo(false);
      } else {
        setCompany(demo ?? null);
        setIsDemo(!!demo);
      }
      if (session) {
        setSaved(await isListingSaved('company', companyId));
      }
    } catch {
      setCompany(demo ?? null);
      setIsDemo(!!demo);
    } finally {
      setLoading(false);
    }
  }, [companyId, session]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleSave = async () => {
    if (!session) return;
    try {
      const result = await toggleSavedListing('company', companyId);
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

  if (!company) {
    return (
      <div>
        <PageHeader title="Company not found" />
        <EmptyState icon={<Building2 className="w-5 h-5" />} title="Not found" description="This company page does not exist." />
      </div>
    );
  }

  const team = company.teamMemberIds.map((id) => getProfile(id)).filter(Boolean);
  const companyOpps = opportunities.filter((o) => company.opportunityIds.includes(o.id));
  const avgRating = company.reviews.length > 0 ? company.reviews.reduce((sum, r) => sum + r.rating, 0) / company.reviews.length : 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate({ name: 'companies' })} className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4" /> Back to Companies</button>
        {session && !isDemo && (
          <button onClick={handleSave} className="btn-ghost text-sm">
            {saved ? <><BookmarkCheck className="w-4 h-4 text-brand-600" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
          </button>
        )}
      </div>

      {isDemo && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Demonstration company. Its verification, reviews, team, and outcomes are sample content rather than real-world claims.</div>}

      <Card className="p-6 mb-5">
        <div className="flex items-start gap-4 mb-4">
          <Avatar src={company.logoUrl} name={company.name} size={72} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink-900">{company.name}</h1>
              {company.verified && <ShieldCheck className="w-5 h-5 text-accent-600" />}
            </div>
            <p className="text-sm text-ink-500 mt-0.5">{company.size} employees</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-ink-600">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {company.location}</span>
              {avgRating > 0 && <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {avgRating.toFixed(1)} ({company.reviews.length})</span>}
            </div>
          </div>
        </div>
        <p className="text-sm text-ink-700 leading-relaxed mb-4">{company.description}</p>
        {company.mission && (
          <div className="flex items-start gap-2 bg-brand-50 rounded-lg p-3">
            <Target className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
            <p className="text-sm text-ink-700">{company.mission}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3 mt-4 text-sm">
          {company.website && !isDemo && <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-600 hover:underline"><Globe className="w-4 h-4" /> Website</a>}
          <span className="flex items-center gap-1.5 text-ink-600"><Mail className="w-4 h-4" /> {company.contactInfo}</span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Services</h2>
          <div className="flex flex-wrap gap-1.5">
            {company.services.map((s) => <span key={s} className="text-xs bg-brand-50 text-brand-700 rounded-full px-2.5 py-1">{s}</span>)}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Industries</h2>
          <div className="flex flex-wrap gap-1.5">
            {company.industries.map((ind) => <span key={ind} className="text-xs bg-ink-50 text-ink-600 rounded-full px-2.5 py-1">{ind}</span>)}
          </div>
        </Card>
      </div>

      {companyOpps.length > 0 && (
        <Card className="p-5 mt-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Open Opportunities</h2>
          <div className="space-y-2">
            {companyOpps.map((o) => (
              <button key={o.id} onClick={() => navigate({ name: 'opportunity', opportunityId: o.id })} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                <Briefcase className="w-4 h-4 text-brand-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{o.title}</p>
                  <p className="text-xs text-ink-500">{o.category} · {o.stage}</p>
                </div>
                <Badge tone={o.stage === 'Recruiting' ? 'accent' : 'neutral'}>{o.stage}</Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      {team.length > 0 && (
        <Card className="p-5 mt-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Team Members</h2>
          <div className="space-y-2">
            {team.map((t) => t && (
              <button key={t.id} onClick={() => navigate({ name: 'profile', profileId: t.id })} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                <Avatar src={t.photoUrl} name={t.name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{t.name}</p>
                  <p className="text-xs text-ink-500 truncate">{t.headline}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {company.reviews.length > 0 && (
        <Card className="p-5 mt-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-3">Reviews</h2>
          <div className="space-y-3">
            {company.reviews.map((r) => (
              <div key={r.id} className="border-b border-ink-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-ink-900">{r.authorName}</span>
                  <span className="flex items-center gap-0.5 text-xs text-ink-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-ink-200'}`} />)}
                  </span>
                  <span className="text-xs text-ink-400 ml-auto">{new Date(r.at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-ink-700">{r.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
