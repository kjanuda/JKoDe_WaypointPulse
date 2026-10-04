import {
  clearAuth,
  getAccessToken,
  refreshAccessToken,
} from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

interface ApiOptions extends RequestInit {
  retry?: boolean;
}

export async function apiFetch(
  path: string,
  options: ApiOptions = {},
) {
  const {
    retry = true,
    headers,
    ...rest
  } = options;

  const token = getAccessToken();

  const requestHeaders = new Headers(headers);

  if (token) {
    requestHeaders.set(
      "Authorization",
      `Bearer ${token}`,
    );
  }

  if (
    rest.body &&
    !requestHeaders.has("Content-Type")
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }

  let response = await fetch(
    `${API_URL}${path}`,
    {
      ...rest,
      headers: requestHeaders,
      credentials: "include",
    },
  );

  if (
    response.status === 401 &&
    retry
  ) {
    const newToken =
      await refreshAccessToken();

    if (!newToken) {
      clearAuth();
      return response;
    }

    requestHeaders.set(
      "Authorization",
      `Bearer ${newToken}`,
    );

    response = await fetch(
      `${API_URL}${path}`,
      {
        ...rest,
        headers: requestHeaders,
        credentials: "include",
      },
    );
  }

  return response;
}