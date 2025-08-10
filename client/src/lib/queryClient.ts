import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { method = "GET", body, headers = {} } = options;
  
  // Get CSRF token from cookies if needed for non-GET requests
  let csrfToken = null;
  if (method !== "GET") {
    try {
      const tokenResponse = await fetch("/api/csrf-token", {
        credentials: "include",
      });
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        csrfToken = tokenData.csrfToken;
      }
    } catch (error) {
      console.warn("Failed to fetch CSRF token:", error);
    }
  }

  const finalHeaders = {
    ...headers,
    ...(body && { "Content-Type": "application/json" }),
    ...(csrfToken && { "X-CSRF-Token": csrfToken }),
  };

  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
