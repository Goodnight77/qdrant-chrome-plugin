import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  DashboardData,
  ClusterConfig,
  CollectionOptimizations,
  OptimizationTask,
  OptimizationProgress,
  OptimizationSegment,
} from '../../lib/types';
import { formatNumber, formatDuration } from '../../lib/format';
import { QdrantApi } from '../../lib/qdrant-api';

const REFRESH_MS = 3000;

function SegmentChips({ segments }: { segments: OptimizationSegment[] }) {
  if (!segments?.length) return null;
  const shown = segments.slice(0, 4);
  const extra = segments.length - shown.length;
  return (
    <div className="opt-segments">
      {shown.map((s) => (
        <span key={s.uuid} className="opt-segment-chip" title={`${s.uuid} · ${formatNumber(s.points_count)} points`}>
          {(s.uuid || '').slice(0, 8)}
          <span className="opt-segment-points">{formatNumber(s.points_count)}</span>
        </span>
      ))}
      {extra > 0 && <span className="opt-segment-more">+{extra} more</span>}
    </div>
  );
}

function ProgressBar({ progress, running }: { progress: OptimizationProgress; running: boolean }) {
  const pct = progress.total > 0 ? Math.min(100, (progress.done / progress.total) * 100) : 0;
  return (
    <div className={`opt-progress ${running ? 'running' : 'done'}`}>
      <div className="opt-progress-track">
        <div className="opt-progress-fill" style={{ width: `${pct}%` }}>
          {running && <span className="opt-progress-shine" />}
        </div>
      </div>
      <div className="opt-progress-meta">
        <span className="opt-progress-name">{progress.name || '—'}</span>
        <span className="opt-progress-numbers">
          {formatNumber(progress.done)} / {formatNumber(progress.total)} · {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function TaskCard({ task, running }: { task: OptimizationTask; running: boolean }) {
  const duration = task.progress?.duration_sec ?? 0;
  const started = task.progress?.started_at ? new Date(task.progress.started_at).toLocaleTimeString() : '';
  const finished = task.progress?.finished_at ? new Date(task.progress.finished_at).toLocaleTimeString() : '';
  return (
    <div className={`opt-task ${running ? 'running' : 'completed'}`}>
      <div className="opt-task-header">
        <span className="opt-task-optimizer">{task.optimizer}</span>
        <span className={`opt-task-status ${task.status}`}>{running ? 'Running' : task.status}</span>
        <span className="opt-task-duration">{formatDuration(duration * 1000)}</span>
      </div>
      <ProgressBar progress={task.progress} running={running} />
      <div className="opt-task-times">
        {started && <span>Started: {started}</span>}
        {finished && <span>Finished: {finished}</span>}
        <span>{task.segments?.length || 0} segment{task.segments?.length === 1 ? '' : 's'}</span>
      </div>
      <SegmentChips segments={task.segments} />
    </div>
  );
}

function Section({ title, count, accent, defaultOpen, children }: { title: string; count: number; accent: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0 && !defaultOpen) {
    return (
      <div className="opt-section empty">
        <span className={`opt-section-dot ${accent}`} />
        <span className="opt-section-title">{title}</span>
        <span className="opt-section-count">0</span>
      </div>
    );
  }
  return (
    <div className={`opt-section ${open ? 'open' : ''}`}>
      <button className="opt-section-header" onClick={() => setOpen(!open)}>
        <span className={`opt-section-dot ${accent}`} />
        <span className="opt-section-title">{title}</span>
        <span className="opt-section-count">{count}</span>
        <span className="opt-section-caret">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="opt-section-body">{children}</div>}
    </div>
  );
}

function CollectionOptimizationsCard({ name, data }: { name: string; data: CollectionOptimizations | null | { error: string } }) {
  if (!data) {
    return (
      <div className="opt-collection-card loading-card">
        <div className="opt-collection-header">
          <span className="collection-name">{name}</span>
          <span className="opt-collection-status muted">Loading…</span>
        </div>
      </div>
    );
  }
  if ('error' in data) {
    return (
      <div className="opt-collection-card error-card">
        <div className="opt-collection-header">
          <span className="collection-name">{name}</span>
          <span className="opt-collection-status error">Unavailable</span>
        </div>
        <p className="opt-collection-error">{data.error}</p>
      </div>
    );
  }

  const running = data.running || [];
  const queued = data.queued || [];
  const completed = data.completed || [];
  const summary = data.summary || { queued_optimizations: 0, queued_segments: 0, queued_points: 0, idle_segments: 0 };
  const idleSegs = data.idle_segments || [];
  const isBusy = running.length > 0 || summary.queued_optimizations > 0;

  return (
    <div className={`opt-collection-card ${isBusy ? 'busy' : 'idle'}`}>
      <div className="opt-collection-header">
        <span className="collection-name">{name}</span>
        <div className="opt-collection-stats">
          {running.length > 0 && (
            <span className="opt-stat running">
              <span className="opt-pulse-dot" />
              {running.length} running
            </span>
          )}
          {summary.queued_optimizations > 0 && (
            <span className="opt-stat queued">
              {summary.queued_optimizations} queued · {formatNumber(summary.queued_points)} pts
            </span>
          )}
          <span className="opt-stat completed">
            {completed.length} completed
          </span>
          <span className="opt-stat idle">
            {summary.idle_segments} idle seg{summary.idle_segments === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {!isBusy && running.length === 0 && completed.length === 0 && (
        <p className="opt-idle-notice">No optimization activity. {summary.idle_segments > 0 ? `${summary.idle_segments} segment${summary.idle_segments === 1 ? '' : 's'} currently idle.` : ''}</p>
      )}

      {running.length > 0 && (
        <Section title="Running" count={running.length} accent="info" defaultOpen>
          <div className="opt-task-list">
            {running.map((t) => <TaskCard key={t.uuid} task={t} running />)}
          </div>
        </Section>
      )}

      {queued.length > 0 && (
        <Section title="Queued" count={queued.length} accent="warning" defaultOpen={false}>
          <div className="opt-queue-list">
            {queued.map((q, i) => (
              <div key={`${q.optimizer}-${i}`} className="opt-queue-item">
                <span className="opt-queue-optimizer">{q.optimizer}</span>
                <span className="opt-queue-sep">·</span>
                <span>{q.segments.length} segment{q.segments.length === 1 ? '' : 's'}</span>
                <SegmentChips segments={q.segments} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {completed.length > 0 && (
        <Section title="Completed" count={completed.length} accent="success" defaultOpen={false}>
          <div className="opt-task-list">
            {completed.map((t) => <TaskCard key={t.uuid} task={t} running={false} />)}
          </div>
        </Section>
      )}

      {idleSegs.length > 0 && (
        <Section title="Idle Segments" count={idleSegs.length} accent="muted" defaultOpen={false}>
          <SegmentChips segments={idleSegs} />
        </Section>
      )}
    </div>
  );
}

type OptData = CollectionOptimizations | { error: string };

export function OptimizationsTab({ data, cluster }: { data: DashboardData; cluster: ClusterConfig | null }) {
  const [optsByCollection, setOptsByCollection] = useState<Record<string, OptData>>({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'busy'>('all');
  const [lastFetched, setLastFetched] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const fetchAll = useCallback(async () => {
    if (!cluster || data.collections.length === 0) return;
    setLoading(true);
    const api = new QdrantApi(cluster.url, cluster.apiKey);
    const results = await Promise.all(
      data.collections.map(async (name) => {
        try {
          const res = await api.getCollectionOptimizations(name);
          return [name, res] as const;
        } catch (e) {
          return [name, { error: (e as Error).message }] as const;
        }
      }),
    );
    const next: Record<string, OptData> = {};
    for (const [name, res] of results) next[name] = res;
    setOptsByCollection(next);
    setLastFetched(new Date().toLocaleTimeString());
    setLoading(false);
  }, [cluster?.url, cluster?.apiKey, data.collections]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = window.setInterval(fetchAll, REFRESH_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchAll]);

  const totalRunning = Object.values(optsByCollection).reduce((sum, d) => {
    if (!d || 'error' in d) return sum;
    return sum + (d.running?.length || 0);
  }, 0);

  const totalQueued = Object.values(optsByCollection).reduce((sum, d) => {
    if (!d || 'error' in d) return sum;
    return sum + (d.summary?.queued_optimizations || 0);
  }, 0);

  const displayedCollections = filter === 'busy'
    ? data.collections.filter((name) => {
        const d = optsByCollection[name];
        if (!d || 'error' in d) return false;
        return (d.running?.length || 0) > 0 || (d.summary?.queued_optimizations || 0) > 0;
      })
    : data.collections;

  if (data.collections.length === 0) {
    return <div className="card"><p style={{ color: 'var(--text-secondary)' }}>No collections found.</p></div>;
  }

  return (
    <>
      <div className="opt-toolbar">
        <div className="opt-toolbar-stats">
          <span className="opt-toolbar-stat">
            <span className="opt-pulse-dot" style={{ visibility: totalRunning > 0 ? 'visible' : 'hidden' }} />
            <strong>{totalRunning}</strong> running
          </span>
          <span className="opt-toolbar-stat"><strong>{totalQueued}</strong> queued</span>
          <span className="opt-toolbar-stat muted">across {data.collections.length} collection{data.collections.length === 1 ? '' : 's'}</span>
        </div>
        <div className="opt-toolbar-controls">
          <div className="opt-filter-toggle">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
            <button className={filter === 'busy' ? 'active' : ''} onClick={() => setFilter('busy')}>Busy only</button>
          </div>
          <label className="opt-auto-refresh">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh ({REFRESH_MS / 1000}s)
          </label>
          <button className="btn btn-refresh" onClick={fetchAll} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {lastFetched && <span className="last-updated">Updated: {lastFetched}</span>}
        </div>
      </div>

      {displayedCollections.length === 0 ? (
        <div className="card"><p style={{ color: 'var(--text-secondary)' }}>No collections with active optimizations. Switch to "All" to see everything.</p></div>
      ) : (
        displayedCollections.map((name) => (
          <CollectionOptimizationsCard key={name} name={name} data={optsByCollection[name] || null} />
        ))
      )}
    </>
  );
}
