type LatestDocuments = Array<Record<string, string | null>> | null;

export interface StoredUserData {
  User_Email: string;
  User_ID: string;
  User_Name: string;
  User_Surname: string;
  User_Picture: string | null;
  Latest_Documents: LatestDocuments;
}

export interface UserProfile {
  email: string | null;
  name: string | null;
  surname: string | null;
  id: string | null;
  picture: string | null;
  latestDocuments: LatestDocuments;
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
  User_Email: typeof user.User_Email === "string" ? user.User_Email : "",
  User_ID: typeof user.User_ID === "string" ? user.User_ID : "",
  User_Name: typeof user.User_Name === "string" ? user.User_Name : "",
  User_Surname:
    typeof user.User_Surname === "string" ? user.User_Surname : "",
  User_Picture:
    typeof user.User_Picture === "string" ? user.User_Picture : null,
  Latest_Documents: sanitizeDocuments(user.Latest_Documents),
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
      latestDocuments: null,
    };
  }

  const sanitized = sanitizeUserData(user);

  return {
    email: sanitized.User_Email || null,
    name: sanitized.User_Name || null,
    surname: sanitized.User_Surname || null,
    id: sanitized.User_ID || null,
    picture: sanitized.User_Picture,
    latestDocuments: sanitized.Latest_Documents,
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
