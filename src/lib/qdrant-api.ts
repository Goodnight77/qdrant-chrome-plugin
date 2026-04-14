import type {
  ClusterInfo,
  CollectionInfo,
  CollectionClusterInfo,
  Telemetry,
  DashboardData,
  QdrantResponse,
} from './types';

export class QdrantApi {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey || '';
  }

  private async _fetch<T>(path: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['api-key'] = this.apiKey;

    const response = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json() as Promise<T>;
  }

  async healthz(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        headers: this.apiKey ? { 'api-key': this.apiKey } : {},
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCluster(): Promise<ClusterInfo> {
    const data = await this._fetch<QdrantResponse<ClusterInfo>>('/cluster');
    return data.result;
  }

  async getCollections(): Promise<string[]> {
    const data = await this._fetch<QdrantResponse<{ collections: { name: string }[] }>>('/collections');
    return data.result.collections.map(c => c.name);
  }

  async getCollection(name: string): Promise<CollectionInfo> {
    const data = await this._fetch<QdrantResponse<CollectionInfo>>(`/collections/${encodeURIComponent(name)}`);
    return data.result;
  }

  async getCollectionCluster(name: string): Promise<CollectionClusterInfo> {
    const data = await this._fetch<QdrantResponse<CollectionClusterInfo>>(`/collections/${encodeURIComponent(name)}/cluster`);
    return data.result;
  }

  async getTelemetry(): Promise<Telemetry> {
    const data = await this._fetch<QdrantResponse<Telemetry>>('/telemetry?details_level=10');
    return data.result;
  }

  // Collect telemetry from all nodes behind a load balancer
  private async collectAllNodeTelemetry(peerCount: number): Promise<Record<string, Telemetry>> {
    const byId: Record<string, Telemetry> = {};
    const maxAttempts = Math.max(peerCount * 3, 6);
    const batchSize = Math.min(peerCount, 4);

    for (let attempt = 0; attempt < maxAttempts && Object.keys(byId).length < peerCount; attempt += batchSize) {
      const remaining = Math.min(batchSize, maxAttempts - attempt);
      const batch: Promise<Telemetry | null>[] = [];
      for (let i = 0; i < remaining; i++) {
        batch.push(this.getTelemetry().catch(() => null));
      }
      const results = await Promise.all(batch);
      for (const tel of results) {
        if (tel?.id && !byId[tel.id]) {
          byId[tel.id] = tel;
          if (Object.keys(byId).length >= peerCount) break;
        }
      }
    }

    return byId;
  }

  // Map telemetry id -> peer_id using cluster.status.peer_id inside telemetry
  private static mapTelemetryToNodes(telemetryById: Record<string, Telemetry>): Record<string, Telemetry> {
    const nodeTelemetry: Record<string, Telemetry> = {};
    for (const [telId, tel] of Object.entries(telemetryById)) {
      const peerId = tel.cluster?.status?.peer_id?.toString();
      nodeTelemetry[peerId || telId] = tel;
    }
    return nodeTelemetry;
  }

  async getDashboardData(): Promise<DashboardData> {
    const [cluster, collections] = await Promise.all([
      this.getCluster(),
      this.getCollections(),
    ]);

    const peerCount = cluster?.peers ? Object.keys(cluster.peers).length : 1;

    const collectionDetails: DashboardData['collectionDetails'] = {};
    const [, telemetryById] = await Promise.all([
      Promise.all(
        collections.map(async (name) => {
          try {
            const [info, clusterInfo] = await Promise.all([
              this.getCollection(name),
              this.getCollectionCluster(name).catch(() => undefined),
            ]);
            collectionDetails[name] = { info, cluster: clusterInfo };
          } catch (e) {
            collectionDetails[name] = { error: (e as Error).message };
          }
        })
      ),
      this.collectAllNodeTelemetry(peerCount),
    ]);

    const nodeTelemetry = QdrantApi.mapTelemetryToNodes(telemetryById);
    const telemetry = Object.values(nodeTelemetry)[0] || null;

    console.log(`Telemetry collected from ${Object.keys(nodeTelemetry).length}/${peerCount} nodes`);

    return { cluster, collections, collectionDetails, telemetry, nodeTelemetry };
  }
}
