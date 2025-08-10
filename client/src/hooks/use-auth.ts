import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

interface AuthResponse {
  user: User;
  message: string;
}

// API functions
const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }
    
    return response.json();
  },

  logout: async (): Promise<void> => {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    
    if (!response.ok) {
      throw new Error("Logout failed");
    }
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return { user: null as any };
      }
      throw new Error("Failed to get user");
    }
    
    return response.json();
  },
};

// Hooks
export const useUser = () => {
  const query = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: query.data?.user || null,
    isLoading: query.isLoading,
    error: query.error,
  };
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], { user: data.user });
      navigate("/dashboard");
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], { user: null });
      navigate("/login");
    },
  });
};