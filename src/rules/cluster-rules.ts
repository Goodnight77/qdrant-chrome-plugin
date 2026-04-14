import { registerRule } from './rule-engine';
import { formatBytes } from '../lib/format';

registerRule('memory-pressure', (ctx) => {
  const mem = ctx.telemetry?.memory;
  const sys = ctx.telemetry?.app?.system;
  if (!mem?.resident_bytes || !sys?.ram_size) return [];

  const ramBytes = sys.ram_size * 1024;
  const pct = (mem.resident_bytes / ramBytes) * 100;

  if (pct > 80) {
    return [{ level: 'critical', category: 'memory', title: `High memory usage: ${pct.toFixed(1)}% of RAM`, detail: `Resident ${formatBytes(mem.resident_bytes)} / Total ${formatBytes(ramBytes)}. Risk of OOM. Consider enabling quantization, reducing payload indexes, or adding RAM.` }];
  } else if (pct > 60) {
    return [{ level: 'warning', category: 'memory', title: `Memory usage at ${pct.toFixed(1)}% of RAM`, detail: `Resident ${formatBytes(mem.resident_bytes)} / Total ${formatBytes(ramBytes)}. Monitor for growth trends.` }];
  }
  return [];
});

registerRule('raft-pending-operations', (ctx) => {
  const raft = ctx.cluster?.raft_info;
  if (raft && raft.pending_operations > 10) {
    return [{ level: 'warning', category: 'cluster', title: `${raft.pending_operations} pending Raft operations`, detail: 'Consensus operations are backing up. May indicate network issues between nodes.' }];
  }
  return [];
});

registerRule('consensus-not-working', (ctx) => {
  const status = ctx.cluster?.consensus_thread_status?.consensus_thread_status;
  if (status && status !== 'working') {
    return [{ level: 'critical', category: 'cluster', title: `Consensus thread: ${status}`, detail: 'Consensus is not in working state. Cluster coordination may be impaired.' }];
  }
  return [];
});

registerRule('single-node-cluster', (ctx) => {
  const peerCount = Object.keys(ctx.cluster?.peers || {}).length;
  if (peerCount === 1) {
    return [{ level: 'info', category: 'cluster', title: 'Single-node cluster', detail: 'Only one node in the cluster. There is no high availability. A node failure will cause downtime.' }];
  }
  return [];
});
