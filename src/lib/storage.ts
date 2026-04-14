import type { ClusterConfig } from './types';

export async function getClusters(): Promise<ClusterConfig[]> {
  const data = await chrome.storage.local.get('clusters') as { clusters?: ClusterConfig[] };
  return data.clusters || [];
}

export async function saveClusters(clusters: ClusterConfig[]): Promise<void> {
  await chrome.storage.local.set({ clusters });
}

export async function addCluster(cluster: Omit<ClusterConfig, 'id' | 'addedAt'>): Promise<ClusterConfig> {
  const clusters = await getClusters();
  const newCluster: ClusterConfig = {
    ...cluster,
    id: crypto.randomUUID(),
    addedAt: new Date().toISOString(),
  };
  clusters.push(newCluster);
  await saveClusters(clusters);
  return newCluster;
}

export async function updateCluster(id: string, updates: Partial<ClusterConfig>): Promise<ClusterConfig> {
  const clusters = await getClusters();
  const index = clusters.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Cluster not found');
  clusters[index] = { ...clusters[index], ...updates };
  await saveClusters(clusters);
  return clusters[index];
}

export async function removeCluster(id: string): Promise<void> {
  const clusters = await getClusters();
  await saveClusters(clusters.filter(c => c.id !== id));
}
