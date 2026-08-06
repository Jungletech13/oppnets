import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Avatar } from '@/components/ui';
import { Trophy, Users, Compass, Rocket, TrendingUp } from 'lucide-react';
import { SUCCESS_STORIES } from '@/data-phase2';
import { getProfile } from '@/data';
import { useApp } from '@/store';

export function SuccessStoriesPage() {
  const { navigate } = useApp();

  return (
    <div>
      <PageHeader title="Success Stories" subtitle="Real teams formed, real ventures launched, real growth — all through Opportunity Network." />

      <div className="space-y-5">
        {SUCCESS_STORIES.map((story) => {
          const participants = story.participantIds.map((id) => getProfile(id)).filter(Boolean);
          return (
            <Card key={story.id} className="overflow-hidden">
              <img src={story.imageUrl} alt={story.title} className="w-full h-48 object-cover" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge tone="brand">{story.industry}</Badge>
                  <span className="text-xs text-ink-400">{new Date(story.publishedAt).toLocaleDateString()}</span>
                </div>
                <h2 className="text-lg font-bold text-ink-900 mb-2">{story.title}</h2>
                <p className="text-sm text-ink-700 leading-relaxed mb-4">{story.summary}</p>

                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <StoryStep icon={Users} label="Team Formed" text={story.teamFormed} />
                  <StoryStep icon={Compass} label="Opportunity Discovered" text={story.opportunityDiscovered} />
                  <StoryStep icon={Rocket} label="Venture Launched" text={story.ventureLaunched} />
                  <StoryStep icon={TrendingUp} label="Business Growth" text={story.businessGrowth} />
                </div>

                {participants.length > 0 && (
                  <div className="flex items-center gap-2 pt-3 border-t border-ink-100">
                    <span className="text-xs text-ink-500">Team:</span>
                    {participants.map((p) => p && (
                      <button key={p.id} onClick={() => navigate({ name: 'profile', profileId: p.id })} className="flex items-center gap-1.5 hover:bg-ink-50 rounded-full pr-2">
                        <Avatar src={p.photoUrl} name={p.name} size={24} />
                        <span className="text-xs text-ink-700">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StoryStep({ icon: Icon, label, text }: { icon: typeof Users; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-ink-50 rounded-lg p-3">
      <Icon className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-ink-700 mt-0.5">{text}</p>
      </div>
    </div>
  );
}
