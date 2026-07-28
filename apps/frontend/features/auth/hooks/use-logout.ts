'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ROUTES } from '@/constants/routes';
import { authService } from '@/features/auth/services/auth.service';
import { toast } from '@/components/ui/toast';

interface UseLogoutResult {
  readonly isPending: boolean;
  readonly logout: () => Promise<void>;
}

export function useLogout(): UseLogoutResult {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const logout = useCallback(async (): Promise<void> => {
    setIsPending(true);
    try {
      await authService.logout();
    } catch {
      // Falha de rede não pode prender ninguém dentro do sistema: seguimos
      // para o login de qualquer forma. O cookie é httpOnly e expira sozinho.
      toast.error('Não foi possível avisar o servidor, mas você saiu daqui.');
    } finally {
      // Limpa o cache: sem isso a próxima pessoa a entrar nesta máquina veria,
      // por um instante, os dados de quem saiu.
      queryClient.clear();
      router.replace(ROUTES.login);
      router.refresh();
    }
  }, [queryClient, router]);

  return { isPending, logout };
}
