type LatestDocuments = Array<Record<string, unknown>> | null;

export interface StoredUserData {
  User_email: string;
  User_ID: string;
  User_name: string;
  User_surname: string;
  User_picture: string | null;
  documents: LatestDocuments;
}

export interface UserProfile {
  email: string | null;
  name: string | null;
  surname: string | null;
  id: string | null;
  picture: string | null;
  documents: LatestDocuments;
}

const STORAGE_KEY = "user_login_raw";

const getRuntime = () =>
  typeof globalThis !== "undefined" ? globalThis : undefined;

const getSafeStorage = (): Storage | null => {
  try {
    const runtime = getRuntime();
    if (!runtime?.localStorage) {
      return null;
    }
    return runtime.localStorage;
  } catch {
    return null;
  }
};

export const storage = getSafeStorage();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const sanitizeDocuments = (value: unknown): LatestDocuments => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value as LatestDocuments;
};

const sanitizeUserData = (user: Partial<StoredUserData>): StoredUserData => ({
  User_email: typeof user.User_email === "string" ? user.User_email : "",
  User_ID: typeof user.User_ID === "string" ? user.User_ID : "",
  User_name: typeof user.User_name === "string" ? user.User_name : "",
  User_surname: typeof user.User_surname === "string" ? user.User_surname : "",
  User_picture:
    typeof user.User_picture === "string" ? user.User_picture : null,
  documents: sanitizeDocuments(user.documents),
});

const parseStoredUser = (raw: string | null): StoredUserData | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return null;
    }
    return sanitizeUserData(parsed as Partial<StoredUserData>);
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    return null;
  }
};

export const getStoredUserData = (): StoredUserData | null => {
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEY);
  return parseStoredUser(raw);
};

export const setStoredUserData = (user: StoredUserData | null): void => {
  if (!storage) {
    return;
  }

  try {
    if (!user) {
      storage.removeItem(STORAGE_KEY);
      return;
    }

    const serialized = JSON.stringify(sanitizeUserData(user));
    storage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.warn("Failed to persist user data", error);
  }
};

export const clearStoredUserData = (): void => {
  setStoredUserData(null);
};

export const mapUserToProfile = (user: StoredUserData | null): UserProfile => {
  if (!user) {
    return {
      email: null,
      name: null,
      surname: null,
      id: null,
      picture: null,
      documents: null,
    };
  }

  const sanitized = sanitizeUserData(user);

  return {
    email: sanitized.User_email || null,
    name: sanitized.User_name || null,
    surname: sanitized.User_surname || null,
    id: sanitized.User_ID || null,
    picture: sanitized.User_picture,
    documents: sanitized.documents,
  };
};

export const getStoredProfile = (): UserProfile => {
  const user = getStoredUserData();
  return mapUserToProfile(user);
};

export const getStoredUserId = (): string | null => {
  const user = getStoredUserData();
  return user?.User_ID || null;
};
