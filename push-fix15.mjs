import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import https from 'https';

const TOKEN = process.env.GH_TOKEN;
const REPO = 'jiangshuai02/quiz-system';

const skipDirs = new Set(['node_modules', 'dist', '.git', '.workbuddy', '.vscode', '.idea']);
const skipFiles = new Set(['.DS_Store', '.gitignore', 'README.md']);

function listFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    if (skipFiles.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...listFiles(full, base));
    } else {
      files.push(relative(base, full).replace(/\\/g, '/'));
    }
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
console.log('Working dir:', root);

const ref = await api('GET', `/repos/${REPO}/git/ref/heads/main`);
let baseSha = ref.data?.object?.sha;
if (!baseSha) {
  console.log('No main branch, creating...');
  // 取某个 commit 作为基础
  const commits = await api('GET', `/repos/${REPO}/commits?per_page=1`);
  if (commits.data?.[0]?.sha) baseSha = commits.data[0].sha;
  else baseSha = null;
}
console.log('Base SHA:', baseSha);

const files = listFiles(root);
console.log(`Found ${files.length} files to push`);

// 1. 创建 blobs
const tree = [];
for (const f of files) {
  const content = readFileSync(join(root, f));
  const blobRes = await api('POST', `/repos/${REPO}/git/blobs`, {
    encoding: 'base64', content: content.toString('base64')
  });
  tree.push({ path: f, mode: '100644', type: 'blob', sha: blobRes.data.sha });
  if (tree.length % 5 === 0) console.log(`  ${tree.length}/${files.length}...`);
}
console.log(`All ${tree.length} blobs created`);

// 2. 创建 tree
const treeRes = await api('POST', `/repos/${REPO}/git/trees`, {
  base_tree: baseSha, tree
});
console.log('New tree SHA:', treeRes.data?.sha);

// 3. 创建 commit
const commitRes = await api('POST', `/repos/${REPO}/git/commits`, {
  message: 'feat: 答对自动跳转 + 科目直进刷题 + 手机端完整适配',
  tree: treeRes.data.sha,
  parents: baseSha ? [baseSha] : [],
});
console.log('New commit SHA:', commitRes.data?.sha);

// 4. 更新 main 分支
if (baseSha) {
  const updateRes = await api('PATCH', `/repos/${REPO}/git/refs/heads/main`, {
    sha: commitRes.data.sha
  });
  console.log('Ref updated:', updateRes.status);
} else {
  const createRes = await api('POST', `/repos/${REPO}/git/refs`, {
    ref: 'refs/heads/main', sha: commitRes.data.sha
  });
  console.log('Ref created:', createRes.status);
}

console.log('\n✅ Push complete!');
