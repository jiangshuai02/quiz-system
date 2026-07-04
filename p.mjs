import { copyFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import https from 'https';

const TOKEN = process.env.GH_TOKEN;
const REPO = 'jiangshuai02/quiz-system';
const skipDirs = new Set(['node_modules', 'dist', '.git', '.workbuddy', '.vscode', '.idea']);
const skipFiles = new Set(['.DS_Store', '.gitignore', 'README.md', 'render.yaml']);

function listFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name) || skipFiles.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...listFiles(full, base));
    else files.push(relative(base, full).replace(/\\/g, '/'));
  }
  return files;
}
function api(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', port: 443, path, method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'shuati-pusher',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, data: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const root = process.cwd();
const ref = await api('GET', `/repos/${REPO}/git/refs/heads/main`);
const baseSha = ref.data?.object?.sha;
const files = listFiles(root);
const tree = [];
for (const f of files) {
  const content = readFileSync(join(root, f));
  const blobRes = await api('POST', `/repos/${REPO}/git/blobs`, { encoding: 'base64', content: content.toString('base64') });
  tree.push({ path: f, mode: '100644', type: 'blob', sha: blobRes.data.sha });
}
const treeRes = await api('POST', `/repos/${REPO}/git/trees`, { base_tree: baseSha, tree });
const commitRes = await api('POST', `/repos/${REPO}/git/commits`, {
  message: 'fix: 登录时先查/创建 auth users 拿到真实 UUID,确保 profiles 创建成功',
  tree: treeRes.data.sha, parents: [baseSha],
});
await api('PATCH', `/repos/${REPO}/git/refs/heads/main`, { sha: commitRes.data.sha });
console.log('Commit:', commitRes.data?.sha?.slice(0,12), '✅');
