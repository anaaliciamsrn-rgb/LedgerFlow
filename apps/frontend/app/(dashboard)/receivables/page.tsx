import { BarChart3 } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function ReceivablesPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Recebimentos"
      description="Monitore recebimentos, inadimplência e previsões."
      icon={BarChart3}
    />
  );
}
