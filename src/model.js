// Report contract. Consumers (CLI renderers, cortextos dashboard) depend on this
// shape; bump SCHEMA_VERSION on any breaking change.
export const SCHEMA_VERSION = 1;

export const KINDS = ['bootstrap', 'skill', 'hook', 'mcp', 'plugin', 'command', 'agent', 'rule'];

// scope: where in the hierarchy the item originates
export const SCOPES = ['managed', 'user', 'ancestor', 'project', 'local', 'plugin', 'builtin', 'remote'];

// status: whether the item is actually in effect for this session
//   active       - loaded at boot
//   conditional  - loads later (path-scoped rule, nested CLAUDE.md, skill hooks)
//   disabled     - present in config but turned off
//   shadowed     - overridden by a same-name item with higher precedence
//   needs-approval - present but gated on a trust/approval decision not yet made
//   unknown      - cannot be determined from local files (e.g. claude.ai connectors)
export const STATUSES = ['active', 'conditional', 'disabled', 'shadowed', 'needs-approval', 'unknown'];

/**
 * @typedef {Object} Item
 * @property {string} id         stable id: `${harness}:${kind}:${scope}:${name}@${path}`
 * @property {string} harness    'claude' | 'codex' | 'opencode'
 * @property {string} kind       one of KINDS
 * @property {string} name       display name (skill name, server name, hook event+matcher, file basename)
 * @property {string} scope      one of SCOPES
 * @property {string} status     one of STATUSES
 * @property {string} path       absolute path of the file that defines it
 * @property {string} [definedIn] absolute path of the config that references it, if different (e.g. plugin enabled in settings.json)
 * @property {string} [plugin]   owning plugin id, if contributed by a plugin
 * @property {string} [reason]   human explanation for status (why disabled/shadowed/etc.)
 * @property {Object} [details]  kind-specific, secrets redacted (description, event, matcher, command, transport, url, bytes, ...)
 */

export function item(fields) {
  const it = { ...fields };
  it.id = `${it.harness}:${it.kind}:${it.scope}:${it.name}@${it.path}`;
  return it;
}

const SECRET_KEY = /(token|secret|key|password|authorization|cookie|bearer|credential)/i;

// Replace values of env/headers and any secret-looking keys before anything leaves the tool.
export function redact(obj) {
  if (Array.isArray(obj)) return obj.map(redact);
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (['env', 'headers', 'environment', 'http_headers', 'env_http_headers'].includes(k) && v && typeof v === 'object') {
      out[k] = Object.fromEntries(Object.keys(v).map((kk) => [kk, '<redacted>']));
    } else if (SECRET_KEY.test(k) && typeof v === 'string') {
      out[k] = '<redacted>';
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}
