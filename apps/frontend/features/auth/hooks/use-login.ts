'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { authService } from '@/features/auth/services/auth.service';
import { ApiError } from '@/types/api.types';
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
        await authService.login(input.email, input.password);
        // `refresh` refaz a renderização no servidor, que é onde a sessão é
        // lida do cookie. Sem isso a tela seguinte ainda acharia que não há
        // ninguém logado.
        router.replace(ROUTES.dashboard);
        router.refresh();
      } catch (caught) {
        // 401 é credencial inválida; qualquer outra coisa é falha nossa, e
        // dizer "credenciais inválidas" mandaria o usuário conferir a senha
        // por um problema que não é dele.
        setError(
          caught instanceof ApiError && caught.status === 401
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível entrar. Tente novamente em instantes.',
        );
        setIsPending(false);
      }
    },
    [router],
  );

  return { isPending, error, login };
}
