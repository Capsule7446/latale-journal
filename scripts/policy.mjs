const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const version = '(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)';

export function branchKind(name) {
  if (name === 'master') return 'master';
  if (new RegExp(`^epic/${slug}$`).test(name)) return 'epic';
  if (new RegExp(`^feature/${slug}(?:/${slug})?$`).test(name)) return 'feature';
  if (new RegExp(`^hotfix/${slug}$`).test(name)) return 'hotfix';
  if (new RegExp(`^release/${version}$`).test(name)) return 'release';
  throw new Error(`无效分支：${name}；使用 master、epic/*、feature/*、feature/<epic>/*、hotfix/* 或 release/X.Y.Z。`);
}

export function checkMerge(head, base) {
  const from = branchKind(head), to = branchKind(base);
  if (to === 'master' && from === 'release') return;
  if (to === 'release' && ['feature', 'epic', 'hotfix', 'master'].includes(from)) {
    if (from === 'feature' && head.split('/').length === 3) {
      throw new Error('epic 下的 feature 必须先合入所属 epic。');
    }
    return;
  }
  if (to === 'epic' && (head === 'master' || (from === 'feature' && head.split('/')[1] === base.split('/')[1] && head.split('/').length === 3))) return;
  throw new Error(`不允许 ${head} → ${base}；功能先汇入所属 epic/发布分支，release 再合入 master。`);
}

export function releasePlan(ref, run = 'local', attempt = '1') {
  const candidate = ref.match(new RegExp(`^refs/heads/release/(${version})$`));
  if (candidate) {
    if (!/^(?:local|[1-9][0-9]*)$/.test(run) || !/^[1-9][0-9]*$/.test(attempt)) throw new Error('无效运行编号。');
    return { version: candidate[1], tag: `v${candidate[1]}-rc.${run}.${attempt}`, prerelease: true };
  }
  const stable = ref.match(new RegExp(`^refs/tags/v(${version})$`));
  if (stable) return { version: stable[1], tag: `v${stable[1]}`, prerelease: false };
  throw new Error(`发布只能来自 release/X.Y.Z 或正式标签 vX.Y.Z：${ref}`);
}

export function checkEvent(event, context) {
  if (context.eventName === 'pull_request') {
    if (!event.pull_request) throw new Error('缺少 PR 元数据。');
    checkMerge(event.pull_request.head.ref, event.pull_request.base.ref);
  } else if (context.ref?.startsWith('refs/heads/')) {
    branchKind(context.ref.slice('refs/heads/'.length));
  } else if (context.ref?.startsWith('refs/tags/')) {
    releasePlan(context.ref);
  } else {
    throw new Error(`无法核验事件引用：${context.ref}`);
  }
}
