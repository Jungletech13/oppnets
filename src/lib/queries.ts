import { supabase } from '@/lib/supabase';
import { mapOpportunityRow, opportunityToInsert } from '@/lib/domain-mappers';
import type { Opportunity } from '@/types';

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchOpportunities() {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, opportunity_roles(*)')
    .order('posted_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchOpportunity(id: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, opportunity_roles(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOpportunity(input: Opportunity) {
  const { data, error } = await supabase
    .from('opportunities')
    .insert(opportunityToInsert(input))
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Opportunity was created without a returned record.');

  if (input.roles.length > 0) {
    const { error: rolesError } = await supabase.from('opportunity_roles').insert(
      input.roles.map((role) => ({
        opportunity_id: data.id,
        title: role.title,
        open_positions: role.openPositions,
        filled: role.filled,
        compensation: role.compensation,
        skills_needed: role.skillsNeeded,
      }))
    );
    if (rolesError) {
      await supabase.from('opportunities').delete().eq('id', data.id);
      throw rolesError;
    }
  }

  const persisted = await fetchOpportunity(data.id);
  if (!persisted) throw new Error('Created opportunity could not be reloaded.');
  return mapOpportunityRow(persisted as Record<string, unknown>);
}

export async function fetchUserSpaces(userId: string) {
  const { data, error } = await supabase
    .from('collaboration_spaces')
    .select('*, space_members!inner(user_id)')
    .eq('space_members.user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSpace(spaceId: string) {
  const { data, error } = await supabase
    .from('collaboration_spaces')
    .select('*, space_members(*), tasks(*), milestones(*), space_files(*), decisions(*), activity_log(*)')
    .eq('id', spaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, conversation_participants!inner(user_id), messages(*)')
    .eq('conversation_participants.user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function sendMessage(conversationId: string, text: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, text })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function fetchVerificationClaims(userId: string) {
  const { data, error } = await supabase
    .from('verification_claims')
    .select('*')
    .eq('user_id', userId)
    .order('verified_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchVerificationTimeline(userId: string) {
  const { data, error } = await supabase
    .from('verification_timeline')
    .select('*')
    .eq('user_id', userId)
    .order('at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchFraudAlerts(userId: string) {
  const { data, error } = await supabase
    .from('fraud_alerts')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCollaborationReviews(spaceId: string) {
  const { data, error } = await supabase
    .from('collaboration_reviews')
    .select('*')
    .eq('space_id', spaceId)
    .order('at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchApplications(opportunityId: string) {
  const { data, error } = await supabase
    .from('opportunity_applications')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('applied_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function applyToOpportunity(opportunityId: string, message: string, roleId?: string) {
  const { data, error } = await supabase
    .from('opportunity_applications')
    .insert({ opportunity_id: opportunityId, message, role_id: roleId })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function subscribeToMessages(conversationId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, callback)
    .subscribe();
}

export async function subscribeToNotifications(userId: string, callback: (payload: unknown) => void) {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
    .subscribe();
}

// ============ Phase 2B — Marketplace ============

export async function fetchProfessionals() {
  const { data, error } = await supabase
    .from('professionals')
    .select('*, professional_reviews(*)')
    .order('sponsored', { ascending: false })
    .order('premium', { ascending: false })
    .order('business_name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchProfessional(id: string) {
  const { data, error } = await supabase
    .from('professionals')
    .select('*, professional_reviews(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProfessional(input: {
  business_name: string;
  category: string;
  description: string;
  services?: string[];
  industries_served?: string[];
  location?: string;
  remote?: boolean;
  certifications?: string[];
  website?: string;
  years_in_business?: number;
  contact_methods?: string[];
  response_time?: string;
  pricing_model?: string;
  availability?: string;
  logo_url?: string;
}) {
  const { data, error } = await supabase
    .from('professionals')
    .insert(input)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfessional(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('professionals')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('*, company_reviews(*)')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchCompany(id: string) {
  const { data, error } = await supabase
    .from('companies')
    .select('*, company_reviews(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCompany(input: {
  name: string;
  description: string;
  mission?: string;
  services?: string[];
  industries?: string[];
  size?: string;
  location?: string;
  website?: string;
  contact_info?: string;
  logo_url?: string;
}) {
  const { data, error } = await supabase
    .from('companies')
    .insert(input)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCompany(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function sendInquiry(professionalId: string, message: string) {
  const { data, error } = await supabase
    .from('professional_inquiries')
    .insert({ professional_id: professionalId, message })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchInquiriesForProfessional(professionalId: string) {
  const { data, error } = await supabase
    .from('professional_inquiries')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateInquiryStatus(inquiryId: string, status: string) {
  const { error } = await supabase
    .from('professional_inquiries')
    .update({ status })
    .eq('id', inquiryId);
  if (error) throw error;
}

export async function toggleSavedListing(listingType: string, listingId: string) {
  const { data: existing } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('listing_type', listingType)
    .eq('listing_id', listingId)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from('saved_listings').delete().eq('id', existing.id);
    if (error) throw error;
    return { saved: false };
  }
  const { error } = await supabase
    .from('saved_listings')
    .insert({ listing_type: listingType, listing_id: listingId });
  if (error) throw error;
  return { saved: true };
}

export async function fetchSavedListings() {
  const { data, error } = await supabase
    .from('saved_listings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function isListingSaved(listingType: string, listingId: string) {
  const { data } = await supabase
    .from('saved_listings')
    .select('id')
    .eq('listing_type', listingType)
    .eq('listing_id', listingId)
    .maybeSingle();
  return !!data;
}
