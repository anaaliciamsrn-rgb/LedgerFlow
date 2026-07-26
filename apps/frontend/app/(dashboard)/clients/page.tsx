import { Users } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function ClientsPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Clientes"
      description="Gerencie os clientes vinculados às empresas da sua carteira."
      icon={Users}
    />
  );
}
