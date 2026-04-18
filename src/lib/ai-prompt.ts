import type { Insight, DashboardData, CollectionInfo, VectorConfig } from './types';

function bucketCount(n: number | undefined | null): string {
  if (!n || n < 0) return '0';
  if (n < 1_000) return '<1K';
  if (n < 10_000) return '~1K-10K';
  if (n < 100_000) return '~10K-100K';
  if (n < 1_000_000) return '~100K-1M';
  if (n < 10_000_000) return '~1M-10M';
  if (n < 100_000_000) return '~10M-100M';
  return '>100M';
}

function describeVectors(vectors: CollectionInfo['config']['params']['vectors']): string[] {
  const out: string[] = [];
  if (!vectors) return out;
  if ('size' in vectors && typeof (vectors as VectorConfig).size === 'number') {
    const v = vectors as VectorConfig;
    out.push(`single unnamed vector: ${v.size}d / ${v.distance}${v.on_disk ? ' (on disk)' : ''}`);
  } else {
    const named = vectors as Record<string, VectorConfig>;
    const keys = Object.keys(named);
    out.push(`${keys.length} named vector(s):`);
    for (const k of keys.slice(0, 4)) {
      const v = named[k];
      out.push(`  - <name>: ${v.size}d / ${v.distance}${v.on_disk ? ' (on disk)' : ''}`);
    }
    if (keys.length > 4) out.push(`  - …and ${keys.length - 4} more`);
  }
  return out;
}

function buildCollectionContext(info: CollectionInfo, nodeCount: number): string[] {
  const lines: string[] = [];
  const params = info.config?.params;
  const opt = info.config?.optimizer_config;
  const hnsw = info.config?.hnsw_config;
  const quant = info.config?.quantization_config;

  lines.push('**Anonymized context (collection):**');
  lines.push(`- Status: ${info.status || 'unknown'}`);
  lines.push(`- Total points: ${bucketCount(info.points_count)}`);
  lines.push(`- Indexed vectors: ${bucketCount(info.indexed_vectors_count)}`);
  lines.push(`- Segment count: ${info.segments_count ?? 0}`);
  lines.push(`- Shards: ${params?.shard_number ?? '?'}, replication factor: ${params?.replication_factor ?? '?'}, write consistency: ${params?.write_consistency_factor ?? '?'}`);
  lines.push(`- Cluster nodes: ${nodeCount}`);
  if (params?.on_disk_payload != null) lines.push(`- On-disk payload: ${params.on_disk_payload ? 'yes' : 'no'}`);

  for (const l of describeVectors(params?.vectors)) lines.push(`- ${l}`);

  if (hnsw) {
    lines.push(`- HNSW: m=${hnsw.m}, ef_construct=${hnsw.ef_construct}, full_scan_threshold=${hnsw.full_scan_threshold}, on_disk=${hnsw.on_disk ? 'yes' : 'no'}`);
  }
  if (opt) {
    const parts = [
      `indexing_threshold=${opt.indexing_threshold}`,
      `flush_interval_sec=${opt.flush_interval_sec}`,
      `deleted_threshold=${opt.deleted_threshold}`,
      opt.max_segment_size != null ? `max_segment_size=${opt.max_segment_size}` : null,
      opt.default_segment_number != null ? `default_segment_number=${opt.default_segment_number}` : null,
      opt.prevent_unoptimized != null ? `prevent_unoptimized=${opt.prevent_unoptimized}` : null,
    ].filter(Boolean);
    lines.push(`- Optimizer: ${parts.join(', ')}`);
  }
  if (quant) {
    if (quant.scalar) lines.push(`- Quantization: scalar (${quant.scalar.type}, always_ram=${quant.scalar.always_ram ?? false})`);
    else if (quant.product) lines.push(`- Quantization: product (${quant.product.compression})`);
    else if (quant.binary) lines.push('- Quantization: binary');
  } else {
    lines.push('- Quantization: none');
  }
  return lines;
}

function buildClusterContext(data: DashboardData): string[] {
  const lines: string[] = [];
  const cluster = data.cluster;
  const nodeCount = cluster?.peers ? Object.keys(cluster.peers).length : 1;
  const reachable = Object.keys(data.nodeTelemetry || {}).length;
  const raft = cluster?.raft_info;
  const consensus = cluster?.consensus_thread_status?.consensus_thread_status;

  lines.push('**Anonymized context (cluster):**');
  lines.push(`- Total peers: ${nodeCount}, reachable nodes: ${reachable}`);
  lines.push(`- Collections: ${data.collections.length}`);
  if (raft) {
    lines.push(`- Raft: term=${raft.term}, commit=${raft.commit}, pending_operations=${raft.pending_operations}, role=${raft.role}, is_voter=${raft.is_voter}`);
  }
  if (consensus) lines.push(`- Consensus thread: ${consensus}`);
  const tel = data.telemetry;
  if (tel?.app?.system) {
    const sys = tel.app.system;
    lines.push(`- Per-node hardware: cores=${sys.cores}, RAM=${sys.ram_size ? `${Math.round(sys.ram_size / 1024 / 1024)} GB` : '?'}`);
  }
  if (tel?.app?.version) lines.push(`- Qdrant version: ${tel.app.version}`);
  return lines;
}

export function buildInsightPrompt(insight: Insight, data?: DashboardData): string {
  const lines: string[] = [];
  lines.push(`I'm running a Qdrant vector database cluster and my monitoring dashboard flagged this ${insight.level} ${insight.category} issue:`);
  lines.push('');
  lines.push(`**Issue:** ${insight.title}`);

  const scope: string[] = [];
  if (insight.collection) scope.push('collection (name redacted)');
  if (insight.shard !== undefined) scope.push(`shard #${insight.shard}`);
  if (insight.node) scope.push('node (id redacted)');
  if (scope.length) lines.push(`**Scope:** ${scope.join(', ')}`);

  lines.push('');
  lines.push(`**Details:** ${insight.detail.replace(/`[^`]+`/g, '`<redacted>`')}`);

  if (data) {
    lines.push('');
    const nodeCount = data.cluster?.peers ? Object.keys(data.cluster.peers).length : 1;
    if (insight.collection) {
      const info = data.collectionDetails?.[insight.collection]?.info;
      if (info) {
        const ctx = buildCollectionContext(info, nodeCount);
        for (const l of ctx) lines.push(l);
      }
    } else {
      const ctx = buildClusterContext(data);
      for (const l of ctx) lines.push(l);
    }
  }

  lines.push('');
  lines.push('Please explain what this means in Qdrant terms, why it may be happening given the configuration above, and suggest concrete next steps I can take to investigate and resolve it. If relevant, mention any configuration parameters, REST API endpoints, or operational practices I should check.');
  return lines.join('\n');
}

export type AIProviderKey = 'claude' | 'chatgpt' | 'gemini';

export interface AIProvider {
  key: AIProviderKey;
  name: string;
  color: string;
  supportsUrlPrefill: boolean;
  buildUrl: (prompt: string) => string;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    key: 'claude',
    name: 'Claude',
    color: '#cc785c',
    supportsUrlPrefill: true,
    buildUrl: (p) => `https://claude.ai/new?q=${encodeURIComponent(p)}`,
  },
  {
    key: 'chatgpt',
    name: 'ChatGPT',
    color: '#10a37f',
    supportsUrlPrefill: true,
    buildUrl: (p) => `https://chatgpt.com/?q=${encodeURIComponent(p)}`,
  },
  {
    key: 'gemini',
    name: 'Gemini',
    color: '#4285F4',
    supportsUrlPrefill: false,
    buildUrl: () => 'https://gemini.google.com/app',
  },
];
