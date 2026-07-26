import { FileText } from 'lucide-react';
import { PagePlaceholder } from '@/components/ui/page-placeholder';

export default function DocumentsPage(): React.ReactNode {
  return (
    <PagePlaceholder
      title="Documentos"
      description="Central de documentos com OCR e classificação automática."
      icon={FileText}
    />
  );
}
