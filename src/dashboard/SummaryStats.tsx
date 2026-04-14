import type { DashboardData } from '../lib/types';
import { formatNumber } from '../lib/format';

export function SummaryStats({ data }: { data: DashboardData }) {
  const { cluster, collections, collectionDetails, telemetry } = data;
  const peerCount = cluster?.peers ? Object.keys(cluster.peers).length : 1;

  let totalPoints = 0, totalSegments = 0, allOptimizersOk = true;
  for (const name of collections) {
    const detail = collectionDetails[name];
    if (detail?.info) {
      totalPoints += detail.info.points_count || 0;
      totalSegments += detail.info.segments_count || 0;
      const opt = detail.info.optimizer_status;
      if (opt && opt !== 'ok') allOptimizersOk = false;
    }
  }

  const sys = telemetry?.app?.system;
  const mem = telemetry?.memory;
  const ramBytes = sys?.ram_size ? sys.ram_size * 1024 : 0;
  const memPct = ramBytes && mem?.resident_bytes ? ((mem.resident_bytes / ramBytes) * 100).toFixed(0) : '?';
  const memColor = Number(memPct) > 80 ? 'red' : Number(memPct) > 60 ? 'yellow' : 'green';
  const optColor = allOptimizersOk ? 'green' : 'yellow';

  return (
    <div className="summary-stats">
      <div className="summary-stat"><div className="value">{peerCount}</div><div className="label">Nodes</div></div>
      <div className="summary-stat"><div className="value">{collections.length}</div><div className="label">Collections</div></div>
      <div className="summary-stat"><div className="value">{formatNumber(totalPoints)}</div><div className="label">Total Points</div></div>
      <div className="summary-stat"><div className="value">{totalSegments}</div><div className="label">Total Segments</div></div>
      <div className="summary-stat"><div className={`value ${optColor}`}>{allOptimizersOk ? 'OK' : 'Active'}</div><div className="label">Optimizer</div></div>
      <div className="summary-stat"><div className={`value ${memColor}`}>{memPct}%</div><div className="label">Memory</div></div>
      <div className="summary-stat"><div className="value">{sys?.cores || '?'}</div><div className="label">CPU Cores</div></div>
    </div>
  );
}
