export type UserRole =
  | "dispatcher"
  | "loader"
  | "driver"
  | "store";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

let accessToken: string | null = null;
let currentUser: AuthUser | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setCurrentUser(user: AuthUser | null) {
  currentUser = user;
}

export function getCurrentUser() {
  return currentUser;
}

export function clearAuth() {
  accessToken = null;
  currentUser = null;
}

export function rolePath(role: UserRole) {
  switch (role) {
    case "dispatcher":
      return "/dispatcher";

    case "loader":
      return "/loader";

    case "driver":
      return "/driver";

    case "store":
      return "/store";

    default:
      return "/login";
  }
}

async function readJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      }
    );
  } catch (error) {
    console.error(
      "Login request failed:",
      error
    );

    throw new Error(
      `Unable to reach the API at ${API_URL}`
    );
  }

  const data = await readJsonSafe(response);

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        `Login failed (${response.status})`
    );
  }

  if (
    !data?.access_token ||
    !data?.user
  ) {
    throw new Error(
      "Invalid login response from server"
    );
  }

  accessToken = data.access_token;
  currentUser = data.user;

  return data as LoginResponse;
}

export async function refreshAccessToken():
  Promise<string | null> {
  let response: Response;

  try {
    response = await fetch(
      `${API_URL}/api/auth/refresh`,
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Refresh request failed:",
      error
    );

    clearAuth();
    return null;
  }

  if (!response.ok) {
    clearAuth();
    return null;
  }

  const data =
    (await readJsonSafe(response)) as
      | RefreshResponse
      | null;

  if (!data?.access_token) {
    clearAuth();
    return null;
  }

  accessToken = data.access_token;

  return accessToken;
}

export async function fetchCurrentUser():
  Promise<AuthUser | null> {
  if (!accessToken) {
    return null;
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}/api/auth/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Current user request failed:",
      error
    );

    return null;
  }

  if (!response.ok) {
    return null;
  }

  const user =
    (await readJsonSafe(response)) as
      | AuthUser
      | null;

  if (!user) {
    return null;
  }

  currentUser = user;

  return user;
}

export async function restoreSession():
  Promise<AuthUser | null> {
  const token =
    await refreshAccessToken();

  if (!token) {
    return null;
  }

  const user =
    await fetchCurrentUser();

  if (!user) {
    clearAuth();
    return null;
  }

  return user;
}

export async function logout() {
  try {
    await fetch(
      `${API_URL}/api/auth/logout`,
      {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }
    );
  } catch (error) {
    console.error(
      "Logout request failed:",
      error
    );
  } finally {
    clearAuth();
  }
}