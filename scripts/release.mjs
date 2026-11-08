import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { releasePlan } from './policy.mjs';

const git = args => execFileSync('git', args, { encoding: 'utf8' }).trim();
const ref = process.env.GITHUB_REF || `refs/heads/${git(['branch', '--show-current'])}`;
const plan = releasePlan(ref, process.env.GITHUB_RUN_NUMBER || 'local', process.env.GITHUB_RUN_ATTEMPT || '1');
const sha = git(['rev-parse', 'HEAD']);
if (process.env.GITHUB_SHA && sha !== process.env.GITHUB_SHA) throw new Error('发布提交与触发提交不一致。');
if (git(['status', '--porcelain'])) throw new Error('工作区不干净，拒绝打包。');
if (!plan.prerelease) {
  if (git(['rev-parse', `${ref}^{commit}`]) !== sha) throw new Error('标签与发布提交不一致。');
  git(['merge-base', '--is-ancestor', sha, 'refs/remotes/origin/master']);
  git(['merge-base', '--is-ancestor', `refs/remotes/origin/release/${plan.version}`, sha]);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!/^[a-z0-9-]+$/.test(pkg.name) || pkg.releaseKind !== 'source-baseline') throw new Error('新增应用产物前须明确实现打包和验收规则。');
const directory = path.resolve('artifacts', plan.tag);
fs.mkdirSync(directory, { recursive: true });
const archive = `${pkg.name}-${plan.tag}-source.zip`;
git(['archive', '--format=zip', `--prefix=${pkg.name}-${plan.tag}/`, `--output=${path.join(directory, archive)}`, sha]);
const manifest = { repository: pkg.name, version: plan.tag, sourceCommit: sha, sourceRef: ref, kind: 'source-baseline', applicationReady: false };
fs.writeFileSync(path.join(directory, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
const assets = [archive, 'release-manifest.json'];
const sums = assets.map(name => `${createHash('sha256').update(fs.readFileSync(path.join(directory, name))).digest('hex')}  ${name}`).join('\n');
fs.writeFileSync(path.join(directory, 'SHA256SUMS.txt'), `${sums}\n`);
assets.push('SHA256SUMS.txt');
const notes = `工程基线版本：包含开发约定、分支规范、CI 与 Release 自动化源码。\n\n本版本不是可运行的 Wiki 应用或完整资料解析程序，不包含游戏资源、SQLite 或 Cloudflare 部署。\n\n提交：${sha}\n\n附件包含源码包、版本清单和 SHA-256 校验文件。\n`;
const notesPath = path.join(directory, 'release-notes.md');
fs.writeFileSync(notesPath, notes);
if (process.env.RELEASE_PUBLISH === 'true') {
  if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GH_REPO) throw new Error('发布仅在 GitHub Release 工作流执行；本地只打包。');
  const args = ['release', 'create', plan.tag, ...assets.map(name => path.join(directory, name)), '--target', sha, '--title', `${pkg.name} ${plan.tag}`, '--notes-file', notesPath];
  if (plan.prerelease) args.push('--prerelease', '--latest=false');
  else args.push('--verify-tag');
  execFileSync('gh', args, { stdio: 'inherit' });
}
console.log(JSON.stringify({ ...plan, commit: sha, directory, published: process.env.RELEASE_PUBLISH === 'true' }));
