import { useState, useEffect } from 'react';
import type { ClusterConfig, Insight } from '../lib/types';
import * as storage from '../lib/storage';
import { runRules } from '../rules';
import { useDashboardData } from './hooks/useDashboardData';
import { SummaryStats } from './SummaryStats';
import { InsightsPanel } from './InsightsPanel';
import { OverviewTab } from './tabs/OverviewTab';
import { CollectionsTab } from './tabs/CollectionsTab';
import { ShardsTab } from './tabs/ShardsTab';
import { TransfersTab } from './tabs/TransfersTab';
import { ClusterTab } from './tabs/ClusterTab';
import { RequestsTab } from './tabs/RequestsTab';

type TabName = 'overview' | 'collections' | 'shards' | 'transfers' | 'cluster' | 'requests';

const TABS: { key: TabName; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'collections', label: 'Collections' },
  { key: 'shards', label: 'Shard Distribution' },
  { key: 'transfers', label: 'Transfers' },
  { key: 'cluster', label: 'Cluster' },
  { key: 'requests', label: 'Requests' },
];

export function Dashboard() {
  const [cluster, setCluster] = useState<ClusterConfig | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const [lastUpdated, setLastUpdated] = useState('');
  const { data, loading, error, refresh } = useDashboardData(cluster);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clusterId = params.get('cluster');
    if (!clusterId) return;

    storage.getClusters().then(clusters => {
      const found = clusters.find(c => c.id === clusterId);
      if (found) {
        setCluster(found);
        document.title = `Qdrant - ${found.name}`;
      }
    });
  }, []);

  useEffect(() => {
    if (cluster) refresh();
  }, [cluster]);

  useEffect(() => {
    if (data) setLastUpdated(new Date().toLocaleTimeString());
  }, [data]);

  const insights: Insight[] = data ? runRules(data) : [];
  const version = data?.telemetry?.app?.version;
  const nodeCount = Object.keys(data?.nodeTelemetry || {}).length;
  const totalPeers = data?.cluster?.peers ? Object.keys(data.cluster.peers).length : 1;

  if (!cluster) {
    return <div className="container"><div className="error-box">No cluster specified. Open a cluster from the popup.</div></div>;
  }

  return (
    <div className="container">
      <header>
        <div className="header-left">
          <h1>Qdrant Dashboard</h1>
          <span className="cluster-badge">{cluster.name}</span>
        </div>
        <div className="header-right">
          {version && <span className="version-badge">v{version}</span>}
          {data && <span className="version-badge" style={{ color: nodeCount >= totalPeers ? 'var(--success)' : 'var(--warning)' }}>{nodeCount}/{totalPeers} nodes</span>}
          {lastUpdated && <span className="last-updated">Updated: {lastUpdated}</span>}
          <button className="btn btn-refresh" onClick={refresh} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      {loading && !data && (
        <div className="loading"><div className="spinner" /><p>Connecting to cluster...</p></div>
      )}

      {error && <div className="error-box">{error}</div>}

      {data && (
        <>
          <SummaryStats data={data} />
          <InsightsPanel insights={insights} />

          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'collections' && <CollectionsTab data={data} insights={insights} />}
          {activeTab === 'shards' && <ShardsTab data={data} />}
          {activeTab === 'transfers' && <TransfersTab data={data} />}
          {activeTab === 'cluster' && <ClusterTab data={data} />}
          {activeTab === 'requests' && <RequestsTab data={data} />}
        </>
      )}
    </div>
  );
}
