import { useState, useCallback } from 'react';
import type { DashboardData, ClusterConfig } from '../../lib/types';
import { QdrantApi } from '../../lib/qdrant-api';

interface UseDashboardDataResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardData(cluster: ClusterConfig | null): UseDashboardDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!cluster) return;
    setLoading(true);
    setError(null);
    try {
      const api = new QdrantApi(cluster.url, cluster.apiKey);
      const result = await api.getDashboardData();
      setData(result);
    } catch (e) {
      setError(`Failed to load data: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [cluster?.url, cluster?.apiKey]);

  return { data, loading, error, refresh };
}
