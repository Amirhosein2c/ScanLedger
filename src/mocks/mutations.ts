"use client";

/**
 * Centralised mock payloads for mutation hooks.
 * Each hook can import the relevant constant so that, if the backend
 * returns an empty response, we still propagate a predictable shape
 * back to the UI.
 */

export const LOGIN_MUTATION_MOCK_RESPONSE = {
  User_ID: "mock-user-id",
  token: "mock-session-token",
  status: "offline-mock",
};

export const OCR_UPLOAD_MUTATION_MOCK_RESPONSE = JSON.stringify({
  docId: "mock-doc-id",
  documentClass: "mock_document",
  result: { amount: "10000$", vendor: "argoman", date: "1400/01/01" },
});

export const CONFIRM_OCR_MUTATION_MOCK_RESPONSE = "CONFIRMATION_RECEIVED";

export const SIGNUP_MUTATION_MOCK_RESPONSE = [
  {
    user_id: "mock-signup-user-id",
  },
];
