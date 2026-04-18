import { useEffect, useState } from 'react';
import type { Insight, DashboardData } from '../lib/types';
import { AI_PROVIDERS, buildInsightPrompt } from '../lib/ai-prompt';
import type { AIProvider } from '../lib/ai-prompt';
import { AIProviderIcon } from '../components/AIProviderIcon';

interface Props {
  insight: Insight | null;
  data?: DashboardData;
  onClose: () => void;
}

export function AskAIDialog({ insight, data, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [copiedFor, setCopiedFor] = useState<string | null>(null);

  useEffect(() => {
    if (insight) {
      setPrompt(buildInsightPrompt(insight, data));
      setCopiedFor(null);
    }
  }, [insight, data]);

  useEffect(() => {
    if (!insight) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [insight, onClose]);

  if (!insight) return null;

  const handleSend = async (provider: AIProvider) => {
    if (provider.supportsUrlPrefill) {
      window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer');
      onClose();
    } else {
      try {
        await navigator.clipboard.writeText(prompt);
        setCopiedFor(provider.key);
        setTimeout(() => {
          window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer');
          onClose();
        }, 900);
      } catch {
        window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer');
        onClose();
      }
    }
  };

  const copyOnly = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedFor('clipboard');
      setTimeout(() => setCopiedFor(null), 1500);
    } catch { /* ignore */ }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog ask-ai-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Ask AI about this insight</h3>
        <div className="dialog-body">
          <div className="ask-ai-insight-summary">
            <span className={`insight-level-tag ${insight.level}`}>{insight.level}</span>
            <span className="ask-ai-insight-title">{insight.title}</span>
          </div>

          <label className="ask-ai-label">
            Prompt <span className="ask-ai-label-hint">(edit before sending)</span>
          </label>
          <textarea
            className="ask-ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={10}
            spellCheck={false}
          />

          <div className="ask-ai-privacy">
            <strong>ℹ️ Privacy notice:</strong> This prompt will be sent to the AI service you choose. It includes the issue title, the detail message, and anonymized cluster context (counts, configuration, version) — collection names, node IDs, point UUIDs, and API keys are <strong>not</strong> shared. Review and edit the prompt below before sending.
          </div>

          <div className="ask-ai-providers">
            {AI_PROVIDERS.map((p) => (
              <button
                key={p.key}
                className="ask-ai-provider-btn"
                style={{ borderColor: p.color, color: p.color }}
                onClick={() => handleSend(p)}
                title={p.supportsUrlPrefill ? `Open ${p.name} with this prompt` : `Copy prompt and open ${p.name}`}
                disabled={copiedFor !== null}
              >
                <span className="ask-ai-provider-icon"><AIProviderIcon provider={p.key} /></span>
                <span className="ask-ai-provider-label">
                  {copiedFor === p.key ? 'Copied!' : `Ask ${p.name}`}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={copyOnly}>
            {copiedFor === 'clipboard' ? 'Copied!' : 'Copy prompt'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
