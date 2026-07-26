import { AppProvider, useApp } from '@/store';
import { AppShell } from '@/components/AppShell';
import { LandingPage } from '@/pages/LandingPage';
import { HomePage } from '@/pages/HomePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { PeoplePage } from '@/pages/PeoplePage';
import { MyOpportunitiesPage } from '@/pages/MyOpportunitiesPage';
import { SpacePage } from '@/pages/SpacePage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { TrustCenterPage } from '@/pages/TrustCenterPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { OpportunityDetailPage } from '@/pages/OpportunityDetailPage';
import { CreateOpportunityPage } from '@/pages/CreateOpportunityPage';
import { AuthPage } from '@/pages/AuthPage';
import { ProfessionalsPage } from '@/pages/ProfessionalsPage';
import { ProfessionalDetailPage } from '@/pages/ProfessionalDetailPage';
import { CompaniesPage } from '@/pages/CompaniesPage';
import { CompanyDetailPage } from '@/pages/CompanyDetailPage';
import { BuilderPartnersPage } from '@/pages/BuilderPartnersPage';
import { PricingPage } from '@/pages/PricingPage';
import { SuccessStoriesPage } from '@/pages/SuccessStoriesPage';
import { ResourceCenterPage } from '@/pages/ResourceCenterPage';
import { useAuth } from '@/lib/auth';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminShell } from '@/components/AdminShell';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminVerificationPage } from '@/pages/admin/AdminVerificationPage';
import { AdminModerationPage } from '@/pages/admin/AdminModerationPage';
import { AdminCollaborationsPage } from '@/pages/admin/AdminCollaborationsPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';

function Router() {
  const { route } = useApp();

  if (route.name === 'landing') return <LandingPage />;

  // Admin routes — guarded by AdminGuard, rendered in AdminShell
  if (route.name.startsWith('admin')) {
    return (
      <AdminGuard>
        <AdminShell>
          {route.name === 'admin' && <AdminDashboardPage />}
          {route.name === 'admin-users' && <AdminUsersPage />}
          {route.name === 'admin-verification' && <AdminVerificationPage />}
          {route.name === 'admin-moderation' && <AdminModerationPage />}
          {route.name === 'admin-collaborations' && <AdminCollaborationsPage />}
          {route.name === 'admin-audit' && <AdminAuditPage />}
        </AdminShell>
      </AdminGuard>
    );
  }

  return (
    <AppShell>
      {route.name === 'home' && <HomePage />}
      {route.name === 'discover' && <DiscoverPage />}
      {route.name === 'people' && <PeoplePage />}
      {route.name === 'my-opportunities' && <MyOpportunitiesPage />}
      {route.name === 'space' && <SpacePage spaceId={route.spaceId} />}
      {route.name === 'messages' && <MessagesPage />}
      {route.name === 'notifications' && <NotificationsPage />}
      {route.name === 'profile' && <ProfilePage profileId={route.profileId} />}
      {route.name === 'trust' && <TrustCenterPage />}
      {route.name === 'settings' && <SettingsPage />}
      {route.name === 'opportunity' && <OpportunityDetailPage opportunityId={route.opportunityId} />}
      {route.name === 'create-opportunity' && <CreateOpportunityPage />}
      {route.name === 'professionals' && <ProfessionalsPage />}
      {route.name === 'professional' && <ProfessionalDetailPage professionalId={route.professionalId} />}
      {route.name === 'companies' && <CompaniesPage />}
      {route.name === 'company' && <CompanyDetailPage companyId={route.companyId} />}
      {route.name === 'partners' && <BuilderPartnersPage />}
      {route.name === 'pricing' && <PricingPage />}
      {route.name === 'success-stories' && <SuccessStoriesPage />}
      {route.name === 'resources' && <ResourceCenterPage />}
      {route.name === 'resource' && <ResourceCenterPage initialSlug={route.slug} />}
    </AppShell>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-sm text-ink-400">Loading...</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
