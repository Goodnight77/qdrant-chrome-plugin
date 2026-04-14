# Contributing to Qdrant Chrome Plugin

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/qdrant/qdrant-chrome-plugin.git
   cd qdrant-chrome-plugin
   ```

2. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the project folder

3. After making changes, click the **reload** button on the extension card in `chrome://extensions`

No build tools or npm install required - the extension uses vanilla HTML/CSS/JS.

## Architecture

### Key Files

- **`lib/qdrant-api.js`** - Qdrant REST API client. All API calls go through here.
- **`lib/storage.js`** - Wrapper around `chrome.storage.local` for cluster config persistence.
- **`popup/popup.js`** - Cluster connection management (add/edit/delete/test).
- **`dashboard/dashboard.js`** - Main dashboard rendering logic.
- **`dashboard/rules/rule-engine.js`** - Insight rule registry, executor, and renderer.
- **`dashboard/rules/*.js`** - Individual rule files grouped by scope.

### Data Flow

```
User clicks cluster → dashboard.js loads
  → QdrantApi.getDashboardData() fetches from all endpoints
  → RuleEngine.run(dashboardData) executes all registered rules
  → RuleEngine.render(insights) shows insights panel
  → renderDashboard() renders all tabs
```

## Adding New Rules

The rule engine is designed to make adding new rules as simple as possible. Each rule is a self-contained function that receives the full dashboard context and returns zero or more insights.

### Step 1: Choose the Right File

| File                        | Scope                                                   |
|-----------------------------|---------------------------------------------------------|
| `rules/cluster-rules.js`    | Cluster-wide: memory, raft, consensus, nodes            |
| `rules/collection-rules.js` | Per-collection: config, performance, indexing           |
| `rules/segment-rules.js`    | Per-shard/segment: replicas, optimizer, deleted vectors |

Or create a new file (e.g., `rules/my-rules.js`) and add a `<script>` tag in `dashboard.html` before `dashboard.js`.

### Step 2: Write the Rule

```js
RuleEngine.register('my-rule-name', function(ctx) {
  const insights = [];

  // ctx contains:
  //   ctx.cluster           - GET /cluster result
  //   ctx.collections       - array of collection names
  //   ctx.collectionDetails - { [name]: { info, cluster } }
  //   ctx.telemetry         - GET /telemetry result (connected node)
  //   ctx.nodeTelemetry     - { [peerId]: telemetry } (all reachable nodes)

  for (const name of ctx.collections) {
    const info = ctx.collectionDetails[name]?.info;
    if (!info) continue;

    if (/* your condition */) {
      insights.push({
        level: 'warning',       // critical | warning | performance | info
        category: 'config',     // memory | optimizer | replication | indexing | config | cluster
        collection: name,       // or null for cluster-wide insights
        title: 'Short title',
        detail: 'Explanation with actionable advice.',
      });
    }
  }

  return insights;
});
```

### Step 3: Done

No other files need to change. The rule automatically registers on script load, executes when data loads, and appears in the insights panel.

### Insight Levels

| Level         | When to Use                                            | Display                |
|---------------|--------------------------------------------------------|------------------------|
| `critical`    | Immediate action required (data loss risk, errors)     | Always visible, red    |
| `warning`     | Should be addressed soon (degraded performance, no HA) | Always visible, yellow |
| `performance` | Optimization opportunity (quantization, indexes)       | Collapsible, purple    |
| `info`        | Informational (current state, no action needed)        | Collapsible, blue      |

### Guidelines for Rules

- One rule should check one thing
- Use descriptive rule names: `no-quantization`, `high-segment-count`, `replica-not-active`
- Include actionable advice in `detail` - don't just report the problem, suggest a fix
- Use `formatNumber()` and `formatBytes()` for readable values (available globally)
- Set appropriate thresholds - avoid noisy rules that trigger on tiny collections
- Each rule is wrapped in try/catch by the engine, so a broken rule won't crash the dashboard

### Iterating Over Multiple Nodes

For segment-level rules that need telemetry from all nodes, use the helper pattern from `segment-rules.js`:

```js
function _allNodeTelemetries(ctx) {
  if (ctx.nodeTelemetry && Object.keys(ctx.nodeTelemetry).length > 0) {
    return Object.entries(ctx.nodeTelemetry);
  }
  return [[ctx.cluster?.peer_id?.toString() || 'local', ctx.telemetry]];
}
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Test with at least one Qdrant instance (local Docker is fine)
5. Submit a pull request

### PR Guidelines

- Keep PRs focused - one feature or fix per PR
- Test the extension by loading it unpacked in Chrome
- For new rules, include a brief description of what it detects and why it matters
- Update README.md if adding new features visible to users

## Reporting Issues

- Use [GitHub Issues](../../issues)
- Include your Qdrant version and Chrome version
- Screenshots of the dashboard are helpful
- For rule suggestions, describe the scenario and what insight should be shown
