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
const REDACTED = '<redacted>';

function redactText(value) {
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.username || url.password) { url.username = REDACTED; url.password = ''; }
      for (const key of [...url.searchParams.keys()]) if (SECRET_KEY.test(key)) url.searchParams.set(key, REDACTED);
      if (SECRET_KEY.test(url.hash)) url.hash = REDACTED;
      return url.toString();
    } catch { /* Fall through for malformed or embedded URLs. */ }
  }
  // Shell commands and serialized JSON/TOML have different quoting rules.
  // Prefer hiding a whole credential-bearing string to guessing its value's end.
  if (/[\w.-]*(?:token|secret|key|password|authorization|cookie|credential)[\w.-]*["']?\s*[=:]/i.test(value)) return REDACTED;
  return value
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, '$1<redacted>@')
    .replace(/(--[\w.-]*(?:token|secret|key|password|authorization|cookie|credential)[\w.-]*(?:=|\s+))(?:"[^"]*"|'[^']*'|[^\s;]+)/gi, '$1<redacted>')
    .replace(/\b(Bearer\s+)[^\s"'&,;]+/gi, '$1<redacted>');
}

// Replace values of env/headers and any secret-looking keys before anything leaves the tool.
export function redact(obj) {
  if (typeof obj === 'string') return redactText(obj);
  if (Array.isArray(obj)) {
    let secretArgument = false;
    return obj.map((value) => {
      if (secretArgument) { secretArgument = false; return REDACTED; }
      if (typeof value === 'string' && /^--[\w.-]+$/.test(value) && SECRET_KEY.test(value)) {
        secretArgument = true;
        return value;
      }
      return redact(value);
    });
  }
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (['env', 'headers', 'environment', 'http_headers', 'env_http_headers'].includes(k) && v && typeof v === 'object') {
      out[k] = Object.fromEntries(Object.keys(v).map((kk) => [kk, '<redacted>']));
    } else if (SECRET_KEY.test(k) || (['command', 'cmd', 'script'].includes(k) && typeof v === 'string' && SECRET_KEY.test(v))) {
      out[k] = REDACTED;
    } else {
      out[k] = redact(v);
    }
  }
  return out;
}
