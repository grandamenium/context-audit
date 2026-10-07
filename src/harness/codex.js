import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { parse as parseTomlStr } from 'smol-toml';
import { item, redact } from '../model.js';
import {
  ancestors, canonical, exists, fileSize, findRoot, isDir, isFile, listDir,
  readFrontmatter, readJson, readText, readToml,
} from '../fsutil.js';

const H = 'codex';
const DEFAULT_MAX_BYTES = 32 * 1024;
// Fitted (not documented): entry-line budget = 2% of the raw context window in tokens x 4 chars, minus ~1.38k fixed
// overhead for the header and roots table. Matches 0.159.2 rollouts at windows 272000 (entry lines 20.37-20.38k) and 872000 (68.38-68.42k).
const windowBudget = (w) => 0.08 * w - 1380;
const AGENTS_NAMES = ['AGENTS.override.md', 'AGENTS.md'];

const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function sameFile(a, b) { return real(a) === real(b); }

export function auditCodex(ctx) {
  const home = ctx.home;
  const env = ctx.env || {};
  const cwd = canonical(ctx.cwd);
  const codexHome = env.CODEX_HOME || path.join(home, '.codex');
  const sysDir = ctx.systemDir || '/etc/codex';
  const warnings = [];
  const items = [];
  const push = (f) => items.push(item({ harness: H, ...f }));

  // ---- config layers (low -> high precedence) ----
  const loadToml = (p) => {
    if (!isFile(p)) return null;
    const t = readToml(p);
    if (t?.__parseError) { warnings.push(`${p}: TOML parse error: ${t.__parseError}`); return null; }
    return t;
  };
  const sysCfgPath = path.join(sysDir, 'config.toml');
  const userCfgPath = path.join(codexHome, 'config.toml');
  const sysCfg = loadToml(sysCfgPath) || {};
  const userCfg = loadToml(userCfgPath) || {};
  // --profile / `profile` key / legacy [profiles.<name>]; -c overrides sit above everything.
  const launch = ctx.launch || {};
  const profName = [].concat(launch.profile || []).filter(Boolean).pop() || userCfg.profile || sysCfg.profile || null;
  const profPath = profName ? path.join(codexHome, `${profName}.config.toml`) : null;
  const profFile = profPath ? loadToml(profPath) : null;
  const profInline = profName && isObj(userCfg.profiles?.[profName]) ? userCfg.profiles[profName] : null;
  if (profName && !profFile && !profInline) warnings.push(`profile "${profName}" selected but ${profPath} not found`);
  const profCfg = { ...(profInline || {}), ...(profFile || {}) };
  const profSrc = profFile ? profPath : userCfgPath;
  const ovCfg = {};
  for (const o of launch.configOverrides || []) {
    const eq = String(o).indexOf('=');
    if (eq < 1) { warnings.push(`ignored malformed -c override: ${o}`); continue; }
    const k = o.slice(0, eq).trim(); const v = o.slice(eq + 1).trim();
    let parsed;
    try { parsed = parseTomlStr(`${k} = ${v}`); } catch { try { parsed = parseTomlStr(`${k} = ${JSON.stringify(v)}`); } catch { warnings.push(`ignored unparsable -c override: ${k}`); continue; } }
    deepMerge(ovCfg, parsed);
  }
  const hasOv = Object.keys(ovCfg).length > 0;

  // Later layer wins on scalar settings that affect discovery. Project layers are not
  // consulted for these because the root is needed to find them.
  const base = { ...sysCfg, ...userCfg, ...profCfg, ...ovCfg };

  const markers = Array.isArray(base.project_root_markers) && base.project_root_markers.length
    ? base.project_root_markers : ['.git'];
  const fallbacks = Array.isArray(base.project_doc_fallback_filenames) ? base.project_doc_fallback_filenames : [];
  const maxBytes = Number.isFinite(base.project_doc_max_bytes) ? base.project_doc_max_bytes : DEFAULT_MAX_BYTES;

  const projectRoot = findRoot(cwd, markers);
  // Directories root -> cwd. Without a root only the cwd is considered.
  const dirs = projectRoot ? ancestors(cwd, projectRoot).reverse() : [cwd];
  const scopeOf = (d) => (d === cwd ? 'project' : 'ancestor');

  // ---- trust ----
  const projects = { ...(sysCfg.projects || {}), ...(userCfg.projects || {}) };
  const trust = resolveTrust(projects, projectRoot, cwd);
  const trusted = trust.trusted;

  // Project .codex layers, skipping the one that is the user's CODEX_HOME itself.
  const projLayers = dirs
    .map((d) => ({ dir: d, codexDir: path.join(d, '.codex'), scope: scopeOf(d) }))
    .filter((l) => isDir(l.codexDir) && !sameFile(l.codexDir, codexHome));
  const projCfgs = projLayers.map((l) => {
    const p = path.join(l.codexDir, 'config.toml');
    return { ...l, cfgPath: p, cfg: loadToml(p) };
  });

  const chain = [
    { layer: 'system', path: sysCfgPath, exists: isFile(sysCfgPath) },
    { layer: 'user', path: userCfgPath, exists: isFile(userCfgPath) },
    ...(profName ? [{ layer: 'profile', name: profName, path: profSrc, exists: !!(profFile || profInline) }] : []),
    ...projCfgs.map((l) => ({
      layer: 'project', path: l.cfgPath, exists: isFile(l.cfgPath),
      trusted, trustMatch: trust.match,
    })),
    ...(hasOv ? [{ layer: 'cli', path: '-c', exists: true }] : []),
  ];

  const projGate = trusted
    ? {}
    : { status: 'needs-approval', reason: `project not trusted (${trust.match}); project-layer config, hooks and rules are skipped until trusted` };
  const trustDetails = { trustMatch: trust.match, ...(trust.via ? { trustedVia: trust.via } : {}) };

  // ---- 1. bootstrap (AGENTS.md) ----
  let order = 0;
  const empty = (p) => (readText(p) ?? '').trim().length === 0;

  const globalCands = AGENTS_NAMES.map((n) => path.join(codexHome, n)).filter(isFile);
  let globalChosen = false;
  for (const p of globalCands) {
    const bytes = fileSize(p);
    if (empty(p)) {
      push({ kind: 'bootstrap', name: path.basename(p), scope: 'user', status: 'disabled', path: p, reason: 'empty', details: { bytes, order: null, global: true } });
    } else if (!globalChosen) {
      globalChosen = true;
      push({ kind: 'bootstrap', name: path.basename(p), scope: 'user', status: 'active', path: p, details: { bytes, order: order++, global: true } });
    } else {
      push({ kind: 'bootstrap', name: path.basename(p), scope: 'user', status: 'shadowed', path: p, reason: 'only the first non-empty global file is used', details: { bytes, order: null, global: true } });
    }
  }

  let used = 0;
  const names = [...AGENTS_NAMES, ...fallbacks];
  for (const d of dirs) {
    const cands = names.map((n) => path.join(d, n)).filter(isFile);
    let chosen = false;
    for (const p of cands) {
      // The global dir can sit inside the project walk (e.g. root is ~/.codex's parent); avoid duplicates.
      if (items.some((i) => i.kind === 'bootstrap' && i.path === p)) continue;
      const bytes = fileSize(p);
      const base_ = { kind: 'bootstrap', name: path.basename(p), scope: scopeOf(d), path: p };
      if (empty(p)) {
        push({ ...base_, status: 'disabled', reason: 'empty', details: { bytes, order: null } });
      } else if (chosen) {
        push({ ...base_, status: 'shadowed', reason: 'only one file per directory is used', details: { bytes, order: null } });
      } else {
        chosen = true;
        const remaining = maxBytes - used;
        if (remaining <= 0) {
          push({ ...base_, status: 'disabled', reason: `project_doc_max_bytes (${maxBytes}) already reached`, details: { bytes, order: null, truncated: true, included: 0 } });
        } else if (bytes > remaining) {
          used = maxBytes;
          push({ ...base_, status: 'active', reason: `truncated to fit project_doc_max_bytes (${maxBytes})`, details: { bytes, order: order++, truncated: true, included: remaining } });
        } else {
          used += bytes;
          push({ ...base_, status: 'active', details: { bytes, order: order++ } });
        }
      }
    }
  }

  // ---- 2. plugins ----
  const pluginCfg = { ...(sysCfg.plugins || {}), ...(userCfg.plugins || {}) };
  const activePlugins = [];
  const cacheRoot = path.join(codexHome, 'plugins', 'cache');
  const addPlugin = (id, pc, remote) => {
    const [pname, mkt] = id.split('@');
    const enabled = !(pc && pc.enabled === false);
    const cacheBase = path.join(cacheRoot, mkt || '', pname);
    const versions = isDir(cacheBase)
      ? [...new Set(listDir(cacheBase).map((e) => path.join(cacheBase, e.name)).filter(isDir).map(real))]
        .map((p) => ({ dir: p, version: path.basename(p), mtime: mtime(p) }))
        .sort((a, b) => b.mtime - a.mtime)
      : [];
    const picked = versions[0];
    const manifestPath = picked ? path.join(picked.dir, '.codex-plugin', 'plugin.json') : null;
    const manifest = manifestPath && isFile(manifestPath) ? readJson(manifestPath) : null;
    const details = { marketplace: mkt, enabled, ...(remote ? { remoteInstalled: true } : {}), ...(picked ? { version: picked.version, dir: picked.dir } : {}) };
    if (versions.length > 1) {
      details.versions = versions.map((v) => v.version);
      details.note = `${versions.length} cached versions; newest by mtime (${picked.version}) selected`;
    }
    if (!picked) {
      push({ kind: 'plugin', name: id, scope: 'plugin', status: 'unknown', path: userCfgPath, plugin: id, reason: 'enabled/listed in config but not found in plugin cache', details });
      return;
    }
    push({
      kind: 'plugin', name: id, scope: 'plugin', status: enabled ? 'active' : 'disabled',
      path: manifest && !manifest.__parseError ? manifestPath : picked.dir, ...(remote ? {} : { definedIn: userCfgPath }), plugin: id,
      ...(enabled ? {} : { reason: 'plugins.<id>.enabled = false' }),
      ...(remote ? { reason: 'installed via remote plugin marker (.codex-remote-plugin-install.json); not listed in config.toml' } : {}),
      details: { ...details, ...(manifest?.version ? { manifestVersion: manifest.version } : {}), ...(manifest?.description ? { description: manifest.description } : {}) },
    });
    if (enabled) activePlugins.push({ id, pname, dir: picked.dir, manifest: manifest && !manifest.__parseError ? manifest : {}, override: pc || {} });
  };
  for (const [id, pc] of Object.entries(pluginCfg)) addPlugin(id, pc, false);
  // Remote-installed plugins (app-store installs) are enabled by a marker file in the cache, not by config.toml.
  for (const mk of listDir(cacheRoot)) {
    for (const pe of listDir(path.join(cacheRoot, mk.name))) {
      const id = `${pe.name}@${mk.name}`;
      if (id in pluginCfg) continue;
      if (isFile(path.join(cacheRoot, mk.name, pe.name, '.codex-remote-plugin-install.json'))) addPlugin(id, {}, true);
    }
  }

  // ---- 3. MCP servers ----
  const mcpEntries = []; // in precedence order, low -> high
  const addMcp = (servers, o) => {
    if (!isObj(servers)) return;
    for (const [name, cfg] of Object.entries(servers)) {
      let c = isObj(cfg) ? cfg : {};
      if (o.via) { const prev = mcpEntries.filter((e) => e.name === name).pop(); if (prev) c = { ...prev.cfg, ...c }; }
      mcpEntries.push({ name, cfg: c, ...o });
    }
  };
  addMcp(sysCfg.mcp_servers, { scope: 'managed', path: sysCfgPath });
  addMcp(userCfg.mcp_servers, { scope: 'user', path: userCfgPath });
  if (profName) addMcp(profCfg.mcp_servers, { scope: 'user', path: profSrc, profile: profName });
  for (const l of projCfgs) addMcp(l.cfg?.mcp_servers, { scope: l.scope, path: l.cfgPath, project: true });
  addMcp(ovCfg.mcp_servers, { scope: 'local', path: 'cli:-c', via: '-c' });

  const lastIdx = new Map();
  mcpEntries.forEach((e, i) => lastIdx.set(e.name, i));
  mcpEntries.forEach((e, i) => {
    const cfg = e.cfg;
    let gate = {};
    let status = cfg.enabled === false ? 'disabled' : 'active';
    let reason = cfg.enabled === false ? 'enabled = false' : undefined;
    if (e.project && !trusted) { status = 'needs-approval'; reason = projGate.reason; }
    if (lastIdx.get(e.name) !== i) { status = 'shadowed'; reason = 'overridden by a higher-precedence layer defining the same server'; }
    push({
      kind: 'mcp', name: e.name, scope: e.scope, status, path: e.path, ...(reason ? { reason } : {}),
      details: { ...mcpSummary(cfg), ...(e.project ? trustDetails : {}), ...(e.via ? { via: e.via } : {}), ...(e.profile ? { profile: e.profile } : {}), config: redact(cfg), ...gate },
    });
  });

  for (const pl of activePlugins) {
    const mf = pl.manifest.mcpServers;
    let servers = null; let src = null;
    if (isObj(mf)) { servers = mf.mcpServers || mf; src = path.join(pl.dir, '.codex-plugin', 'plugin.json'); }
    else if (typeof mf === 'string') {
      // Only a manifest `mcpServers` entry loads plugin servers; a bare .mcp.json is ignored (verified: `codex mcp list`
      // omits github@openai-curated, whose manifest has no mcpServers key).
      const p = path.join(pl.dir, mf);
      if (isFile(p)) {
        const j = readJson(p);
        if (j?.__parseError) warnings.push(`${p}: ${j.__parseError}`);
        else { servers = j?.mcpServers || j; src = p; }
      }
    }
    if (!isObj(servers)) continue;
    for (const [name, cfg0] of Object.entries(servers)) {
      if (!isObj(cfg0)) continue;
      const ov = pl.override.mcp_servers?.[name] || {};
      const cfg = { ...cfg0, ...ov };
      const disabled = cfg.enabled === false;
      push({
        kind: 'mcp', name, scope: 'plugin', plugin: pl.id, status: disabled ? 'disabled' : 'active', path: src, definedIn: userCfgPath,
        ...(disabled ? { reason: ov.enabled === false ? 'plugins.<id>.mcp_servers override enabled = false' : 'enabled = false in plugin .mcp.json' } : {}),
        details: { ...mcpSummary(cfg), ...(Object.keys(ov).length ? { overridden: Object.keys(ov) } : {}), config: redact(cfg) },
      });
    }
  }

  // ---- 4. skills ----
  const skillCfgs = [...(sysCfg.skills?.config || []), ...(userCfg.skills?.config || [])];
  const disabledSkills = new Set();
  for (const sc of skillCfgs) {
    if (!isObj(sc) || sc.enabled !== false || typeof sc.path !== 'string') continue;
    const p = sc.path.startsWith('~') ? path.join(home, sc.path.slice(1)) : sc.path;
    disabledSkills.add(real(path.basename(p) === 'SKILL.md' ? path.dirname(p) : p));
  }
  const seenSkillDirs = new Set();
  const skillRecs = [];
  const scanSkills = (root, scope, extra = {}) => {
    if (!isDir(root)) return;
    const rr = real(root);
    if (seenSkillDirs.has(rr + '|' + scope)) return;
    seenSkillDirs.add(rr + '|' + scope);
    for (const e of listDir(root).sort((a, b) => a.name.localeCompare(b.name))) {
      const dir = path.join(root, e.name);
      if (!isDir(dir)) continue;
      if (e.name === '.system' && extra.allowSystem) { scanSkills(dir, 'builtin', { ...extra, allowSystem: false }); continue; }
      if (e.name.startsWith('.')) continue;
      const md = path.join(dir, 'SKILL.md');
      if (!isFile(md)) continue;
      const fm = readFrontmatter(md);
      const name = String(fm?.data?.name || e.name);
      const desc = fm?.data?.description;
      const realDir = real(dir);
      const off = disabledSkills.has(realDir) || disabledSkills.has(path.resolve(dir));
      let allowImplicit;
      const oy = path.join(realDir, 'agents', 'openai.yaml');
      if (isFile(oy)) {
        try { allowImplicit = YAML.parse(readText(oy))?.policy?.allow_implicit_invocation; } catch { /* ignore */ }
      }
      const symlink = realDir !== path.resolve(dir);
      const noModel = fm?.data?.['disable-model-invocation'] === true || allowImplicit === false;
      const listName = extra.plugin ? `${extra.pluginName}:${name}` : name;
      skillRecs.push({
        listName, noModel, off, scope, dir: path.resolve(dir), builtin: scope === 'builtin',
        rel: extra.plugin ? path.relative(path.dirname(path.dirname(extra.pluginDir)), path.join(dir, 'SKILL.md')) : `${e.name}/SKILL.md`,
        fields: {
          kind: 'skill', name: listName, scope, path: path.join(realDir, 'SKILL.md'),
          ...(extra.plugin ? { plugin: extra.plugin } : {}),
          details: {
            listedPath: path.join(path.resolve(dir), 'SKILL.md'),
            ...(desc ? { description: String(desc).slice(0, 300) } : {}),
            ...(symlink ? { symlinkFrom: path.resolve(dir) } : {}),
            ...(allowImplicit === false ? { implicitInvocation: false } : {}),
            ...(fm?.data?.['disable-model-invocation'] === true ? { disableModelInvocation: true } : {}),
            ...(!fm?.data?.name ? { nameFromDir: true } : {}),
          },
        },
      });
    }
  };
  for (const d of dirs.slice().reverse()) scanSkills(path.join(d, '.agents', 'skills'), scopeOf(d));
  scanSkills(path.join(home, '.agents', 'skills'), 'user');
  scanSkills(path.join(sysDir, 'skills'), 'managed');
  scanSkills(path.join(codexHome, 'skills'), 'user', { allowSystem: true });
  for (const pl of activePlugins) {
    const sp = typeof pl.manifest.skills === 'string' ? pl.manifest.skills : 'skills';
    scanSkills(path.join(pl.dir, sp), 'plugin', { plugin: pl.id, pluginName: pl.manifest.name || pl.pname, pluginDir: pl.dir });
  }
  finalizeSkills();
  function finalizeSkills() {
    // Codex renders <skills_instructions>: builtin first, then repo skills, then everything else by name
    // (case-insensitive) then real path. Skills with model invocation disabled are omitted. Entries are added
    // first-fit until a size budget is used up (a later, shorter entry can still fit after a longer one is skipped).
    const eligible = skillRecs.filter((r) => !r.off && !r.noModel);
    const rank = (r) => (r.builtin ? 0 : r.scope === 'project' || r.scope === 'ancestor' ? 1 : 2);
    eligible.sort((a, b) => rank(a) - rank(b) || a.listName.toLowerCase().localeCompare(b.listName.toLowerCase()) || (a.fields.path < b.fields.path ? -1 : a.fields.path > b.fields.path ? 1 : 0));
    const fill = (budget) => {
      let used = 0; const inc = new Set();
      for (const r of eligible) {
        const len = `- ${r.listName}: (file: r0/${r.rel})\n`.length;
        if (used + len <= budget) { used += len; inc.add(r); }
      }
      return inc;
    };
    const win = skillWindow();
    let lo; let hi; let basis;
    if (ctx.skillBudget) { lo = hi = fill(ctx.skillBudget); basis = `test budget ${ctx.skillBudget}`; }
    else if (win) {
      lo = fill(windowBudget(win.low)); hi = win.high === win.low ? lo : fill(windowBudget(win.high));
      basis = `context window ${win.low}${win.high !== win.low ? `..${win.high}` : ''} (${win.source})`;
    } else { lo = hi = new Set(eligible); basis = null; warnings.push('skill listing budget not modelled: model context window unknown'); }
    let unknownN = 0; let cutN = 0;
    for (const r of skillRecs) {
      let status = 'active'; let reason;
      if (r.off) { status = 'disabled'; reason = '[[skills.config]] enabled = false'; }
      else if (r.noModel) { status = 'conditional'; reason = 'model invocation disabled (disable-model-invocation / allow_implicit_invocation=false): omitted from the skill listing, usable via explicit $skill'; }
      else if (!lo.has(r) && hi.has(r)) { status = 'unknown'; unknownN++; r.fields.details.reason = 'skill-list-budget-uncertain'; reason = `listed only if the session ran with the larger context window (${basis}); the cap is ~2% of the window in tokens (4 chars/token), inferred not documented`; }
      else if (!hi.has(r)) { status = 'shadowed'; cutN++; r.fields.details.reason = 'skill-list-budget'; reason = `dropped from the skill listing: skills context budget exceeded (${basis})`; }
      push({ ...r.fields, status, ...(reason ? { reason } : {}), ...(r.off ? { definedIn: userCfgPath } : {}) });
    }
    if (cutN) warnings.push(`${cutN} skills fall past the skill-listing budget and are not shown to the model`);
    if (unknownN) warnings.push(`${unknownN} skills are listed only if the session used the larger context window; status unknown`);
  }
  // Raw model context window (before Codex's 95% effective factor): explicit config/-c wins, else the model catalog.
  // If the window is not pinned by config, the app-server may still raise it to the catalog max, so return a range.
  function skillWindow() {
    const model = base.model;
    const cat = readJson(path.join(codexHome, 'models_cache.json'));
    const m = (cat?.models || []).find((x) => x.slug === model);
    const pinned = Number(base.model_context_window);
    if (Number.isFinite(pinned) && pinned > 0) return { low: pinned, high: pinned, source: 'model_context_window config' };
    if (!m?.context_window) return null;
    return { low: m.context_window, high: Math.max(m.context_window, m.max_context_window || 0), source: `models_cache ${model}` };
  }

  // ---- 5. hooks ----
  const hooksFlag = firstDefined(ovCfg.features?.hooks, ovCfg.features?.codex_hooks, profCfg.features?.hooks, profCfg.features?.codex_hooks, userCfg.features?.hooks, userCfg.features?.codex_hooks, sysCfg.features?.hooks, sysCfg.features?.codex_hooks);
  const hooksOn = hooksFlag !== false;
  const hookGate = hooksOn ? {} : { status: 'disabled', reason: '[features] hooks = false' };
  const emitHooks = (map, o) => {
    if (!isObj(map)) return;
    for (const [event, groups] of Object.entries(map)) {
      if (!Array.isArray(groups)) continue;
      const seen = new Map();
      groups.forEach((g) => {
        if (!isObj(g)) return;
        const base_ = `${event}[${g.matcher || '*'}]`;
        const handlers = (Array.isArray(g.hooks) ? g.hooks : []).filter(isObj).map((h) => redact(h));
        const gate = o.gate && o.gate.status ? o.gate : hookGate;
        // One item per handler so each command / mcp_tool target is individually listed.
        (handlers.length ? handlers : [null]).forEach((h) => {
          const k = (seen.get(base_) || 0) + 1; seen.set(base_, k);
          push({
            kind: 'hook', name: k > 1 ? `${base_}#${k}` : base_, scope: o.scope, path: o.path, status: 'active', ...gate,
            ...(o.plugin ? { plugin: o.plugin } : {}), ...(o.definedIn ? { definedIn: o.definedIn } : {}),
            details: {
              event, matcher: g.matcher ?? null,
              ...(h ? { type: h.type, ...(h.command !== undefined ? { command: h.command } : {}), ...(h.server !== undefined ? { server: h.server } : {}), ...(h.tool !== undefined ? { tool: h.tool } : {}), ...(h.input !== undefined ? { input: h.input } : {}), ...(h.timeout !== undefined ? { timeout: h.timeout } : {}), ...(h.async !== undefined ? { async: h.async } : {}), ...(h.statusMessage !== undefined ? { statusMessage: h.statusMessage } : {}) } : {}),
              trustReviewRequired: !o.managed, ...(o.project ? trustDetails : {}), ...(hooksFlag === undefined ? {} : { featureFlag: hooksFlag }),
              ...(ovCfg.features && (ovCfg.features.hooks !== undefined || ovCfg.features.codex_hooks !== undefined) ? { via: '-c' } : {}),
            },
          });
        });
      });
    }
  };
  const userHooksJson = path.join(codexHome, 'hooks.json');
  if (isFile(userHooksJson)) emitHooksJson(userHooksJson, { scope: 'user' });
  emitHooks(userCfg.hooks, { scope: 'user', path: userCfgPath });
  if (profName) emitHooks(profCfg.hooks, { scope: 'user', path: profSrc });
  emitHooks(sysCfg.hooks, { scope: 'managed', path: sysCfgPath, managed: true });
  for (const l of projCfgs) emitHooks(l.cfg?.hooks, { scope: l.scope, path: l.cfgPath, project: true, gate: projGate });
  for (const l of projLayers) {
    const hj = path.join(l.codexDir, 'hooks.json');
    if (isFile(hj)) emitHooksJson(hj, { scope: l.scope, project: true, gate: projGate });
  }
  for (const pl of activePlugins) {
    const hm = pl.manifest.hooks;
    if (isObj(hm)) emitHooks(hm.hooks || hm, { scope: 'plugin', plugin: pl.id, path: path.join(pl.dir, '.codex-plugin', 'plugin.json'), definedIn: userCfgPath });
    else {
      const p = path.join(pl.dir, typeof hm === 'string' ? hm : path.join('hooks', 'hooks.json'));
      if (isFile(p)) emitHooksJson(p, { scope: 'plugin', plugin: pl.id, definedIn: userCfgPath });
    }
  }
  function emitHooksJson(p, o) {
    const j = readJson(p);
    if (j?.__parseError) { warnings.push(`${p}: ${j.__parseError}`); return; }
    emitHooks(j?.hooks || j, { ...o, path: p });
  }

  const notify = userCfg.notify ?? sysCfg.notify;
  if (Array.isArray(notify) && notify.length) {
    push({
      kind: 'hook', name: 'notify', scope: userCfg.notify ? 'user' : 'managed', status: 'active',
      path: userCfg.notify ? userCfgPath : sysCfgPath,
      details: { event: 'agent-turn-complete', command: notify.map(String), note: 'legacy notify; not gated by [features] hooks' },
    });
  }

  // ---- 6. rules ----
  const emitRules = (dir, o) => {
    for (const e of listDir(dir).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!e.name.endsWith('.rules')) continue;
      const p = path.join(dir, e.name);
      if (!isFile(p)) continue;
      const count = (readText(p) || '').match(/^\s*prefix_rule\s*\(/gm)?.length || 0;
      push({ kind: 'rule', name: e.name, scope: o.scope, status: 'active', path: p, ...(o.gate || {}), details: { count, ...(o.project ? trustDetails : {}) } });
    }
  };
  emitRules(path.join(sysDir, 'rules'), { scope: 'managed' });
  emitRules(path.join(codexHome, 'rules'), { scope: 'user' });
  for (const l of projLayers) emitRules(path.join(l.codexDir, 'rules'), { scope: l.scope, project: true, gate: projGate });

  return { harness: H, projectRoot, chain, items, warnings };
}

function deepMerge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    if (isObj(v) && isObj(a[k])) deepMerge(a[k], v); else a[k] = v;
  }
  return a;
}

function firstDefined(...vs) { return vs.find((v) => v !== undefined); }

function mcpSummary(cfg) {
  const o = { transport: cfg.url ? 'http' : cfg.command ? 'stdio' : 'unknown' };
  if (cfg.command) o.command = cfg.command;
  if (Array.isArray(cfg.args)) o.args = cfg.args;
  if (cfg.url) o.url = cfg.url;
  if (cfg.cwd) o.cwd = cfg.cwd;
  if (cfg.required !== undefined) o.required = cfg.required;
  if (cfg.enabled_tools) o.enabledTools = cfg.enabled_tools;
  if (cfg.disabled_tools) o.disabledTools = cfg.disabled_tools;
  return o;
}

// Exact entry for the project root (then cwd) decides; otherwise the nearest trusted ancestor.
function resolveTrust(projects, root, cwd) {
  const norm = (p) => p.replace(/\/+$/, '') || '/';
  const table = new Map(Object.entries(projects).map(([k, v]) => [norm(k), v]));
  const lookup = (p) => table.get(p) ?? table.get(canonical(p));
  for (const p of [root, cwd].filter(Boolean)) {
    const e = lookup(p);
    if (e) {
      const t = e.trust_level === 'trusted';
      return { trusted: t, match: t ? 'exact' : 'exact-untrusted', via: p };
    }
  }
  for (const p of ancestors(root || cwd)) {
    if (p === (root || cwd)) continue;
    const e = lookup(p);
    if (e?.trust_level === 'trusted') return { trusted: true, match: 'ancestor', via: p };
  }
  return { trusted: false, match: 'none' };
}
