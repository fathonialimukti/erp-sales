import { createBrowserRouter } from 'react-router';
import { lazy } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PrivateLayout } from './layouts/PrivateLayout';
import { PublicLayout } from './layouts/PublicLayout';

// ── Critical (eager) — needed for first paint / login / 404 ──
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { LandingPage } from './pages/LandingPage';

// ── Lazy helper: named → default ──
const lazyNamed = <T extends Record<string, unknown>, K extends keyof T & string>(
  importer: () => Promise<T>,
  name: K,
) => lazy(() => importer().then((m) => ({ default: m[name] as unknown as React.ComponentType })));

// ── Non-critical (lazy) — loaded on module navigation ──
const ReportsHub = lazyNamed(() => import('./pages/reports/ReportsHub'), 'ReportsHub');
const RegionIndexPage = lazyNamed(() => import('./pages/region/RegionIndexPage'), 'RegionIndexPage');
const RegionDetailPage = lazyNamed(() => import('./pages/region/RegionDetailPage'), 'RegionDetailPage');
const RegionFormPage = lazyNamed(() => import('./pages/region/RegionFormPage'), 'RegionFormPage');
const AreaIndexPage = lazyNamed(() => import('./pages/area/AreaIndexPage'), 'AreaIndexPage');
const AreaDetailPage = lazyNamed(() => import('./pages/area/AreaDetailPage'), 'AreaDetailPage');
const AreaFormPage = lazyNamed(() => import('./pages/area/AreaFormPage'), 'AreaFormPage');
const CustomerIndexPage = lazyNamed(() => import('./pages/customer/CustomerIndexPage'), 'CustomerIndexPage');
const CustomerDetailPage = lazyNamed(() => import('./pages/customer/CustomerDetailPage'), 'CustomerDetailPage');
const CustomerFormPage = lazyNamed(() => import('./pages/customer/CustomerFormPage'), 'CustomerFormPage');
const OutletIndexPage = lazyNamed(() => import('./pages/outlet/OutletIndexPage'), 'OutletIndexPage');
const OutletDetailPage = lazyNamed(() => import('./pages/outlet/OutletDetailPage'), 'OutletDetailPage');
const OutletFormPage = lazyNamed(() => import('./pages/outlet/OutletFormPage'), 'OutletFormPage');
const SkuCategoryIndexPage = lazyNamed(() => import('./pages/sku-category/SkuCategoryIndexPage'), 'SkuCategoryIndexPage');
const SkuCategoryDetailPage = lazyNamed(() => import('./pages/sku-category/SkuCategoryDetailPage'), 'SkuCategoryDetailPage');
const SkuCategoryFormPage = lazyNamed(() => import('./pages/sku-category/SkuCategoryFormPage'), 'SkuCategoryFormPage');
const SkuIndexPage = lazyNamed(() => import('./pages/sku/SkuIndexPage'), 'SkuIndexPage');
const SkuDetailPage = lazyNamed(() => import('./pages/sku/SkuDetailPage'), 'SkuDetailPage');
const SkuFormPage = lazyNamed(() => import('./pages/sku/SkuFormPage'), 'SkuFormPage');
const SalesOrderIndexPage = lazyNamed(() => import('./pages/sales-order/SalesOrderIndexPage'), 'SalesOrderIndexPage');
const SalesOrderDetailPage = lazyNamed(() => import('./pages/sales-order/SalesOrderDetailPage'), 'SalesOrderDetailPage');
const SalesOrderFormPage = lazyNamed(() => import('./pages/sales-order/SalesOrderFormPage'), 'SalesOrderFormPage');
const VisitLogIndexPage = lazyNamed(() => import('./pages/visit-log/VisitLogIndexPage'), 'VisitLogIndexPage');
const VisitLogDetailPage = lazyNamed(() => import('./pages/visit-log/VisitLogDetailPage'), 'VisitLogDetailPage');
const VisitLogFormPage = lazyNamed(() => import('./pages/visit-log/VisitLogFormPage'), 'VisitLogFormPage');
const ActionProgramIndexPage = lazyNamed(() => import('./pages/action-program/ActionProgramIndexPage'), 'ActionProgramIndexPage');
const ActionProgramDetailPage = lazyNamed(() => import('./pages/action-program/ActionProgramDetailPage'), 'ActionProgramDetailPage');
const ActionProgramFormPage = lazyNamed(() => import('./pages/action-program/ActionProgramFormPage'), 'ActionProgramFormPage');
const EventProposalIndexPage = lazyNamed(() => import('./pages/event-proposal/EventProposalIndexPage'), 'EventProposalIndexPage');
const EventProposalDetailPage = lazyNamed(() => import('./pages/event-proposal/EventProposalDetailPage'), 'EventProposalDetailPage');
const EventProposalFormPage = lazyNamed(() => import('./pages/event-proposal/EventProposalFormPage'), 'EventProposalFormPage');
const UsersIndexPage = lazyNamed(() => import('./pages/users/UsersIndexPage'), 'UsersIndexPage');
const UserDetailPage = lazyNamed(() => import('./pages/users/UserDetailPage'), 'UserDetailPage');
const UserFormPage = lazyNamed(() => import('./pages/users/UserFormPage'), 'UserFormPage');
const RolesIndexPage = lazyNamed(() => import('./pages/access-control/RolesIndexPage'), 'RolesIndexPage');
const RoleDetailPage = lazyNamed(() => import('./pages/access-control/RoleDetailPage'), 'RoleDetailPage');
const RoleFormPage = lazyNamed(() => import('./pages/access-control/RoleFormPage'), 'RoleFormPage');
const ActivityLogsIndexPage = lazyNamed(() => import('./pages/activity-logs/ActivityLogsIndexPage'), 'ActivityLogsIndexPage');
const ActivityLogDetailPage = lazyNamed(() => import('./pages/activity-logs/ActivityLogDetailPage'), 'ActivityLogDetailPage');
const NotificationsPage = lazyNamed(() => import('./pages/notifications/NotificationsPage'), 'NotificationsPage');
const AiAdminChatPage = lazy(() => import('./pages/ai-admin/AiAdminChatPage'));
const EmailCrmIndexPage = lazyNamed(() => import('./pages/email-crm/EmailCrmIndexPage'), 'EmailCrmIndexPage');
const EmailCrmDetailPage = lazyNamed(() => import('./pages/email-crm/EmailCrmDetailPage'), 'EmailCrmDetailPage');
const EmailCrmFormPage = lazyNamed(() => import('./pages/email-crm/EmailCrmFormPage'), 'EmailCrmFormPage');
const EmailCrmAgentFailuresPage = lazyNamed(() => import('./pages/email-crm/EmailCrmAgentFailuresPage'), 'EmailCrmAgentFailuresPage');
const KnowledgeBaseIndexPage = lazyNamed(() => import('./pages/knowledge-base/KnowledgeBaseIndexPage'), 'KnowledgeBaseIndexPage');
const KnowledgeBaseDetailPage = lazyNamed(() => import('./pages/knowledge-base/KnowledgeBaseDetailPage'), 'KnowledgeBaseDetailPage');
const KnowledgeBaseFormPage = lazyNamed(() => import('./pages/knowledge-base/KnowledgeBaseFormPage'), 'KnowledgeBaseFormPage');
const SettingsPage = lazyNamed(() => import('./pages/settings/SettingsPage'), 'SettingsPage');
const AppSettingsPage = lazyNamed(() => import('./pages/settings/AppSettingsPage'), 'AppSettingsPage');

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'landing-v1',
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <PrivateLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'reports',
        element: <ReportsHub />,
      },
      {
        path: 'region',
        children: [
          { index: true, element: <RegionIndexPage /> },
          { path: 'create', element: <RegionFormPage /> },
          { path: ':id', element: <RegionDetailPage /> },
          { path: ':id/edit', element: <RegionFormPage /> },
        ],
      },
      {
        path: 'area',
        children: [
          { index: true, element: <AreaIndexPage /> },
          { path: 'create', element: <AreaFormPage /> },
          { path: ':id', element: <AreaDetailPage /> },
          { path: ':id/edit', element: <AreaFormPage /> },
        ],
      },
      {
        path: 'customer',
        children: [
          { index: true, element: <CustomerIndexPage /> },
          { path: 'create', element: <CustomerFormPage /> },
          { path: ':id', element: <CustomerDetailPage /> },
          { path: ':id/edit', element: <CustomerFormPage /> },
        ],
      },
      {
        path: 'outlet',
        children: [
          { index: true, element: <OutletIndexPage /> },
          { path: 'create', element: <OutletFormPage /> },
          { path: ':id', element: <OutletDetailPage /> },
          { path: ':id/edit', element: <OutletFormPage /> },
        ],
      },
      {
        path: 'sku-category',
        children: [
          { index: true, element: <SkuCategoryIndexPage /> },
          { path: 'create', element: <SkuCategoryFormPage /> },
          { path: ':id', element: <SkuCategoryDetailPage /> },
          { path: ':id/edit', element: <SkuCategoryFormPage /> },
        ],
      },
      {
        path: 'sku',
        children: [
          { index: true, element: <SkuIndexPage /> },
          { path: 'create', element: <SkuFormPage /> },
          { path: ':id', element: <SkuDetailPage /> },
          { path: ':id/edit', element: <SkuFormPage /> },
        ],
      },
      {
        path: 'sales-order',
        children: [
          { index: true, element: <SalesOrderIndexPage /> },
          { path: 'create', element: <SalesOrderFormPage /> },
          { path: ':id', element: <SalesOrderDetailPage /> },
          { path: ':id/edit', element: <SalesOrderFormPage /> },
        ],
      },
      {
        path: 'email-crm',
        children: [
          { index: true, element: <EmailCrmIndexPage /> },
          { path: 'create', element: <EmailCrmFormPage /> },
          { path: ':id', element: <EmailCrmDetailPage /> },
          { path: ':id/edit', element: <EmailCrmFormPage /> },
          { path: 'agent-failures', element: <EmailCrmAgentFailuresPage /> },
        ],
      },
      {
        path: 'visit-log',
        children: [
          { index: true, element: <VisitLogIndexPage /> },
          { path: 'create', element: <VisitLogFormPage /> },
          { path: ':id', element: <VisitLogDetailPage /> },
        ],
      },
      {
        path: 'action-program',
        children: [
          { index: true, element: <ActionProgramIndexPage /> },
          { path: 'create', element: <ActionProgramFormPage /> },
          { path: ':id', element: <ActionProgramDetailPage /> },
          { path: ':id/edit', element: <ActionProgramFormPage /> },
        ],
      },
      {
        path: 'event-proposal',
        children: [
          { index: true, element: <EventProposalIndexPage /> },
          { path: 'create', element: <EventProposalFormPage /> },
          { path: ':id', element: <EventProposalDetailPage /> },
          { path: ':id/edit', element: <EventProposalFormPage /> },
        ],
      },
      {
        path: 'users',
        children: [
          { index: true, element: <UsersIndexPage /> },
          { path: 'create', element: <UserFormPage /> },
          { path: ':id', element: <UserDetailPage /> },
          { path: ':id/edit', element: <UserFormPage /> },
        ],
      },
      {
        path: 'access-control',
        children: [
          { index: true, element: <RolesIndexPage /> },
          { path: 'create', element: <RoleFormPage /> },
          { path: ':id', element: <RoleDetailPage /> },
          { path: ':id/edit', element: <RoleFormPage /> },
        ],
      },
      {
        path: 'activity-logs',
        children: [
          { index: true, element: <ActivityLogsIndexPage /> },
          { path: ':id', element: <ActivityLogDetailPage /> },
        ],
      },
      {
        path: 'notifications',
        element: <NotificationsPage />,
      },
      {
        path: 'knowledge-base',
        children: [
          { index: true, element: <KnowledgeBaseIndexPage /> },
          { path: 'create', element: <KnowledgeBaseFormPage /> },
          { path: ':id', element: <KnowledgeBaseDetailPage /> },
          { path: ':id/edit', element: <KnowledgeBaseFormPage /> },
        ],
      },
      {
        path: 'ai-admin',
        element: <AiAdminChatPage />,
      },
      {
        path: 'settings',
        children: [
          { index: true, element: <SettingsPage /> },
          { path: 'app', element: <AppSettingsPage /> },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);