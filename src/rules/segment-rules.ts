import { registerRule } from './rule-engine';
import type { DashboardData, Telemetry, Insight } from '../lib/types';

function allNodeTelemetries(ctx: DashboardData): [string, Telemetry][] {
  if (ctx.nodeTelemetry && Object.keys(ctx.nodeTelemetry).length > 0) {
    return Object.entries(ctx.nodeTelemetry);
  }
  if (ctx.telemetry) return [[ctx.cluster?.peer_id?.toString() || 'local', ctx.telemetry]];
  return [];
}

registerRule('shard-high-segment-count', (ctx) => {
  const insights: Insight[] = [];
  const checked = new Set<string>();
  for (const [peerId, nodeTel] of allNodeTelemetries(ctx)) {
    for (const coll of (nodeTel?.collections?.collections || [])) {
      for (const shard of (coll.shards || [])) {
        const key = `${coll.id}-${shard.id}`;
        if (checked.has(key)) continue;
        checked.add(key);
        const segCount = shard.local?.segments?.length;
        if (segCount && segCount > 10) {
          insights.push({ level: 'warning' as const, category: 'optimizer', collection: coll.id, shard: shard.id, node: peerId, title: `Shard ${shard.id}: ${segCount} segments`, detail: 'High per-shard segment count can slow searches. May indicate optimizer has not completed merging.' });
        }
      }
    }
  }
  return insights;
});

registerRule('deleted-vectors-ratio', (ctx) => {
  const insights: Insight[] = [];
  for (const [peerId, nodeTel] of allNodeTelemetries(ctx)) {
    for (const coll of (nodeTel?.collections?.collections || [])) {
      for (const shard of (coll.shards || [])) {
        for (const seg of (shard.local?.segments || [])) {
          const info = seg.info;
          const total = (info.num_vectors || 0) + (info.num_deleted_vectors || 0);
          if (total > 0 && info.num_deleted_vectors > 0) {
            const pct = (info.num_deleted_vectors / total) * 100;
            if (pct > 20) {
              insights.push({ level: 'warning' as const, category: 'optimizer', collection: coll.id, shard: shard.id, node: peerId, title: `High deleted vectors (${pct.toFixed(0)}%) in shard ${shard.id}`, detail: `Segment ${(info.uuid || '').slice(0, 8)}... has ${info.num_deleted_vectors} deleted vectors. Optimizer should vacuum these.` });
            }
          }
        }
      }
    }
  }
  return insights;
});

registerRule('shard-optimizer-error', (ctx) => {
  const insights: Insight[] = [];
  for (const [peerId, nodeTel] of allNodeTelemetries(ctx)) {
    for (const coll of (nodeTel?.collections?.collections || [])) {
      for (const shard of (coll.shards || [])) {
        const opt = shard.local?.optimizations;
        if (opt?.status && opt.status !== 'ok') {
          insights.push({ level: 'critical' as const, category: 'optimizer', collection: coll.id, shard: shard.id, node: peerId, title: `Optimizer issue in shard ${shard.id}`, detail: `Status: ${JSON.stringify(opt.status)}. Check logs for this node.` });
        }
      }
    }
  }
  return insights;
});

registerRule('replica-not-active', (ctx) => {
  const insights: Insight[] = [];
  const checked = new Set<string>();
  for (const [, nodeTel] of allNodeTelemetries(ctx)) {
    for (const coll of (nodeTel?.collections?.collections || [])) {
      for (const shard of (coll.shards || [])) {
        for (const [rpId, state] of Object.entries(shard.replicate_states || {})) {
          const key = `${coll.id}-${shard.id}-${rpId}`;
          if (checked.has(key)) continue;
          checked.add(key);
          if (state !== 'Active') {
            insights.push({ level: state === 'Dead' ? 'critical' as const : 'warning' as const, category: 'replication', collection: coll.id, shard: shard.id, node: rpId, title: `Replica ${state} for shard ${shard.id}`, detail: `Peer ${rpId} replica is in "${state}" state. Replication may be degraded.` });
          }
        }
      }
    }
  }
  return insights;
});

registerRule('shard-recovery-in-progress', (ctx) => {
  const insights: Insight[] = [];
  for (const [peerId, nodeTel] of allNodeTelemetries(ctx)) {
    for (const coll of (nodeTel?.collections?.collections || [])) {
      for (const shard of (coll.shards || [])) {
        if (shard.partial_snapshot?.is_recovering) {
          insights.push({ level: 'warning' as const, category: 'replication', collection: coll.id, shard: shard.id, node: peerId, title: `Shard ${shard.id} recovery in progress`, detail: 'Partial snapshot recovery is active. Shard may not be fully available.' });
        }
      }
    }
  }
  return insights;
});
