
const AU='\u59DC\u5E05',AP='17539363075';
let cQs=[];

// 页面加载时直接加载数据
document.addEventListener('DOMContentLoaded', function(){ loadData(); });

function doLogout(){
  sessionStorage.removeItem('admin_auth');
  sessionStorage.removeItem('admin_time');
  location.href = '/';
}

// ==================== Data Loading ====================
async function apiGet(url) {
  const r = await fetch(url);
  if (!r.ok) {
    if (r.status === 401 || r.status === 302) {
      throw new Error('登录已过期，请重新进入管理后台');
    }
    const text = await r.text().catch(() => '');
    throw new Error('服务器错误 (' + r.status + '): ' + text.slice(0, 100));
  }
  return r.json();
}

async function apiPost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      throw new Error('权限不足或登录已过期');
    }
    const text = await r.text().catch(() => '');
    throw new Error('操作失败 (' + r.status + '): ' + text.slice(0, 100));
  }
  return r.json();
}

async function loadData(){
  const a = document.getElementById('utArea');
  a.innerHTML = '<div class="emp"><span class="ei">⏳</span><div class="em">加载中...</div><div class="es">正在从服务器获取数据...</div></div>';
  try{
    const [users, subs] = await Promise.all([apiGet('/api/admin/users'), apiGet('/api/subjects')]);
    renderStats(users, subs);
    renderTable(users);
    fillSel(subs);
  }catch(e){
    console.error('[loadData]', e);
    a.innerHTML = '<div class="emp"><span class="ei">❌</span><div class="em">加载数据失败</div><div class="es" style="color:var(--d)">' + esc(e.message) + '<br><br><a href="/" style="color:var(--p)">← 返回首页重新进入</a></div></div>';
    toast('❌ ' + e.message);
  }
}

function renderStats(u,s){
  let ta=0,tok=0,qc=0;
  document.getElementById('stU').textContent=u.length;
  u.forEach(x=>{ta+=(x.total_answered||0);tok+=(x.correct||0);});
  document.getElementById('stA').textContent=ta;
  s.forEach(x=>{qc+=(x.count||0)});
  document.getElementById('stQ').textContent=qc;
  document.getElementById('stR').textContent=(ta?(tok/ta*100).toFixed(1):0)+'%';
}

function renderTable(users){
  const a=document.getElementById('utArea');
  if(!users.length){
    a.innerHTML='<div class="emp"><span class="ei">👤</span><div class="em">暂无用户答题记录</div><div class="es">当用户进入系统并答题后，会显示在这里</div></div>';
    return;
  }
  let h='<table class="tbl"><thead><tr>'+
    '<th>#</th><th>用户名</th><th>答题总数</th><th>答对数</th><th>正确率</th><th>首次答题</th><th>最后活跃</th><th>IP地址</th><th>操作</th>'+
    '</tr></thead><tbody>';
  users.forEach((u,i)=>{
    const ac=u.accuracy||0,bg=ac>=60?'bg':'br';
    h+='<tr>'+
      '<td>'+(i+1)+'</td>'+
      '<td style="font-weight:800">'+esc(u.name||'未命名')+'</td>'+
      '<td>'+(u.total_answered||0)+'</td>'+
      '<td>'+(u.correct||0)+'</td>'+
      '<td><span class="badge '+bg+'">'+ac+'%</span></td>'+
      '<td style="color:var(--tm);font-size:12px">'+(u.first_seen||'-')+'</td>'+
      '<td style="color:var(--tm);font-size:12px">'+(u.last_seen||'-')+'</td>'+
      '<td style="color:var(--tm);font-size:12px;max-width:110px;overflow:hidden;text-overflow:ellipsis" title="'+ea(u.ips)+'">'+(u.ips||'-')+'</td>'+
      '<td><button class="dbtn" onclick="showDetail(\''+ea(u.name)+'\',this)">📋 查看详情</button> '+
      '<button class="dbtn" onclick="showWrong(\''+ea(u.name)+'\')" style="margin-left:4px">❌ 错题</button></td>'+
    '</tr>';
  });
  h+='</tbody></table>';
  a.innerHTML=h;
}

async function showDetail(name,row){
  // Show detail panel instead of modal for better UX
  const ds=document.getElementById('detailSec');
  document.getElementById('dtName').textContent='📋 '+name+' 的详细信息';
  const body=document.getElementById('dtBody');

  // Get user stats from the row's data
  try {
    const r = await apiGet('/api/admin/user_detail?name=' + encodeURIComponent(name));
    const recs=await r.json();

    let h='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">';
    // We need to get user info - let's fetch from table context or recalculate
    const cells=row.parentNode.cells;
    h+='<div style="background:#eff6ff;padding:14px;border-radius:10px;text-align:center"><div style="font-size:11px;color:var(--t2)">答题总数</div><div style="font-size:24px;font-weight:900;color:var(--p)">'+cells[2].textContent+'</div></div>';
    h+='<div style="background:#f0fdf4;padding:14px;border-radius:10px;text-align:center"><div style="font-size:11px;color:var(--t2)">答对数量</div><div style="font-size:24px;font-weight:900;color:var(--s)">'+cells[3].textContent+'</div></div>';
    h+='<div style="background:#fefce8;padding:14px;border-radius:10px;text-align:center"><div style="font-size:11px;color:var(--t2)">正确率</div><div style="font-size:24px;font-weight:900;color:'+((parseFloat(cells[4].textContent)>=60?'var(--s)':'var(--d)')+'">'+cells[4].textContent+'</div></div>';
    h+='</div>';

    h+='<h4 style="font-size:14px;font-weight:700;margin-bottom:10px;color:var(--t2)">最近错题（'+recs.length+'道）</h4>';

    if(!recs.length){
      h+='<div class="emp"><span class="ei">🎉</span><div class="em">太棒了！没有错题记录</div></div>';
    } else {
      const tm={single:'单选',multiple:'多选',judge:'判断',fill:'填空',essay:'简答'};
      recs.slice(0,10).forEach((r,i)=>{
        h+='<div style="padding:12px;background:#fef2f2;border-radius:10px;margin-bottom:8px;border-left:4px solid var(--d)">';
        h+='<div style="font-size:11px;color:var(--tm);margin-bottom:4px">#'+(i+1)+' ['+(tm[r.type]||r.type)+'] '+(esc(r.subject)||'')+'</div>';
        h+='<div style="font-size:14px;font-weight:600;margin-bottom:6px">'+esc(r.question)+'</div>';
        h+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
        h+='<span style="background:#fecaca;padding:3px 10px;border-radius:6px;font-size:12px;color:#991b1b;font-weight:600">✗ 你的答案：'+esc(r.user_answer)+'</span>';
        h+='<span style="background:#bbf7d0;padding:3px 10px;border-radius:6px;font-size:12px;color:#065f46;font-weight:600">✓ 正确答案：'+esc(r.answer)+'</span>';
        h+='</div></div>';
      });
      if(recs.length>10) h+='<p style="text-align:center;color:var(--tm);font-size:12px;padding-top:8px">仅显示最近10道错题</p>';
    }

    body.innerHTML=h;
    ds.style.display='grid';
  } catch(e){ toast('加载失败'); }
}

function closeDetail(){document.getElementById('detailSec').style.display='none';}

async function showWrong(name){
  try{
    const r = await apiGet('/api/admin/user_detail?name=' + encodeURIComponent(name));
    const recs=await r.json();
    document.getElementById('wmTitle').textContent='❌ '+name+' 的错题记录（共'+recs.length+'道）';
    const b=document.getElementById('wmBody');
    if(!recs.length){b.innerHTML='<div class="emp"><span class="ei">🎉</span><div class="em">没有错题！</div></div>';return;}

    const tm={single:'单选',multiple:'多选',judge:'判断',fill:'填空',essay:'简答'};
    let h='';
    recs.forEach((r,i)=>{
      h+='<div style="padding:13px;background:var(--d-l);border-radius:10px;margin-bottom:8px;border-left:4px solid var(--d)">';
      h+='<div style="font-size:11px;color:var(--tm);margin-bottom:4px">#'+(i+1)+' ['+(tm[r.type]||r.type)+'] '+(esc(r.subject)||'')+'</div>';
      h+='<div style="font-size:15px;font-weight:700;margin-bottom:8px">'+esc(r.question)+'</div>';
      h+='<div style="display:flex;gap:10px;flex-wrap:wrap">';
      h+='<span style="background:#fecaca;padding:4px 11px;border-radius:7px;font-size:13px;color:#991b1b;font-weight:700">✗ '+esc(r.user_answer)+'</span>';
      h+='<span style="background:#bbf7d0;padding:4px 11px;border-radius:7px;font-size:13px;color:#065f46;font-weight:700">✓ '+esc(r.answer)+'</span>';
      h+='</div></div>';
    });
    b.innerHTML=h;
    document.getElementById('wrModal').classList.add('show');
  }catch(e){toast('加载失败');}
}

// ==================== Delete ====================
function fillSel(subs){
  const s=document.getElementById('dsel');
  s.innerHTML='<option value="">-- 选择科目查看题目 --</option>';
  subs.forEach(x=>s.innerHTML+='<option value="'+x.id+'">'+esc(x.name)+' ('+x.count+'道)</option>');
}

async function loadQs(){
  const sid=document.getElementById('dsel').value,l=document.getElementById('dlist');
  if(!sid){l.style.display='none';document.getElementById('dsc').textContent='';return;}
  try{
    const sr = await apiGet('/api/subjects');
    const sn = sr.find(s => s.id == sid)?.name || '';
    cQs = await apiGet('/api/questions/by_subject/' + encodeURIComponent(sn));
    cQs = await apiGet('/api/questions/by_subject/' + encodeURIComponent(sn));
    l.style.display = 'block';
    document.getElementById('dsc').textContent='共'+cQs.length+'道题目';

    if(!cQs.length){l.innerHTML='<div style="padding:24px;text-align:center;color:var(--tm)">该科目暂无题目</div>'}
    else{
      const bg={single:'#dbeafe',multiple:'#fef3c7',judge:'#ede9fe',fill:'#d1fae5'};
      l.innerHTML=cQs.map((q,i)=>'<div class="di">'+
        '<input type="checkbox" class="dc" value="'+q.id+'" onchange="updC()">'+
        '<span style="font-size:11px;color:var(--tm);min-width:26px">#'+(i+1)+'</span>'+
        '<span class="badge" style="background:'+(bg[q.type]||'#eee')+'">'+gt(q.type)+'</span>'+
        '<span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(q.question.substring(0,50))+'</span></div>').join('');
    }
    updC();document.getElementById('dsa').checked=false;
  }catch(e){toast('加载失败');}
}

function toggleA(){const c=document.getElementById('dsa').checked;document.querySelectorAll('.dc').forEach(cb=>cb.checked=c);updC();}
function updC(){
  const n=document.querySelectorAll('.dc:checked').length;
  document.getElementById('dsc').textContent='已选'+n+'题';
  document.getElementById('bdBtn').textContent='🗑️ 删除选中('+n+')';
}

async function batchDel(){
  const ids=[...document.querySelectorAll('.dc:checked')].map(cb=>parseInt(cb.value));
  if(!ids.length){toast('请先选择要删除的题目');return;}
  if(!confirm('确定永久删除选中的 '+ids.length+' 道题目？此操作不可恢复！'))return;
  const b=document.getElementById('bdBtn');b.disabled=true;b.textContent='⏳ 删除中...';
  try{
    const d = await apiPost('/api/admin/batch_delete_questions', { ids });
    if(d.success){toast('✅ 已删除 '+d.count+' 道题目');loadQs();loadData();}
    else toast('删除失败：'+(d.error||''));
  }catch(e){toast('删除失败');}
  finally{b.disabled=false;b.textContent='🗑️ 删除';}
}

// ==================== Backup ====================
async function backup(){
  try{
    const data = await apiGet('/api/admin/backup');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='quiz_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
    toast('✅ 备份已下载 — '+data.total_questions+'道题目 / '+data.total_subjects+'个科目');
  }catch(e){toast('备份失败');}}
