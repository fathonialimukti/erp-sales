import { createBrowserRouter } from 'react-router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PrivateLayout } from './layouts/PrivateLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { LandingPage } from './pages/LandingPage';
import { RegionIndexPage } from './pages/region/RegionIndexPage';
import { RegionDetailPage } from './pages/region/RegionDetailPage';
import { RegionFormPage } from './pages/region/RegionFormPage';
import { AreaIndexPage } from './pages/area/AreaIndexPage';
import { AreaDetailPage } from './pages/area/AreaDetailPage';
import { AreaFormPage } from './pages/area/AreaFormPage';
import { CustomerIndexPage } from './pages/customer/CustomerIndexPage';
import { CustomerDetailPage } from './pages/customer/CustomerDetailPage';
import { CustomerFormPage } from './pages/customer/CustomerFormPage';
import { OutletIndexPage } from './pages/outlet/OutletIndexPage';
import { OutletDetailPage } from './pages/outlet/OutletDetailPage';
import { OutletFormPage } from './pages/outlet/OutletFormPage';
import { SkuCategoryIndexPage } from './pages/sku-category/SkuCategoryIndexPage';
import { SkuCategoryDetailPage } from './pages/sku-category/SkuCategoryDetailPage';
import { SkuCategoryFormPage } from './pages/sku-category/SkuCategoryFormPage';
import { SkuIndexPage } from './pages/sku/SkuIndexPage';
import { SkuDetailPage } from './pages/sku/SkuDetailPage';
import { SkuFormPage } from './pages/sku/SkuFormPage';
import { SalesOrderIndexPage } from './pages/sales-order/SalesOrderIndexPage';
import { SalesOrderDetailPage } from './pages/sales-order/SalesOrderDetailPage';
import { SalesOrderFormPage } from './pages/sales-order/SalesOrderFormPage';
import { InvoiceIndexPage } from './pages/invoice/InvoiceIndexPage';
import { InvoiceDetailPage } from './pages/invoice/InvoiceDetailPage';
import { InvoiceFormPage } from './pages/invoice/InvoiceFormPage';
import { VisitLogIndexPage } from './pages/visit-log/VisitLogIndexPage';
import { VisitLogDetailPage } from './pages/visit-log/VisitLogDetailPage';
import { VisitLogFormPage } from './pages/visit-log/VisitLogFormPage';
import { ActionProgramIndexPage } from './pages/action-program/ActionProgramIndexPage';
import { ActionProgramDetailPage } from './pages/action-program/ActionProgramDetailPage';
import { ActionProgramFormPage } from './pages/action-program/ActionProgramFormPage';
import { EventProposalIndexPage } from './pages/event-proposal/EventProposalIndexPage';
import { EventProposalDetailPage } from './pages/event-proposal/EventProposalDetailPage';
import { EventProposalFormPage } from './pages/event-proposal/EventProposalFormPage';
import { UsersIndexPage } from './pages/users/UsersIndexPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { UserFormPage } from './pages/users/UserFormPage';
import { RolesIndexPage } from './pages/access-control/RolesIndexPage';
import { RoleFormPage } from './pages/access-control/RoleFormPage';
import { ActivityLogsIndexPage } from './pages/activity-logs/ActivityLogsIndexPage';
import { ActivityLogDetailPage } from './pages/activity-logs/ActivityLogDetailPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/login',
    element: <PublicLayout />,
    children: [
      {
        index: true,
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
        path: 'invoice',
        children: [
          { index: true, element: <InvoiceIndexPage /> },
          { path: 'create', element: <InvoiceFormPage /> },
          { path: ':id', element: <InvoiceDetailPage /> },
          { path: ':id/edit', element: <InvoiceFormPage /> },
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
        path: 'roles',
        children: [
          { index: true, element: <RolesIndexPage /> },
          { path: 'create', element: <RoleFormPage /> },
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
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);