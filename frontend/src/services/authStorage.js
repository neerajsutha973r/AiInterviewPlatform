export const AUTH_STORAGE_ERROR = "Secure browser session storage is unavailable. Allow session storage in your browser and try again.";

const withSessionStorage = (operation) => {
  try {
    // Accessing the storage property itself can throw, before any method runs.
    return operation(globalThis.sessionStorage);
  } catch {
    const error = new Error(AUTH_STORAGE_ERROR);
    error.code = "AUTH_STORAGE_UNAVAILABLE";
    throw error;
  }
};

export const getSessionToken = () => withSessionStorage(storage => storage.getItem("token"));
export const saveSessionToken = (token) => withSessionStorage(storage => {
  storage.setItem("token", token);
  if (storage.getItem("token") !== token) throw new Error();
});
export const removeSessionToken = () => withSessionStorage(storage => storage.removeItem("token"));

export const cleanupLegacyToken = () => {
  try {
    // Never read or migrate persistent authentication. Cleanup is best-effort.
    globalThis.localStorage.removeItem("token");
  } catch {
    // Denied legacy storage must not prevent the application from loading.
  }
};
