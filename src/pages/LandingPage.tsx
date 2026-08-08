import { useApp } from '@/store';
import { useAuth } from '@/lib/auth';
import {
  Compass, ShieldCheck, Users, LayoutDashboard, TrendingUp, Sparkles, ArrowRight, CheckCircle2, Building2, Heart, Film, ShoppingBag, Laptop, Wrench,
} from 'lucide-react';

export function LandingPage() {
  const { navigate, profiles, currentUserId } = useApp();
  const { user, signOut } = useAuth();
  const profile = profiles.find((candidate) => candidate.id === currentUserId);
  const profileComplete = Boolean(
    profile?.name.trim()
    && profile.headline.trim()
    && profile.bio.trim()
    && profile.location.trim()
    && profile.skills.length
    && profile.industries.length
    && profile.interests.length
    && profile.timeCommitment !== 'Not specified'
  );
  const profileActionLabel = profileComplete ? 'View Your Profile' : 'Finish Your Profile';

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">ON</div>
            <span className="font-semibold text-ink-900">Opportunity Network</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden lg:inline text-xs text-ink-500" title={user?.email}>
              Signed in as {user?.email}
            </span>
            <button onClick={() => navigate({ name: 'discover' })} className="btn-ghost hidden sm:inline-flex">Explore Opportunities</button>
            <button onClick={() => navigate({ name: 'home' })} className="btn-primary">Open Workspace</button>
            <button onClick={() => void signOut()} className="btn-ghost">Sign Out</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-3 py-1 mb-5">
              <Sparkles className="w-3.5 h-3.5" /> Trust-first collaboration platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink-900 tracking-tight leading-[1.1]">
              Every connection should lead to an opportunity.
            </h1>
            <p className="mt-5 text-lg text-ink-600 max-w-2xl leading-relaxed">
              Discover trusted people, form the right team, and turn opportunities into real progress.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={() => navigate({ name: 'discover' })} className="btn-primary text-base px-6 py-3">
                <Compass className="w-5 h-5" /> Explore Opportunities
              </button>
              <button onClick={() => navigate({ name: 'profile' })} className="btn-secondary text-base px-6 py-3">
                {profileActionLabel} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-400">Not a social feed. No followers, no likes — just real ventures and verified collaborators.</p>
          </div>
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 to-transparent" />
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-ink-900 text-center">How it works</h2>
        <p className="text-ink-500 text-center mt-2 max-w-xl mx-auto">A focused journey from discovery to measurable progress.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {[
            { icon: Compass, title: 'Discover', text: 'Find opportunities across industries, or post your own.' },
            { icon: Users, title: 'Match', text: 'Get recommended individuals and proven collaborator groups.' },
            { icon: LayoutDashboard, title: 'Collaborate', text: 'Spin up a customizable Collaboration Space for your team.' },
            { icon: TrendingUp, title: 'Progress', text: 'Evidence-based tasks, reviews, and milestones — not vanity metrics.' },
          ].map((s, i) => (
            <div key={i} className="card p-5">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-brand-600 mb-1">Step {i + 1}</div>
              <h3 className="font-semibold text-ink-900">{s.title}</h3>
              <p className="text-sm text-ink-500 mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature sections */}
      <section className="bg-ink-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {[
            { icon: Compass, title: 'Opportunity discovery', text: 'Browse a marketplace of real ventures — from house flips to nonprofits to tech startups. Filter by category, stage, location, skills, and compensation.' },
            { icon: ShieldCheck, title: 'Trusted profiles', text: 'Profiles focus on what you can build, not popularity. Claim-level verification shows exactly what has been checked — identity, employment, ventures, references.' },
            { icon: Users, title: 'Individual and group matching', text: 'Search results include individuals, frequent collaborator pairs, and established groups — with factual history, not superlatives.' },
            { icon: LayoutDashboard, title: 'Custom Collaboration Spaces', text: 'Every accepted relationship gets a dedicated workspace. Start from a category preset, then add, remove, reorder, and pin modules.' },
            { icon: TrendingUp, title: 'Evidence-based progress', text: 'Progress is calculated from approved checklist items — not a number someone types in. Reviews, revisions, and approvals are tracked.' },
            { icon: ShieldCheck, title: 'Verification and safety', text: 'A Trust Center shows your verification status, account standing, reports, and safety guidance. Factual moderation language, always.' },
          ].map((f, i) => (
            <div key={i} className={`grid lg:grid-cols-2 gap-8 items-center ${i % 2 ? 'lg:grid-flow-dense' : ''}`}>
              <div className={i % 2 ? 'lg:order-2' : ''}>
                <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-ink-900">{f.title}</h3>
                <p className="text-ink-600 mt-2 leading-relaxed">{f.text}</p>
              </div>
              <div className={`card p-6 ${i % 2 ? 'lg:order-1' : ''}`}>
                <FeaturePreview index={i} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-ink-900 text-center">Opportunities across every industry</h2>
        <p className="text-ink-500 text-center mt-2">Not just tech startups.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
          {[
            { icon: Building2, label: 'Real Estate' },
            { icon: Wrench, label: 'Service Businesses' },
            { icon: Heart, label: 'Nonprofits' },
            { icon: Laptop, label: 'Technology' },
            { icon: Film, label: 'Creative Productions' },
            { icon: ShoppingBag, label: 'E-commerce' },
          ].map((c) => (
            <div key={c.label} className="card p-4 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                <c.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-ink-700">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl bg-ink-900 text-white p-10 lg:p-14 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Build something real with people you trust.</h2>
          <p className="text-ink-300 mt-3 max-w-xl mx-auto">Join a network where every connection is meant to lead somewhere — and progress is measured, not performed.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate({ name: 'discover' })} className="btn bg-white text-ink-900 hover:bg-ink-100 px-6 py-3 text-base">
              <Compass className="w-5 h-5" /> Explore Opportunities
            </button>
            <button onClick={() => navigate({ name: 'profile' })} className="btn bg-brand-600 text-white hover:bg-brand-700 px-6 py-3 text-base">
              {profileActionLabel}
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <div className="w-6 h-6 rounded bg-brand-600 text-white flex items-center justify-center font-bold text-xs">ON</div>
            Opportunity Network
          </div>
          <p className="text-xs text-ink-400">MVP prototype · Mock data for demonstration · Not legal or financial advice</p>
        </div>
      </footer>
    </div>
  );
}

function FeaturePreview({ index }: { index: number }) {
  const previews = [
    // discovery
    <div key="d" className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 h-9 rounded-lg bg-ink-100" />
        <div className="w-20 h-9 rounded-lg bg-brand-100" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="border border-ink-200 rounded-lg p-3 flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/4 bg-ink-200 rounded" />
            <div className="h-2.5 w-1/2 bg-ink-100 rounded" />
            <div className="flex gap-1.5 mt-1"><div className="h-4 w-12 bg-brand-50 rounded-full" /><div className="h-4 w-16 bg-ink-100 rounded-full" /></div>
          </div>
        </div>
      ))}
    </div>,
    // trusted profiles
    <div key="p" className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-brand-100" />
        <div className="space-y-1.5"><div className="h-3 w-32 bg-ink-200 rounded" /><div className="h-2.5 w-24 bg-ink-100 rounded" /></div>
      </div>
      {['Identity verified', 'Employment verified', 'Venture participation verified'].map((v) => (
        <div key={v} className="flex items-center gap-2 text-sm text-ink-600">
          <CheckCircle2 className="w-4 h-4 text-accent-500" /> {v}
        </div>
      ))}
    </div>,
    // group matching
    <div key="g" className="space-y-3">
      <div className="flex -space-x-2 mb-2">
        {[1, 2, 3].map((i) => <div key={i} className="w-10 h-10 rounded-full bg-brand-100 border-2 border-white" />)}
      </div>
      <div className="h-3 w-2/3 bg-ink-200 rounded" />
      <div className="text-xs text-ink-500">Proven collaboration history · 3 ventures together</div>
      <div className="flex gap-1.5"><div className="h-4 w-14 bg-brand-50 rounded-full" /><div className="h-4 w-20 bg-ink-100 rounded-full" /></div>
    </div>,
    // collaboration spaces
    <div key="c" className="space-y-2">
      <div className="h-3 w-1/2 bg-ink-200 rounded" />
      {['Tasks', 'Milestones', 'Decision Log', 'Files', 'Budget'].map((m, i) => (
        <div key={m} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50">
          <div className={`w-2 h-2 rounded-full ${i < 3 ? 'bg-brand-500' : 'bg-ink-300'}`} />
          <span className="text-sm text-ink-600">{m}</span>
        </div>
      ))}
    </div>,
    // evidence-based progress
    <div key="e" className="space-y-3">
      <div className="flex justify-between text-sm"><span className="text-ink-600">Task progress</span><span className="font-medium text-ink-800">50%</span></div>
      <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden"><div className="h-full w-1/2 bg-brand-500 rounded-full" /></div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-ink-50 rounded-lg p-2"><div className="font-semibold text-ink-800">3</div><div className="text-ink-500">Done</div></div>
        <div className="bg-ink-50 rounded-lg p-2"><div className="font-semibold text-ink-800">1</div><div className="text-ink-500">In review</div></div>
        <div className="bg-ink-50 rounded-lg p-2"><div className="font-semibold text-ink-800">2</div><div className="text-ink-500">Remaining</div></div>
      </div>
    </div>,
    // verification & safety
    <div key="v" className="space-y-3">
      <div className="flex items-center gap-2 text-sm"><ShieldCheck className="w-4 h-4 text-accent-500" /><span className="text-ink-700 font-medium">Good standing</span></div>
      {['Email verified', 'Phone verified', 'Identity verified', 'Employment — pending'].map((s, i) => (
        <div key={s} className="flex items-center justify-between text-sm">
          <span className="text-ink-600">{s}</span>
          <div className={`w-2.5 h-2.5 rounded-full ${i < 3 ? 'bg-accent-500' : 'bg-amber-400'}`} />
        </div>
      ))}
    </div>,
  ];
  return previews[index] ?? null;
}
