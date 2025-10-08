import { Navigate } from 'react-router-dom';
import WelcomeOnboarding from '../pages/WelcomeOnboarding.jsx';
import LoginRegistration from '../pages/LoginRegistration.jsx';
import NewUserSignup from '../pages/NewUserSignup.jsx';
import DashboardOverview from '../pages/DashboardOverview.jsx';
import DocumentScan from '../pages/DocumentScan.jsx';
import DocumentManagementSearch from '../pages/DocumentManagementSearch.jsx';
import DataExportOptions from '../pages/DataExportOptions.jsx';
import UserProfileSettings from '../pages/UserProfileSettings.jsx';
import DocumentDetailsEdit from '../pages/DocumentDetailsEdit.jsx';
import TemplateDetail from '../pages/TemplateDetail.jsx';
import DefaultTemplates from '../pages/DefaultTemplates.jsx';
import PATHES from './pathes.js';

const appRoutes = [
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
  { path: '*', element: <Navigate replace to={PATHES.ROOT} /> },
];

export default appRoutes;
