import { useEffect, useState } from 'react';
import type { PlanEntitlements, SubscriptionPlan, UserSubscription } from '@/types';
import { fetchMyPlanAndEntitlements } from '@/lib/subscription-queries';

interface MembershipState {
  plan: SubscriptionPlan | null;
  subscription: UserSubscription | null;
  entitlements: PlanEntitlements | null;
  loading: boolean;
  error: string | null;
}

export function useMembership(): MembershipState {
  const [state, setState] = useState<MembershipState>({
    plan: null,
    subscription: null,
    entitlements: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    fetchMyPlanAndEntitlements()
      .then(({ plan, subscription, entitlements }) => {
        if (active) setState({ plan, subscription, entitlements, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            plan: null,
            subscription: null,
            entitlements: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Could not load membership details.',
          });
        }
      });
    return () => { active = false; };
  }, []);

  return state;
}
