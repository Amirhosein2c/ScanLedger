export interface UserProfile {
  email: string | null;
  name: string | null;
  surname: string | null;
}

interface MergeProfileArgs {
  extracted: UserProfile;
  fallbackEmail?: string | null;
  stored?: UserProfile | null;
}

const getRuntime = () =>
  typeof globalThis !== "undefined" ? globalThis : undefined;

const getSafeStorage = (): Storage | null => {
  const runtime = getRuntime();
  if (!runtime?.localStorage) {
    return null;
  }
  return runtime.localStorage;
};

const emptyProfile = (): UserProfile => ({
  email: null,
  name: null,
  surname: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const storage = getSafeStorage();
export const getStoredProfile = (): UserProfile => {
  if (!storage) {
    return emptyProfile();
  }

  try {
    return {
      email: storage.getItem("user_email"),
      name: storage.getItem("user_name"),
      surname: storage.getItem("user_surname"),
    };
  } catch (error) {
    console.warn("Failed to read profile from storage", error);
    return emptyProfile();
  }
};

export const getStoredUserId = (): string | null => {
  const storage = getSafeStorage();
  if (!storage) {
    return null;
  }

  try {
    return storage.getItem("user_id");
  } catch (error) {
    console.warn("Failed to read user id from storage", error);
    return null;
  }
};

export const extractUserProfile = (payload: unknown): UserProfile => {
  const result = emptyProfile();

  if (!isRecord(payload)) {
    return result;
  }

  const queue: Array<Record<string, unknown>> = [payload];

  const enqueue = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(enqueue);
      return;
    }

    if (isRecord(value)) {
      queue.push(value);
    }
  };

  while (queue.length && (!result.name || !result.surname || !result.email)) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const potentialNested = ["json", "data", "user"] as const;
    potentialNested.forEach((key) => {
      if (isRecord(current[key])) {
        enqueue(current[key]);
      }
    });

    Object.entries(current).forEach(([key, value]) => {
      if (typeof value === "object") {
        enqueue(value);
      }
      const normalized = key.toLowerCase();

      if (
        !result.name &&
        ["name", "firstname", "first_name", "first"].includes(normalized) &&
        typeof value === "string"
      ) {
        result.name = value;
      }
      if (
        !result.surname &&
        [
          "surname",
          "lastname",
          "last_name",
          "last",
          "family",
          "familyname",
        ].includes(normalized) &&
        typeof value === "string"
      ) {
        result.surname = value;
      }
      if (
        !result.email &&
        normalized === "email" &&
        typeof value === "string"
      ) {
        result.email = value;
      }
    });
  }

  return result;
};

const extractUserIdFromRecord = (
  record: Record<string, unknown>
): string | null => {
  if (Object.prototype.hasOwnProperty.call(record, "User_ID")) {
    const value = record["User_ID"];
    if (typeof value === "string") {
      return value;
    }
    if (value != null) {
      return String(value);
    }
  }

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isRecord(item)) {
          const nested = extractUserIdFromRecord(item);
          if (nested) {
            return nested;
          }
        }
      }
      continue;
    }

    if (isRecord(value)) {
      const nested = extractUserIdFromRecord(value);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

export const extractUserId = (payload: unknown): string | null => {
  if (!isRecord(payload)) {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        const extracted = extractUserId(item);
        if (extracted) {
          return extracted;
        }
      }
    }
    return null;
  }

  return extractUserIdFromRecord(payload);
};

export const mergeProfile = ({
  extracted,
  fallbackEmail,
  stored,
}: MergeProfileArgs): UserProfile => {
  const normalizedFallbackEmail = fallbackEmail
    ? fallbackEmail.toLowerCase()
    : null;
  const email =
    extracted.email?.toLowerCase() ||
    stored?.email?.toLowerCase() ||
    normalizedFallbackEmail;

  return {
    email,
    name: extracted.name || stored?.name || null,
    surname: extracted.surname || stored?.surname || null,
  };
};

export const persistUserProfile = (
  profile: UserProfile | null | undefined
): void => {
  const storage = getSafeStorage();
  if (!storage || !profile) {
    return;
  }

  try {
    if (profile.email) {
      storage.setItem("user_email", profile.email.toLowerCase());
    }
    if (profile.name) {
      storage.setItem("user_name", profile.name);
    }
    if (profile.surname) {
      storage.setItem("user_surname", profile.surname);
    }
  } catch (error) {
    console.warn("Failed to persist profile to storage", error);
  }
};

export const persistUserId = (userId: string | null | undefined): void => {
  const storage = getSafeStorage();
  if (!storage) {
    return;
  }

  try {
    if (userId) {
      storage.setItem("user_id", userId);
    } else {
      storage.removeItem("user_id");
    }
  } catch (error) {
    console.warn("Failed to persist user id to storage", error);
  }
};

export const persistLoginPayload = (payload: unknown): void => {
  const storage = getSafeStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem("user_login_raw", JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to persist login payload", error);
  }
};
