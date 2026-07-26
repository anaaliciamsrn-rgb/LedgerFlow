import { Wallet } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function FinancePage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Financeiro"
      description="Acompanhe o fluxo financeiro consolidado da carteira."
      icon={Wallet}
    />
  );
}
