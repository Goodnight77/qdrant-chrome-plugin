import { useState } from 'react';
import type { Insight } from '../lib/types';

const ICONS: Record<string, string> = { critical: '\u26d4', warning: '\u26a0\ufe0f', performance: '\u26a1', info: '\u2139\ufe0f' };

function InsightItem({ insight }: { insight: Insight }) {
  return (
    <div className={`insight-item ${insight.level}`}>
      <span className="insight-icon">{ICONS[insight.level]}</span>
      <div className="insight-content">
        <div className="insight-title">
          {insight.collection && <span className="insight-scope">{insight.collection}</span>}
          {insight.title}
        </div>
        <div className="insight-detail">{insight.detail}</div>
      </div>
    </div>
  );
}

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  const urgent = insights.filter(i => i.level === 'critical' || i.level === 'warning');
  const tips = insights.filter(i => i.level === 'performance' || i.level === 'info');

  // Open by default only when there are no urgent items
  const [expanded, setExpanded] = useState(urgent.length === 0);

  if (insights.length === 0) return null;

  const criticalCount = urgent.filter(i => i.level === 'critical').length;
  const warningCount = urgent.filter(i => i.level === 'warning').length;
  const perfCount = tips.filter(i => i.level === 'performance').length;
  const infoCount = tips.filter(i => i.level === 'info').length;

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <span className="insights-title">Insights & Recommendations</span>
        <span className="insights-counts">
          {criticalCount > 0 && <span style={{ color: 'var(--error)' }}>{criticalCount} critical</span>}
          {criticalCount > 0 && (warningCount + perfCount + infoCount) > 0 && ' / '}
          {warningCount > 0 && <span style={{ color: 'var(--warning)' }}>{warningCount} warning</span>}
          {warningCount > 0 && (perfCount + infoCount) > 0 && ' / '}
          {perfCount > 0 && <span style={{ color: '#a78bfa' }}>{perfCount} tip{perfCount > 1 ? 's' : ''}</span>}
          {perfCount > 0 && infoCount > 0 && ' / '}
          {infoCount > 0 && <span style={{ color: 'var(--info)' }}>{infoCount} info</span>}
        </span>
      </div>

      {urgent.map((ins, i) => <InsightItem key={`u-${i}`} insight={ins} />)}

      {tips.length > 0 && (
        <div>
          <div className="insights-details-toggle" onClick={() => setExpanded(e => !e)} role="button" tabIndex={0}>
            {expanded ? '\u25BC' : '\u25B6'} {tips.length} performance tip{tips.length > 1 ? 's' : ''} & info
          </div>
          {expanded && tips.map((ins, i) => <InsightItem key={`t-${i}`} insight={ins} />)}
        </div>
      )}
    </div>
  );
}
