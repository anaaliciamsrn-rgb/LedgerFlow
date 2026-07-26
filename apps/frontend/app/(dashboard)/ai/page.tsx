import { Sparkles } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function AiPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Assistente IA"
      description="Peça análises, relatórios e insights sobre sua carteira."
      icon={Sparkles}
    />
  );
}
