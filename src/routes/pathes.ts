const PATHES = Object.freeze({
  ROOT: "/",
  LOGIN: "login",
  SIGNUP: "signup",
  DASHBOARD: "dashboard",
  DOCUMENTS_SCAN: "documents/scan",
  DOCUMENTS_SEARCH: "documents/search",
  DOCUMENTS_DETAILS: "documents/details",
  TEMPLATES_ROOT: "templates",
  TEMPLATES_DETAIL: "templates/:templateId",
  DATA_EXPORT: "data/export",
  PROFILE: "profile",
} as const);

export type PathKey = keyof typeof PATHES;

export default PATHES;
