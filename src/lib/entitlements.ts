/**
 * FRONTEND ADVISORY ONLY — NOT A SECURITY BOUNDARY
 *
 * The EntitlementEngine is a client-side advisory layer for UI feedback only.
 * It trusts whatever PlanEntitlements/SubscriptionPlan objects are passed to it.
 * A malicious client can fabricate entitlement objects to bypass all checks.
 *
 * ALL real enforcement must occur server-side:
 *   - Database RLS policies (gate reads/writes)
 *   - SECURITY DEFINER database functions (gate mutations)
 *   - Edge Functions (gate API calls)
 *
 * Client-supplied entitlement objects are NEVER authoritative.
 * Do not rely on this engine for security — it is for UX only.
 */

import type {
  PlanEntitlements,
  EntitlementCheckResult,
  SubscriptionPlan,
} from '@/types';

const DEFAULT_FREE_ENTITLEMENTS: PlanEntitlements = {
  id: 'default-free',
  plan_id: '',
  max_opportunities: 5,
  max_applications: 10,
  max_saved_items: 25,
  max_collaboration_spaces: 3,
  max_team_members: 5,
  max_messages_per_day: 50,
  storage_limit_mb: 100,
  max_professional_listings: 0,
  max_company_pages: 0,
  ai_access: false,
  advanced_search: false,
  analytics_access: false,
  priority_visibility: false,
  sponsored_listing_access: false,
  recruiting_tools: false,
  marketing_tools: false,
  public_builder_profile: false,
  seo_profile: false,
};

export class EntitlementEngine {
  private entitlements: PlanEntitlements;
  private plan: SubscriptionPlan | null;

  constructor(entitlements: PlanEntitlements | null, plan: SubscriptionPlan | null) {
    this.entitlements = entitlements ?? DEFAULT_FREE_ENTITLEMENTS;
    this.plan = plan;
  }

  private checkNumeric(currentUsage: number, limit: number, featureName: string): EntitlementCheckResult {
    if (limit === 0) {
      return {
        allowed: false,
        reason: `${featureName} is not available on your current plan.`,
        currentUsage,
        limit: 0,
        upgradeRecommendation: this.upgradeSuggestion(featureName),
      };
    }
    if (currentUsage >= limit) {
      return {
        allowed: false,
        reason: `You have reached your ${featureName} limit (${currentUsage}/${limit}).`,
        currentUsage,
        limit,
        upgradeRecommendation: this.upgradeSuggestion(featureName),
      };
    }
    return {
      allowed: true,
      reason: '',
      currentUsage,
      limit,
    };
  }

  private checkBoolean(flag: boolean, featureName: string): EntitlementCheckResult {
    return {
      allowed: flag,
      reason: flag ? '' : `${featureName} is not available on your current plan.`,
      currentUsage: 0,
      limit: flag ? 1 : 0,
      upgradeRecommendation: flag ? undefined : this.upgradeSuggestion(featureName),
    };
  }

  private upgradeSuggestion(featureName: string): string | undefined {
    if (!this.plan) return 'Upgrade to a paid plan to access this feature.';
    const cat = this.plan.plan_category;
    if (cat === 'builder_free') return 'Upgrade to Builder Pro to access this feature.';
    if (cat === 'builder_pro') return 'Upgrade to Professional or Company to access this feature.';
    if (cat === 'professional') return 'Upgrade to Company to access this feature.';
    return undefined;
  }

  canCreateOpportunity(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_opportunities, 'opportunity creation');
  }

  canApply(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_applications, 'applications');
  }

  canSaveItem(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_saved_items, 'saved items');
  }

  canCreateCollaborationSpace(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_collaboration_spaces, 'collaboration spaces');
  }

  canAddTeamMember(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_team_members, 'team members');
  }

  canSendMessage(messagesToday: number): EntitlementCheckResult {
    return this.checkNumeric(messagesToday, this.entitlements.max_messages_per_day, 'messages per day');
  }

  canUploadFile(currentSizeMb: number): EntitlementCheckResult {
    return this.checkNumeric(currentSizeMb, this.entitlements.storage_limit_mb, 'storage');
  }

  canCreateProfessionalListing(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_professional_listings, 'professional listings');
  }

  canCreateCompanyPage(currentCount: number): EntitlementCheckResult {
    return this.checkNumeric(currentCount, this.entitlements.max_company_pages, 'company pages');
  }

  canUseAI(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.ai_access, 'AI tools');
  }

  canUseAdvancedSearch(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.advanced_search, 'advanced search');
  }

  canAccessAnalytics(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.analytics_access, 'analytics');
  }

  canUseSponsoredListings(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.sponsored_listing_access, 'sponsored listings');
  }

  canUseRecruitingTools(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.recruiting_tools, 'recruiting tools');
  }

  canUseMarketingTools(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.marketing_tools, 'marketing tools');
  }

  canUsePublicBuilderProfile(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.public_builder_profile, 'public builder profile');
  }

  canUseSeoProfile(): EntitlementCheckResult {
    return this.checkBoolean(this.entitlements.seo_profile, 'SEO profile');
  }

  getEntitlements(): PlanEntitlements {
    return this.entitlements;
  }

  getPlan(): SubscriptionPlan | null {
    return this.plan;
  }
}

export function formatPrice(cents: number): string {
  if (cents === 0) return '$0';
  return `$${(cents / 100).toFixed(0)}`;
}

export const DRAFT_NOTICE = 'DRAFT — NOT FOUNDER APPROVED';
