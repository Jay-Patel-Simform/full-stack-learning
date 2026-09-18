import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLogin } from "@/features/auth/session";
import type { User } from "@/features/auth/session";

/**
 * Two calls, one button. Register makes the row; login makes the session.
 * ! Nothing here touches SESSION_KEY. useLogin's own onSuccess seeds it,
 * ! and it is allowed to, because ITS reply carried the cookie.
 */
export function useRegister() {
  const login = useLogin();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      await api.post<User>("/auth/register", credentials); // 201, no cookie
      return login.mutateAsync(credentials); // 200, cookie
    },
  });
}
