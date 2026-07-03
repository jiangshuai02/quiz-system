import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllUsers, getAllExamRecords, getExamStatistics, getTotalAnswerCount,
  getTotalUserCount, checkIsAdmin, getSiteSettings, updateSiteSetting,
  getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  getAdminQuestions, createAdminQuestion, updateAdminQuestion, deleteAdminQuestion,
  getAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory,
} from '../lib/supabase';
import { categories as staticCategories } from '../data/questions';
import { supabase } from '../lib/supabase';

const DIFFICULTIES = [
  { value: 1, label: '⭐ 入门' },
  { value: 2, label: '⭐⭐ 简单' },
  { value: 3, label: '⭐⭐⭐ 中等' },
  { value: 4, label: '⭐⭐⭐⭐ 较难' },
  { value: 5, label: '⭐⭐⭐⭐⭐ 困难' },
];

export default function Admin() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [users, setUsers] = useState([]);
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState([]);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [settings, setSettings] = useState({});
  const [editTitle, setEditTitle] = useState('');
  const [editFooter, setEditFooter] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [announcements, setAnnouncements] = useState([]);
  const [annForm, setAnnForm] = useState({ title: '', content: '', priority: 0, editing: null });

  const [adminQuestions, setAdminQuestions] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [qForm, setQForm] = useState(null);
  const [qFormVisible, setQFormVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [importCat, setImportCat] = useState('javascript');
  const [catForm, setCatForm] = useState(null);

  useEffect(() => {
    if (!user) return;
    checkIsAdmin(user.id).then(admin => {
      setIsAdmin(admin);
      setChecking(false);
      if (!admin) setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
  }, [isAdmin]);

  const loadAll = async () => {
    try {
      const [u, e, s, ta, tu, st, ann, aq, ac] = await Promise.all([
        getAllUsers(), getAllExamRecords(50), getExamStatistics(),
        getTotalAnswerCount(), getTotalUserCount(), getSiteSettings(),
        getAnnouncements(), getAdminQuestions(), getAdminCategories(),
      ]);
      setUsers(u); setExams(e); setStats(s); setTotalAnswers(ta); setTotalUsers(tu);
      setSettings(st); setAnnouncements(ann); setAdminQuestions(aq); setAdminCategories(ac);
      setEditTitle(st.site_title || ''); setEditFooter(st.site_footer || '');
      setEditDesc(st.site_description || '');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const showMsg = (text, isError = false) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  // === Settings ===
  const handleSaveSettings = async () => {
    try {
      await updateSiteSetting('site_title', editTitle);
      await updateSiteSetting('site_footer', editFooter);
      await updateSiteSetting('site_description', editDesc);
      setSettings({ site_title: editTitle, site_footer: editFooter, site_description: editDesc });
      showMsg('✅ 设置已保存');
    } catch (e) { showMsg('❌ 保存失败: ' + e.message, true); }
  };

  // === Announcements ===
  const handleSaveAnn = async () => {
    if (!annForm.title.trim()) { showMsg('请输入公告标题', true); return; }
    try {
      if (annForm.editing) {
        await updateAnnouncement(annForm.editing, { title: annForm.title, content: annForm.content, priority: annForm.priority });
      } else {
        await createAnnouncement(annForm.title, annForm.content, annForm.priority);
      }
      setAnnForm({ title: '', content: '', priority: 0, editing: null });
      const a = await getAnnouncements(); setAnnouncements(a);
      showMsg('✅ 公告已保存');
    } catch (e) { showMsg('❌ ' + e.message, true); }
  };

  const handleDeleteAnn = async (id) => {
    if (!confirm('确定删除此公告？')) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      showMsg('✅ 已删除');
    } catch (e) { showMsg('❌ ' + e.message, true); }
  };

  // === Questions ===
  const handleSaveQ = async () => {
    if (!qForm.title.trim()) { showMsg('请输入题目', true); return; }
    try {
      const qData = {
        category: qForm.category,
        difficulty: qForm.difficulty,
        type: qForm.type,
        title: qForm.title,
        options: qForm.options,
        answer: qForm.type === 'single' ? [parseInt(qForm.answer)] : (qForm.answer || []),
        explanation: qForm.explanation,
      };
      if (qForm.editing) {
        await updateAdminQuestion(qForm.editing, qData);
      } else {
        await createAdminQuestion(qData);
      }
      setQFormVisible(false);
      setQForm(null);
      const aq = await getAdminQuestions(); setAdminQuestions(aq);
      showMsg('✅ 题目已保存');
    } catch (e) { showMsg('❌ ' + e.message, true); }
  };

  const handleEditQ = (q) => {
    setQForm({
      editing: q.id, category: q.category, difficulty: q.difficulty, type: q.type,
      title: q.title, options: q.options || [], answer: q.type === 'single' ? String(q.answer?.[0] ?? 0) : (q.answer || []),
      explanation: q.explanation || '',
    });
    setQFormVisible(true);
  };

  const handleDeleteQ = async (id) => {
    if (!confirm('确定删除此题目？')) return;
    try {
      await deleteAdminQuestion(id);
      setAdminQuestions(prev => prev.filter(q => q.id !== id));
      showMsg('✅ 已删除');
    } catch (e) { showMsg('❌ ' + e.message, true); }
  };

  // 批量导入
  const handleImport = async () => {
    if (!importText.trim()) { showMsg('请粘贴题目数据', true); return; }
    try {
      const lines = importText.split('\n').filter(l => l.trim());
      const questions = lines.map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);

      if (questions.length === 0) {
        showMsg('❌ 没有有效的题目数据,每行必须是 JSON 格式', true);
        return;
      }

      // 验证 + 写入
      const records = questions.map(q => ({
        category: q.category || importCat,
        difficulty: q.difficulty || 1,
        type: q.type || 'single',
        title: q.title,
        options: q.options || [],
        answer: q.answer || [],
        explanation: q.explanation || '',
        created_by: user?.id,
      }));

      const { error } = await supabase.from('admin_questions').insert(records);
      if (error) throw error;

      showMsg(`✅ 成功导入 ${records.length} 道题目`);
      setImportVisible(false);
      setImportText('');
      const aq = await getAdminQuestions(); setAdminQuestions(aq);
    } catch (e) { showMsg('❌ 导入失败: ' + e.message, true); }
  };

  // === Categories ===
  const handleSaveCat = async () => {
    if (!catForm.name.trim() || !catForm.slug.trim()) { showMsg('名称和标识不能为空', true); return; }
    try {
      if (catForm.editing) {
        await updateAdminCategory(catForm.editing, { name: catForm.name, slug: catForm.slug, icon: catForm.icon, description: catForm.description, display_order: catForm.display_order });
      } else {
        await createAdminCategory({ name: catForm.name, slug: catForm.slug, icon: catForm.icon, description: catForm.description, display_order: catForm.display_order || 99 });
      }
      setCatForm(null);
      const ac = await getAdminCategories(); setAdminCategories(ac);
      showMsg('✅ 分类已保存');
    } catch (e) { showMsg('❌ ' + e.message, true); }
  };

  const handleDeleteCat = async (id) => {
    if (!confirm('删除分类？该分类下的题目不会被删除,只是不再显示。')) return;
    try {
      await deleteAdminCategory(id);
      setAdminCategories(prev => prev.filter(c => c.id !== id));
      showMsg('✅ 已删除');
    } catch (e) { showMsg('❌ ' + e.message, true); }
  };

  // 数据
  const allCategories = adminCategories.length > 0 ? adminCategories : staticCategories;

  if (checking) return <div className="questions-page"><div className="empty-state"><span className="empty-icon">⏳</span><p className="empty-text">验证权限...</p></div></div>;
  if (!isAdmin) return <div className="questions-page"><div className="empty-state"><span className="empty-icon">🔒</span><p className="empty-text">没有管理员权限</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>返回首页</button></div></div>;

  const tabs = [
    { key: 'dashboard', label: '📊 总览' },
    { key: 'questions', label: '📚 题库' },
    { key: 'categories', label: '🗂 分类' },
    { key: 'users', label: '👥 用户' },
    { key: 'exams', label: '📝 考试' },
    { key: 'settings', label: '⚙️ 设置' },
    { key: 'announcements', label: '📢 公告' },
  ];

  const sectionStyle = { background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid #e5e7eb' };

  return (
    <div className="stats-page" style={{ maxWidth: 1000 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 className="page-title">⚙️ 管理后台</h1><p className="page-desc">网站设置 · 题库管理 · 数据总览</p></div>
        <span style={{ fontSize: 12, color: '#f59e0b', background: '#fffbeb', padding: '4px 12px', borderRadius: 6, fontWeight: 600 }}>
          👑 {profile?.nickname}
        </span>
      </div>
      {msg && <div style={{ padding: '10px 16px', marginBottom: 12, borderRadius: 8, background: msg.includes('❌') ? '#fef2f2' : '#ecfdf5', color: msg.includes('❌') ? '#ef4444' : '#10b981', fontSize: 14 }}>{msg}</div>}

      <div className="filter-bar" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tabs.map(t => (
          <button key={t.key} className={`filter-btn ${tab === t.key ? 'active' : ''}`} style={{ whiteSpace: 'nowrap' }} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="empty-state"><span className="empty-icon">⏳</span><p className="empty-text">加载...</p></div> : (
        <>
          {tab === 'dashboard' && (
            <div>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-card-value">{totalUsers}</div><div className="stat-card-label">总用户</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: '#10b981' }}>{totalAnswers}</div><div className="stat-card-label">总答题</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: '#f59e0b' }}>{stats.length}</div><div className="stat-card-label">考试人数</div></div>
                <div className="stat-card"><div className="stat-card-value" style={{ color: '#8b5cf6' }}>{adminQuestions.length}</div><div className="stat-card-label">题库题目</div></div>
              </div>
              <div style={sectionStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 用户活跃排行</h3>
                {users.slice(0, 8).map((u, i) => (
                  <div key={u.id} className="category-stat-item">
                    <span style={{ width: 24, fontWeight: 700, color: i < 3 ? '#f59e0b' : '#9ca3af' }}>#{i + 1}</span>
                    <div className="category-stat-info">
                      <div className="category-stat-name">{u.nickname || '匿名'} <span style={{ color: '#9ca3af', fontSize: 13 }}>{u.total_questions || 0}题</span></div>
                      <div className="category-stat-bar" style={{ height: 6, maxWidth: 300 }}>
                        <div className="category-stat-fill" style={{ width: `${Math.min((u.total_questions || 0) / 50 * 100, 100)}%` }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: u.total_questions > 0 && Math.round((u.correct_answers / u.total_questions) * 100) >= 70 ? '#10b981' : '#ef4444' }}>
                      {u.total_questions > 0 ? Math.round((u.correct_answers / u.total_questions) * 100) + '%' : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'questions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>📚 管理题库（{adminQuestions.length}题）</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" style={{ padding: '8px 16px', fontSize: 14, background: '#8b5cf6', color: 'white' }} onClick={() => setImportVisible(true)}>📤 批量导入</button>
                  <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 14 }} onClick={() => { setQForm({ editing: null, category: allCategories[0]?.id || 'javascript', difficulty: 1, type: 'single', title: '', options: ['', '', '', ''], answer: '0', explanation: '' }); setQFormVisible(true); }}>➕ 新增题目</button>
                </div>
              </div>

              {importVisible && (
                <div style={{ ...sectionStyle, marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>📤 批量导入题目</h4>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                    每行一道 JSON 题目,字段: title, options, answer, type, difficulty, category, explanation
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ fontSize: 13, marginRight: 8 }}>默认分类:</span>
                    <select value={importCat} onChange={e => setImportCat(e.target.value)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                      {allCategories.map(c => <option key={c.id || c.slug} value={c.id || c.slug}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder={`{"title":"题目内容","options":["A选项","B选项","C选项","D选项"],"answer":[0],"type":"single","difficulty":1,"explanation":"解析"}`} style={{ width: '100%', minHeight: 200, padding: 10, borderRadius: 6, border: '1px solid #d1d5db', marginBottom: 8, fontSize: 13, fontFamily: 'monospace' }} />
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                    💡 示例: 每行一个 JSON 对象,格式: {'{title, options, answer, type, difficulty, explanation}'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={handleImport}>导入</button>
                    <button className="btn-nav" onClick={() => setImportVisible(false)}>取消</button>
                  </div>
                </div>
              )}

              {qFormVisible && qForm && (
                <div style={{ ...sectionStyle, marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 600, marginBottom: 12 }}>{qForm.editing ? '✏️ 编辑题目' : '➕ 新增题目'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <select value={qForm.category} onChange={e => setQForm({...qForm, category: e.target.value})} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}>
                      {allCategories.map(c => <option key={c.id || c.slug} value={c.id || c.slug}>{c.icon} {c.name}</option>)}
                    </select>
                    <select value={qForm.difficulty} onChange={e => setQForm({...qForm, difficulty: parseInt(e.target.value)})} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}>
                      {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <select value={qForm.type} onChange={e => setQForm({...qForm, type: e.target.value, answer: e.target.value === 'single' ? '0' : []})} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}>
                      <option value="single">单选题</option>
                      <option value="multiple">多选题</option>
                    </select>
                  </div>
                  <textarea placeholder="题目内容" value={qForm.title} onChange={e => setQForm({...qForm, title: e.target.value})} style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 6, border: '1px solid #d1d5db', marginBottom: 12, fontSize: 14 }} />
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>选项（每行一个）</div>
                    {qForm.options.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{ width: 24, height: 24, borderRadius: 4, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>
                        <input value={opt} onChange={e => { const o = [...qForm.options]; o[i] = e.target.value; setQForm({...qForm, options: o}); }} style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
                        <button onClick={() => { setQForm({...qForm, options: qForm.options.filter((_, idx) => idx !== i) }); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => { if (qForm.options.length < 8) setQForm({...qForm, options: [...qForm.options, ''] }); }} style={{ padding: '6px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>+ 添加选项</button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>正确答案</div>
                    {qForm.type === 'single' ? (
                      <select value={qForm.answer} onChange={e => setQForm({...qForm, answer: e.target.value})} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}>
                        {qForm.options.map((_, i) => <option key={i} value={String(i)}>{String.fromCharCode(65 + i)}</option>)}
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {qForm.options.map((_, i) => (
                          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                            <input type="checkbox" checked={(qForm.answer || []).includes(i)} onChange={e => { const a = e.target.checked ? [...(qForm.answer || []), i] : (qForm.answer || []).filter(v => v !== i); setQForm({...qForm, answer: a.sort() }); }} />
                            {String.fromCharCode(65 + i)}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea placeholder="答案解析（可选）" value={qForm.explanation} onChange={e => setQForm({...qForm, explanation: e.target.value})} style={{ width: '100%', minHeight: 50, padding: 10, borderRadius: 6, border: '1px solid #d1d5db', marginBottom: 12, fontSize: 14 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '8px 24px' }} onClick={handleSaveQ}>保存</button>
                    <button className="btn-nav" onClick={() => { setQFormVisible(false); setQForm(null); }}>取消</button>
                  </div>
                </div>
              )}

              <div style={{ ...sectionStyle, padding: 0, overflow: 'hidden' }}>
                {adminQuestions.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>暂无管理题目</p> : (
                  <div>
                    {adminQuestions.map(q => (
                      <div key={q.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#eef2ff', color: '#4f46e5' }}>{allCategories.find(c => (c.id || c.slug) === q.category)?.name || q.category}</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#fef2f2', color: '#ef4444' }}>{'⭐'.repeat(q.difficulty)}</span>
                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280' }}>{q.type === 'single' ? '单选' : '多选'}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                          <button className="btn-nav" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => handleEditQ(q)}>编辑</button>
                          <button className="btn-nav" style={{ padding: '4px 12px', fontSize: 12, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteQ(q.id)}>删除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'categories' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>🗂 分类管理（{adminCategories.length}）</h3>
                <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 14 }} onClick={() => setCatForm({ editing: null, slug: '', name: '', icon: '📘', description: '', display_order: 99 })}>➕ 新增分类</button>
              </div>

              {catForm && (
                <div style={{ ...sectionStyle, marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{catForm.editing ? '✏️ 编辑分类' : '➕ 新增分类'}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>标识 (英文)</div>
                      <input value={catForm.slug} onChange={e => setCatForm({...catForm, slug: e.target.value})} placeholder="javascript" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }} disabled={!!catForm.editing} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>名称</div>
                      <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} placeholder="JavaScript" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>图标 (emoji)</div>
                      <input value={catForm.icon} onChange={e => setCatForm({...catForm, icon: e.target.value})} placeholder="📜" style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>描述</div>
                    <input value={catForm.description} onChange={e => setCatForm({...catForm, description: e.target.value})} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '8px 20px' }} onClick={handleSaveCat}>保存</button>
                    <button className="btn-nav" onClick={() => setCatForm(null)}>取消</button>
                  </div>
                </div>
              )}

              <div style={sectionStyle}>
                {adminCategories.length === 0 ? <p style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>暂无分类,显示的是代码内置分类</p> : (
                  adminCategories.map(c => (
                    <div key={c.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
                        <span style={{ fontSize: 24 }}>{c.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name} <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 400 }}>({c.slug})</span></div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{c.description || '无描述'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-nav" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setCatForm({ editing: c.id, slug: c.slug, name: c.name, icon: c.icon, description: c.description || '', display_order: c.display_order || 0 })}>编辑</button>
                        <button className="btn-nav" style={{ padding: '4px 12px', fontSize: 12, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteCat(c.id)}>删除</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>👥 全部用户（{users.length}人）</h3>
              {users.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>暂无</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>昵称</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>答题</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>正确率</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>🔥连续</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>👑管理</th>
                    </tr></thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 500 }}>{u.nickname || '匿名'}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{u.total_questions || 0}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {u.total_questions > 0 ? <span style={{ color: Math.round((u.correct_answers / u.total_questions) * 100) >= 70 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{Math.round((u.correct_answers / u.total_questions) * 100)}%</span> : '-'}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{u.streak_days || 0}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>{u.is_admin ? '✅' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'exams' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📝 考试记录（{exams.length}场）</h3>
              {exams.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>暂无</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>科目</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>题数</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>正确</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>分数</th>
                      <th style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>用时</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>时间</th>
                    </tr></thead>
                    <tbody>
                      {exams.map(ex => {
                        const d = new Date(ex.completed_at);
                        const mins = Math.floor((ex.duration_seconds || 0) / 60);
                        return (
                          <tr key={ex.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 500 }}>{ex.category === 'all' ? '全科' : ex.category}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>{ex.total_questions}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#10b981' }}>{ex.correct_count}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}><span style={{ fontWeight: 700, color: ex.score >= 80 ? '#10b981' : ex.score >= 60 ? '#f59e0b' : '#ef4444' }}>{ex.score}分</span></td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#6b7280' }}>{mins}:{String((ex.duration_seconds || 0) % 60).padStart(2,'0')}</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right', color: '#6b7280', fontSize: 12 }}>{d.getMonth()+1}/{d.getDate()} {d.getHours()}:{String(d.getMinutes()).padStart(2,'0')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚙️ 网站设置</h3>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>网站标题</div>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>将显示在浏览器标签栏和首页标题</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>网站描述</div>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>页脚版权信息</div>
                <input value={editFooter} onChange={e => setEditFooter(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>将显示在页面底部</div>
              </div>
              <button className="btn btn-primary" onClick={handleSaveSettings}>💾 保存设置</button>
            </div>
          )}

          {tab === 'announcements' && (
            <div style={sectionStyle}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📢 公告管理</h3>
              <div style={{ marginBottom: 16, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
                <h4 style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{annForm.editing ? '编辑公告' : '发布公告'}</h4>
                <input placeholder="公告标题" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 8, fontSize: 14 }} />
                <textarea placeholder="公告内容（支持换行）" value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid #d1d5db', marginBottom: 8, fontSize: 14 }} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>优先级：</span>
                  <select value={annForm.priority} onChange={e => setAnnForm({...annForm, priority: parseInt(e.target.value)})} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db' }}>
                    <option value={0}>普通</option>
                    <option value={1}>重要</option>
                    <option value={2}>紧急</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ padding: '8px 20px', fontSize: 14 }} onClick={handleSaveAnn}>{annForm.editing ? '保存修改' : '发布'}</button>
                  {annForm.editing && <button className="btn-nav" onClick={() => setAnnForm({ title: '', content: '', priority: 0, editing: null })}>取消</button>}
                </div>
              </div>
              {announcements.length === 0 ? <p style={{ color: '#9ca3af', textAlign: 'center', padding: 24 }}>暂无公告</p> : (
                announcements.map(a => (
                  <div key={a.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                        {a.priority >= 2 ? '🚨' : a.priority >= 1 ? '❗' : '📌'} {a.title}
                        {!a.is_active && <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>（已隐藏）</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{a.content}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                      <button className="btn-nav" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setAnnForm({ title: a.title, content: a.content, priority: a.priority, editing: a.id }); }}>编辑</button>
                      <button className="btn-nav" style={{ padding: '4px 10px', fontSize: 11, color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteAnn(a.id)}>删除</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
