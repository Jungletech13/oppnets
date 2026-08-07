import { useEffect, useState } from 'react';
import type { SubscriptionPlan, UserSubscription } from '@/types';
import { fetchMyPlanAndEntitlements } from '@/lib/subscription-queries';

interface MembershipState {
  plan: SubscriptionPlan | null;
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
}

export function useMembership(): MembershipState {
  const [state, setState] = useState<MembershipState>({
    plan: null,
    subscription: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    fetchMyPlanAndEntitlements()
      .then(({ plan, subscription }) => {
        if (active) setState({ plan, subscription, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            plan: null,
            subscription: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Could not load membership details.',
          });
        }
      });
    return () => { active = false; };
  }, []);

  return state;
}
