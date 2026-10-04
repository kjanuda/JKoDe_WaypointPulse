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

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ?? "Login failed"
    );
  }

  accessToken = data.access_token;
  currentUser = data.user;

  return data;
}

export async function refreshAccessToken() {
  const response = await fetch(
    `${API_URL}/api/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    clearAuth();
    return null;
  }

  const data = await response.json();

  accessToken = data.access_token;

  return accessToken;
}

export async function fetchCurrentUser() {
  if (!accessToken) {
    return null;
  }

  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    return null;
  }

  const user: AuthUser = await response.json();

  currentUser = user;

  return user;
}

export async function restoreSession() {
  const token = await refreshAccessToken();

  if (!token) {
    return null;
  }

  return fetchCurrentUser();
}

export async function logout() {
  try {
    await fetch(
      `${API_URL}/api/auth/logout`,
      {
        method: "POST",
        credentials: "include",
      }
    );
  } finally {
    clearAuth();
  }
}