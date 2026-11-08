import test from 'node:test';
import assert from 'node:assert/strict';
import { branchKind, checkMerge, checkEvent, releasePlan } from './policy.mjs';

test('接受独立功能、epic 子功能和三段版本号', () => {
  for (const branch of ['master', 'epic/pwa', 'feature/search', 'feature/pwa/install', 'hotfix/cache-loop', 'release/0.0.1', 'release/12.3.45']) assert.doesNotThrow(() => branchKind(branch));
});
test('拒绝旧主分支、任意前缀、空名称和非规范版本号', () => {
  for (const branch of ['main', 'develop', 'fix/cache', 'feature/', 'feature/a/b/c', 'epic/A', 'release/v1.0.0', 'release/01.2.3', 'release/1.2.3-rc.1']) assert.throws(() => branchKind(branch));
});
test('epic 子功能只能先汇入所属 epic', () => {
  assert.doesNotThrow(() => checkMerge('feature/pwa/install', 'epic/pwa'));
  assert.throws(() => checkMerge('feature/pwa/install', 'epic/search'));
  assert.throws(() => checkMerge('feature/pwa/install', 'release/1.0.0'));
  assert.throws(() => checkMerge('feature/install', 'epic/pwa'));
});
test('发布分支汇集独立功能、epic、hotfix，再进入 master', () => {
  for (const head of ['feature/search', 'epic/pwa', 'hotfix/cache-loop', 'master']) assert.doesNotThrow(() => checkMerge(head, 'release/1.0.0'));
  assert.doesNotThrow(() => checkMerge('release/1.0.0', 'master'));
  for (const head of ['feature/search', 'epic/pwa', 'hotfix/cache-loop']) assert.throws(() => checkMerge(head, 'master'));
});
test('master 可同步进未完成的 epic', () => assert.doesNotThrow(() => checkMerge('master', 'epic/pwa')));
test('release 分支产生唯一候选标签，重新运行不覆盖上一候选', () => {
  assert.deepEqual(releasePlan('refs/heads/release/1.2.3', '8', '1'), { version: '1.2.3', tag: 'v1.2.3-rc.8.1', prerelease: true });
  assert.notEqual(releasePlan('refs/heads/release/1.2.3', '8', '2').tag, releasePlan('refs/heads/release/1.2.3', '8', '1').tag);
});
test('只接受正式语义版本标签；任意分支不能发布', () => {
  assert.deepEqual(releasePlan('refs/tags/v1.2.3'), { version: '1.2.3', tag: 'v1.2.3', prerelease: false });
  for (const ref of ['refs/heads/master', 'refs/heads/feature/search', 'refs/tags/v1.2.3-rc.1', 'refs/tags/v01.2.3', 'refs/tags/v1.2.3;echo']) assert.throws(() => releasePlan(ref));
  assert.throws(() => releasePlan('refs/heads/release/1.2.3', '8;echo'));
});
test('PR 按真实 head/base 校验，不用 refs/pull 合成名称', () => {
  assert.doesNotThrow(() => checkEvent({ pull_request: { head: { ref: 'feature/pwa/install' }, base: { ref: 'epic/pwa' } } }, { eventName: 'pull_request', ref: 'refs/pull/1/merge' }));
  assert.throws(() => checkEvent({ pull_request: { head: { ref: 'feature/pwa/install' }, base: { ref: 'master' } } }, { eventName: 'pull_request', ref: 'refs/pull/1/merge' }));
  assert.throws(() => checkEvent({}, { eventName: 'pull_request' }));
});
