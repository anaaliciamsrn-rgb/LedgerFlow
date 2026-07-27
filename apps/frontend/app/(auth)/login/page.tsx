import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/login-form';

// White label: o cliente exigiu que o sistema não apresente a identidade
// visual da desenvolvedora. Esta tela é pré-autenticação — não há sessão,
// logo não há `tenant.name` para exibir. Por isso, rótulo neutro.
export const metadata: Metadata = {
  title: 'Entrar · Plataforma Contábil',
  description: 'Acesse sua carteira de clientes',
};

export default function LoginPage(): React.ReactNode {
  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elevation-md">
          <Building2 className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Plataforma Contábil</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestão da sua carteira de clientes</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-elevation-md">
        <div className="mb-6 space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Bem-vindo de volta</h2>
          <p className="text-sm text-muted-foreground">Entre com suas credenciais para continuar</p>
        </div>
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.
      </p>
    </div>
  );
}
