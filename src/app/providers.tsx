/* eslint-disable react/jsx-no-constructed-context-values */
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import usePwaSetup from '../hooks/usePwaSetup';
import { I18nProvider } from '../lib/i18n';

const defaultQueryOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1 as const
  },
  mutations: {
    retry: 0 as const
  }
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: defaultQueryOptions
  });

const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(createQueryClient);
  usePwaSetup();

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
  );
};

export default Providers;
