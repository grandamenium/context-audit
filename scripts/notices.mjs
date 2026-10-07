// Writes dist/THIRD_PARTY_LICENSES.txt for the dependencies bundled into dist/context-audit.mjs.
import fs from 'node:fs';
import path from 'node:path';

const deps = Object.keys(JSON.parse(fs.readFileSync('package.json', 'utf8')).dependencies);
let out = 'Third-party software bundled in dist/context-audit.mjs\n';
for (const d of deps) {
  const dir = path.join('node_modules', d);
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const lic = fs.readdirSync(dir).find((f) => /^licen[cs]e/i.test(f));
  out += `\n${'='.repeat(72)}\n${d}@${pkg.version} (${pkg.license})\n${'='.repeat(72)}\n\n${lic ? fs.readFileSync(path.join(dir, lic), 'utf8').trim() : '(no license file)'}\n`;
}
fs.writeFileSync('dist/THIRD_PARTY_LICENSES.txt', out);
