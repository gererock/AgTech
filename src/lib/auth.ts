export const AUTH_COOKIE_NAME = "agtech-auth";
export const AUTH_STORAGE_KEY = "agtech-auth";
export const AUTH_USER_EMAIL_KEY = "agtech-user-email";

export function setAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=true; path=/; max-age=86400; SameSite=Lax`;
  window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${AUTH_USER_EMAIL_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.split("=")[1];

  const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  return cookieValue === "true" || storedValue === "true";
}
