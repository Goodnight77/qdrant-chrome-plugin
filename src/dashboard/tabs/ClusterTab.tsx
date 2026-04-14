import type { DashboardData } from '../../lib/types';
import { buildPeerMapping } from '../../lib/peer-mapping';

export function ClusterTab({ data }: { data: DashboardData }) {
  const { cluster } = data;
  const peers = cluster?.peers || {};
  const raft = cluster?.raft_info;
  const consensus = cluster?.consensus_thread_status;
  const peerMeta = (cluster as unknown as { peer_metadata?: Record<string, { version: string }> })?.peer_metadata;
  const pm = buildPeerMapping(cluster);
  const leaderPeerId = raft?.leader?.toString() || '';

  const consensusColor = consensus?.consensus_thread_status === 'working' ? 'var(--success)' :
    consensus?.consensus_thread_status === 'stopped' ? 'var(--error)' : 'var(--warning)';

  return (
    <>
      <div className="card">
        <h2>Nodes</h2>
        <div className="nodes-grid">
          {Object.entries(peers).map(([peerId, peerInfo]) => {
            const isLeader = peerId === leaderPeerId;
            const color = pm.getColor(peerId);
            const meta = peerMeta?.[peerId];
            return (
              <div key={peerId} className="node-card" style={{ borderColor: color }}>
                <div className="peer-id">{peerId}</div>
                {meta?.version && <div style={{ fontSize: '0.7rem', color, marginBottom: 4 }}>v{meta.version}</div>}
                <div className="uri">{peerInfo.uri}</div>
                <div className={`role-badge ${isLeader ? 'leader' : 'follower'}`}>{isLeader ? 'Leader' : 'Follower'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <h2>Raft Consensus</h2>
        <div className="raft-grid">
          <div className="raft-item"><div className="value">{raft?.term ?? 'N/A'}</div><div className="label">Term</div></div>
          <div className="raft-item"><div className="value">{raft?.commit ?? 'N/A'}</div><div className="label">Commit</div></div>
          <div className="raft-item"><div className="value" style={raft?.pending_operations ? { color: 'var(--warning)' } : undefined}>{raft?.pending_operations ?? 'N/A'}</div><div className="label">Pending Ops</div></div>
          <div className="raft-item"><div className="value">{raft?.is_voter ? 'Yes' : 'No'}</div><div className="label">Is Voter</div></div>
          <div className="raft-item"><div className="value" style={{ color: 'var(--success)' }}>{raft?.role || 'N/A'}</div><div className="label">Role</div></div>
          <div className="raft-item"><div className="value" style={{ color: consensusColor, fontSize: '0.9rem' }}>{consensus?.consensus_thread_status || 'N/A'}</div><div className="label">Consensus</div></div>
        </div>
      </div>
    </>
  );
}
