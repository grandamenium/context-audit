import fs from 'node:fs';
import path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { parse as parseJsonc } from 'jsonc-parser';
import YAML from 'yaml';

export const exists = (p) => { try { fs.accessSync(p); return true; } catch { return false; } };
export const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
export const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
export const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
export const fileSize = (p) => { try { return fs.statSync(p).size; } catch { return 0; } };

// macOS is case-insensitive; realpath.native returns the on-disk casing, which
// matters because harnesses key per-project config by exact path string.
export function canonical(p) {
  try { return fs.realpathSync.native(p); } catch { return path.resolve(p); }
}

export function listDir(p) {
  try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; }
}

// Entries that are directories, following symlinks.
export function subdirs(p) {
  return listDir(p).filter((e) => isDir(path.join(p, e.name))).map((e) => e.name).sort();
}

export function readJson(p) {
  const t = readText(p);
  if (t == null) return null;
  try { return JSON.parse(t); } catch (e) { return { __parseError: String(e.message) }; }
}

export function readJsonc(p) {
  const t = readText(p);
  if (t == null) return null;
  const errors = [];
  const v = parseJsonc(t, errors, { allowTrailingComma: true });
  return errors.length && v == null ? { __parseError: 'jsonc parse error' } : v;
}

export function readToml(p) {
  const t = readText(p);
  if (t == null) return null;
  try { return parseToml(t); } catch (e) { return { __parseError: String(e.message) }; }
}

// Returns { data, body } for a markdown file with optional YAML frontmatter.
export function readFrontmatter(p) {
  const t = readText(p);
  if (t == null) return null;
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: t };
  let data = {};
  try { data = YAML.parse(m[1]) || {}; } catch {
    // Lenient fallback: harnesses tolerate unquoted colons in descriptions.
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
      if (kv) data[kv[1]] = kv[2];
    }
  }
  return { data, body: m[2] };
}

// Directories from `from` up to and including `to` (or filesystem root), nearest first.
export function ancestors(from, to = null) {
  const out = [];
  let cur = path.resolve(from);
  for (;;) {
    out.push(cur);
    if (to && cur === path.resolve(to)) break;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return out;
}

// Nearest ancestor containing any of `markers` (default .git, file or dir).
export function findRoot(from, markers = ['.git']) {
  for (const d of ancestors(from)) {
    if (markers.some((m) => exists(path.join(d, m)))) return d;
  }
  return null;
}

export const tildify = (p, home) => (home && p && p.startsWith(home + path.sep) ? '~' + p.slice(home.length) : p);
