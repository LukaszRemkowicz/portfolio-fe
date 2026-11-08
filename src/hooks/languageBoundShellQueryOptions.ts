import { keepPreviousData } from '@tanstack/react-query';

export const languageBoundShellQueryOptions = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnMount: true,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  // On language switch keep the previous text until the new one arrives,
  // instead of flashing the default copy.
  placeholderData: keepPreviousData,
} as const;
