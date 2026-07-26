import { Workflow } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function WorkflowsPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Fluxos n8n"
      description="Monitore automações, execuções e webhooks em tempo real."
      icon={Workflow}
    />
  );
}
