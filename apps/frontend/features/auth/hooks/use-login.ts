'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import type { LoginInput } from '@/features/auth/schemas/login.schema';

interface UseLoginResult {
  readonly isPending: boolean;
  readonly error: string | null;
  readonly login: (input: LoginInput) => Promise<void>;
}

export function useLogin(): UseLoginResult {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(
    async (input: LoginInput): Promise<void> => {
      setIsPending(true);
      setError(null);
      try {
        await new Promise((resolve) => setTimeout(resolve, 900));
        if (input.email.length === 0) {
          throw new Error('Credenciais inválidas');
        }
        router.push(ROUTES.dashboard);
      } catch {
        setError('Não foi possível entrar. Verifique suas credenciais.');
        setIsPending(false);
      }
    },
    [router],
  );

  return { isPending, error, login };
}
