import { Landmark } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function FiscalPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Fiscal"
      description="Controle obrigações fiscais e apurações por empresa."
      icon={Landmark}
    />
  );
}
