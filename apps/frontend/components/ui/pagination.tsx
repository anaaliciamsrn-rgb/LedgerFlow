'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly className?: string;
}

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps): React.ReactNode {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Paginação" className={cn('flex items-center justify-between gap-2', className)}>
      <p className="text-sm text-muted-foreground">
        Página <span className="font-medium text-foreground">{page}</span> de{' '}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious} aria-label="Página anterior">
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={!canGoNext} aria-label="Próxima página">
          Próxima
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}