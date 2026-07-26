import { Settings } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function SettingsPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Configurações"
      description="Gerencie workspace, usuários, permissões e preferências."
      icon={Settings}
    />
  );
}
