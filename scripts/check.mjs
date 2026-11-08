import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { branchKind, checkEvent } from './policy.mjs';

const root = process.cwd();
const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const files = [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))];
const problems = [];
let links = 0;
for (const required of ['AGENTS.md', 'README.md', 'docs/development.md', 'docs/branching.md', '.github/workflows/ci.yml', '.github/workflows/release.yml']) {
  if (!fs.existsSync(required)) problems.push(`缺少 ${required}`);
}
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('.env.example')) problems.push(`禁止提交凭据文件：${file}`);
  if (/\.(?:sqlite(?:-.*)?|db|spf|ldt)$/i.test(file) || /^(?:raw|local-data|artifacts|data-releases)\//.test(file)) problems.push(`禁止提交本地资料或产物：${file}`);
  if (!fs.existsSync(file)) { problems.push(`文件缺失：${file}`); continue; }
  if (fs.lstatSync(file).isSymbolicLink()) { problems.push(`基线阶段不接收符号链接：${file}`); continue; }
  if (file.endsWith('.json')) {
    try { JSON.parse(fs.readFileSync(file, 'utf8')); } catch { problems.push(`JSON 无效：${file}`); }
  }
  if (!file.endsWith('.md')) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('\uFFFD')) problems.push(`文本编码损坏：${file}`);
  if ((text.match(/^```/gm) ?? []).length % 2) problems.push(`代码块未闭合：${file}`);
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
    links++;
    const resolved = path.resolve(path.dirname(file), target);
    const relative = path.relative(root, resolved);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) problems.push(`链接越出仓库：${file} → ${target}`);
    else if (!fs.existsSync(resolved)) problems.push(`链接不存在：${file} → ${target}`);
  }
}
try {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    checkEvent(event, { eventName: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF });
  } else branchKind(git(['branch', '--show-current']));
} catch (error) { problems.push(error.message); }
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else console.log(`校验通过：${files.length} 个文件，${links} 个本地链接，分支规则有效。`);
