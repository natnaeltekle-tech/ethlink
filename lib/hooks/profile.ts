import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useProfile() {
  const { data, error, mutate, isLoading } = useSWR('/api/user/profile', fetcher, {
    // This is the magic for your "manual refresh" problem:
    revalidateOnFocus: true, // Auto-refreshes when user returns to the app
    revalidateIfStale: true,  // Ensures data is fresh on every mount
    dedupingInterval: 2000,  // Prevents double-fetching if they click fast
  });

  return {
    profile: data,
    isLoading,
    isError: error,
    refresh: mutate, // You can still call this manually if needed
  };
}