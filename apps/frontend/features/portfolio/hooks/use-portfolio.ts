'use client';

import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '@/features/portfolio/services/portfolio.service';
import type { PortfolioFilters } from '@/features/portfolio/types/portfolio.types';

export function usePortfolio(filters: PortfolioFilters) {
  return useQuery({
    queryKey: ['portfolio', filters],
    queryFn: ({ signal }) => portfolioService.get(filters, signal),
  });
}
