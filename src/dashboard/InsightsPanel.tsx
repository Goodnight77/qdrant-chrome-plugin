import type { Insight, InsightLevel, InsightsFilter } from '../lib/types';
import { DEFAULT_INSIGHTS_FILTER } from '../lib/types';

const ICONS: Record<InsightLevel, string> = {
  critical: '\u26d4',
  warning: '\u26a0\ufe0f',
  performance: '\u26a1',
  info: '\u2139\ufe0f',
};

const LEVEL_COLOR: Record<InsightLevel, string> = {
  critical: 'var(--error)',
  warning: 'var(--warning)',
  performance: '#a78bfa',
  info: 'var(--info)',
};

interface Props {
  insights: Insight[];
  onNavigate: (filter?: Partial<InsightsFilter>) => void;
}

export function InsightsPanel({ insights, onNavigate }: Props) {
  if (insights.length === 0) return null;

  const counts: Record<InsightLevel, number> = {
    critical: insights.filter(i => i.level === 'critical').length,
    warning: insights.filter(i => i.level === 'warning').length,
    performance: insights.filter(i => i.level === 'performance').length,
    info: insights.filter(i => i.level === 'info').length,
  };

  const criticals = insights.filter(i => i.level === 'critical');

  const pill = (level: InsightLevel, label: string) => {
    if (counts[level] === 0) return null;
    return (
      <button
        key={level}
        className={`insight-pill ${level}`}
        onClick={() => onNavigate({ ...DEFAULT_INSIGHTS_FILTER, levels: [level] })}
        title={`Show ${counts[level]} ${label}`}
      >
        <span className="insight-pill-icon">{ICONS[level]}</span>
        <strong>{counts[level]}</strong>
        <span className="insight-pill-label">{label}</span>
      </button>
    );
  };

  return (
    <div className={`insights-strip ${criticals.length > 0 ? 'has-critical' : ''}`}>
      <div className="insights-strip-header">
        <div className="insights-strip-pills">
          {pill('critical', counts.critical === 1 ? 'critical' : 'critical')}
          {pill('warning', counts.warning === 1 ? 'warning' : 'warnings')}
          {pill('performance', counts.performance === 1 ? 'tip' : 'tips')}
          {pill('info', 'info')}
        </div>
        <button className="insights-strip-view-all" onClick={() => onNavigate()}>
          View all ({insights.length}) <span className="arrow">→</span>
        </button>
      </div>

      {criticals.length > 0 && (
        <ul className="insights-strip-critical-list">
          {criticals.slice(0, 3).map((ins, i) => (
            <li
              key={i}
              className="insights-strip-critical-item"
              onClick={() => onNavigate({
                ...DEFAULT_INSIGHTS_FILTER,
                levels: ['critical'],
                collection: ins.collection ?? null,
              })}
              style={{ color: LEVEL_COLOR.critical }}
              role="button"
              tabIndex={0}
            >
              <span className="insight-icon">{ICONS.critical}</span>
              <span className="crit-title">{ins.title}</span>
              {ins.collection && <span className="crit-scope">{ins.collection}</span>}
            </li>
          ))}
          {criticals.length > 3 && (
            <li
              className="insights-strip-critical-more"
              onClick={() => onNavigate({ ...DEFAULT_INSIGHTS_FILTER, levels: ['critical'] })}
              role="button"
              tabIndex={0}
            >
              +{criticals.length - 3} more critical → view
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
