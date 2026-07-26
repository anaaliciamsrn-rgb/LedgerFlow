import { BarChart3 } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function ReportsPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Relatórios"
      description="Gere relatórios comparativos e exporte em PDF ou Excel."
      icon={BarChart3}
    />
  );
}
