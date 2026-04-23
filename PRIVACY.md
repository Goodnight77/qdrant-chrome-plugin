# Privacy Policy

**Extension:** Qdrant Cluster Dashboard
**Developer:** Haydar Külekci
**Contact:** via [GitHub Issues](https://github.com/hkulekci/qdrant-chrome-plugin/issues)
**Effective date:** 2026-04-24

---

## Summary

Qdrant Cluster Dashboard is a local-only tool for monitoring your own
Qdrant vector database clusters from Chrome. The extension does **not**
collect, transmit, or sell any personal information. It does not contain
analytics, tracking scripts, or remote logging of any kind. All data
entered into the extension stays on your device unless you explicitly
choose to send it to a third party (see "Ask AI" below).

## Information You Provide

The extension only stores information you explicitly enter into it:

- **Cluster configurations**: cluster name, API URL, and (optionally) an
  API key for each Qdrant cluster you add.

This data is stored using the Chrome `storage.local` API on the device
where the extension is installed. It is never synced to Google accounts,
uploaded to any remote server, or shared with the developer.

## Information We Do **Not** Collect

- No personally identifiable information (name, email, location, etc.)
- No browsing history or activity outside this extension
- No usage analytics, crash reports, or telemetry
- No cookies, device identifiers, or fingerprinting
- No data from your Qdrant collections (vectors, payloads, points)
  beyond what Chrome displays on screen while you use the extension

## Network Requests Made by the Extension

The extension makes network requests in two situations only:

1. **To your own Qdrant clusters.** When you open a cluster dashboard,
   the extension calls the HTTP API of the Qdrant URL you configured
   (for example `https://my-cluster.example.com:6333/cluster`). Requests
   carry the API key you provided. No copy of these requests or their
   responses is sent to the developer or any third party.

2. **Nowhere else.** The extension does not contact the developer,
   Qdrant Inc., Google Analytics, advertising networks, or any other
   remote service.

## Optional Third-Party Integration: "Ask AI"

The Insights tab includes an optional "Ask AI" button that lets you
continue an inquiry in a third-party AI chat product of your choice
(Claude, ChatGPT, or Gemini). When you click this button:

- A **new browser tab** opens at `claude.ai`, `chatgpt.com`, or
  `gemini.google.com`.
- For Claude and ChatGPT, the anonymized insight context is passed as a
  URL query parameter so the chat starts with your question pre-filled.
  **Cluster URLs, API keys, host names, and collection names are
  stripped from this context before it leaves the extension.**
- For Gemini, the context is copied to your clipboard and Gemini opens
  to a blank chat; you paste it yourself.

Once the new tab is open, your interaction with the AI provider is
governed by **their** privacy policy, not this one:

- [Anthropic (Claude) Privacy Policy](https://www.anthropic.com/legal/privacy)
- [OpenAI (ChatGPT) Privacy Policy](https://openai.com/policies/privacy-policy)
- [Google (Gemini) Privacy Policy](https://policies.google.com/privacy)

You can use the rest of the extension without ever clicking "Ask AI".

## Permissions Explained

The extension requests only the permissions it needs:

| Permission | Why it is needed |
|---|---|
| `storage` | To persist the cluster list and your preferences on your device. |
| `host_permissions: <all_urls>` | To contact the Qdrant HTTP API at the URL you configure, which can be any host (localhost, an internal network, or a cloud provider). The extension does not read or interact with any web page you visit. |

## Data Retention and Deletion

All data is local to your browser profile.

- **To delete a cluster:** remove it from the popup list.
- **To delete all data:** uninstall the extension from
  `chrome://extensions`. This removes all `storage.local` data the
  extension holds.

The developer does not retain any copy of your data.

## Data Security

Because all data stays on your device, security is governed by your
operating system and browser profile protections. The developer has no
access to it. API keys you enter are stored in the same `storage.local`
area that Chrome uses for other extensions. Treat your browser profile
as you would any other location that holds secrets.

## Children's Privacy

The extension is a developer tool and is not directed at children under
the age of 13. It does not knowingly collect any information from
children.

## Changes to This Policy

If this policy changes, the updated version will be published in this
same file in the project repository. The "Effective date" at the top of
this document indicates the latest revision. Continued use of the
extension after a change constitutes acceptance of the updated policy.

## Contact

For questions or concerns about this policy, please open an issue at
<https://github.com/hkulekci/qdrant-chrome-plugin/issues>.
