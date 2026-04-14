import type { ClusterInfo, PeerMapping } from './types';

const NODE_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981',
  '#ec4899', '#6366f1', '#84cc16', '#f97316',
];

export function buildPeerMapping(cluster: ClusterInfo | null | undefined): PeerMapping {
  const peers = cluster?.peers || {};
  const allPeerIds = Object.keys(peers);
  const peerLabels: Record<string, string> = {};

  allPeerIds.forEach((pid, idx) => {
    const uri = peers[pid]?.uri || '';
    const nodeMatch = uri.match(/-(\d+)\./);
    peerLabels[pid] = nodeMatch ? `Node ${nodeMatch[1]}` : `Peer ${idx}`;
  });

  return {
    allPeerIds,
    nodeColors: NODE_COLORS,
    getLabel: (pid: string) => peerLabels[pid] || `Peer ${pid.slice(-6)}`,
    getColor: (pid: string) => {
      const idx = allPeerIds.indexOf(pid);
      return NODE_COLORS[idx >= 0 ? idx % NODE_COLORS.length : 0];
    },
  };
}
