import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import WelcomeOnboarding from '../pages/WelcomeOnboarding';
import LoginRegistration from '../pages/LoginRegistration';
import NewUserSignup from '../pages/NewUserSignup';
import DashboardOverview from '../pages/DashboardOverview';
import DocumentScan from '../pages/DocumentScan';
import DocumentManagementSearch from '../pages/DocumentManagementSearch';
import DataExportOptions from '../pages/DataExportOptions';
import UserProfileSettings from '../pages/UserProfileSettings';
import DocumentDetailsEdit from '../pages/DocumentDetailsEdit';
import TemplateDetail from '../pages/TemplateDetail';
import DefaultTemplates from '../pages/DefaultTemplates';
import PATHES from './pathes';

const appRoutes: RouteObject[] = [
  { path: PATHES.ROOT, element: <WelcomeOnboarding /> },
  { path: PATHES.LOGIN, element: <LoginRegistration /> },
  { path: PATHES.SIGNUP, element: <NewUserSignup /> },
  { path: PATHES.DASHBOARD, element: <DashboardOverview /> },
  { path: PATHES.DOCUMENTS_SCAN, element: <DocumentScan /> },
  { path: PATHES.DOCUMENTS_SEARCH, element: <DocumentManagementSearch /> },
  { path: PATHES.DOCUMENTS_DETAILS, element: <DocumentDetailsEdit /> },
  { path: PATHES.TEMPLATES_ROOT, element: <DefaultTemplates /> },
  { path: PATHES.TEMPLATES_DETAIL, element: <TemplateDetail /> },
  { path: PATHES.DATA_EXPORT, element: <DataExportOptions /> },
  { path: PATHES.PROFILE, element: <UserProfileSettings /> },
  { path: '*', element: <Navigate replace to={PATHES.ROOT} /> }
];

export default appRoutes;
