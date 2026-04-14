import type { DashboardData, Insight, RuleFunction } from '../lib/types';

const rules: { name: string; fn: RuleFunction }[] = [];

export function registerRule(name: string, fn: RuleFunction): void {
  rules.push({ name, fn });
}

export function runRules(ctx: DashboardData): Insight[] {
  const insights: Insight[] = [];
  for (const rule of rules) {
    try {
      const result = rule.fn(ctx);
      if (Array.isArray(result)) insights.push(...result);
    } catch (e) {
      console.warn(`Rule "${rule.name}" failed:`, e);
    }
  }
  const order: Record<string, number> = { critical: 0, warning: 1, performance: 2, info: 3 };
  insights.sort((a, b) => (order[a.level] ?? 9) - (order[b.level] ?? 9));
  return insights;
}

export function insightsForCollection(insights: Insight[], name: string): Insight[] {
  return insights.filter(i => i.collection === name);
}
