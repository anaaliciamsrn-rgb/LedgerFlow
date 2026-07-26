import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface ComingSoonProps {
  readonly title: string;
}

export function ComingSoon({ title }: ComingSoonProps): React.ReactNode {
  return (
    <EmptyState
      icon={Construction}
      title={title}
      description="Esta funcionalidade está em desenvolvimento."
    />
  );
}