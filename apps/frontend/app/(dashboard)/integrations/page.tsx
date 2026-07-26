import { Plug } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function IntegrationsPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Integrações"
      description="Conecte serviços externos e mantenha dados sincronizados."
      icon={Plug}
    />
  );
}
