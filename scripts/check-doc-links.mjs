import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';

const roots = ['README.md', 'ROADMAP.md', 'docs/**/*.md'];
const files = await fg(roots, { onlyFiles: true });
const failures = [];
for (const file of files) {
  const contents = await readFile(file, 'utf8');
  for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (!target || /^(?:https?:|#)/.test(target)) continue;
    const clean = target.split('#')[0];
    if (!clean) continue;
    try { await access(path.resolve(path.dirname(file), clean)); }
    catch { failures.push(`${file}: missing ${target}`); }
  }
}
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified links in ${files.length} documentation files.`);
}
