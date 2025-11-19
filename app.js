// SW2.5 ダイスツール（2d6 ページ分割）
// ログは localStorage に保存
// 2d6: 大成功(12)、ファンブル(2)、ダブル（同目）、連続表示
// 修正値ボタン群をページ分割（5ページ）で表示

const el = id => document.getElementById(id);

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollNdM(n, m){
  const rolls = [];
  for(let i=0;i<n;i++) rolls.push(randInt(1,m));
  return rolls;
}

function addLog(entry){
  const logs = getLogs();
  logs.unshift(entry); // newest first
  localStorage.setItem('sw25_logs', JSON.stringify(logs));
  renderLogs();
}

function getLogs(){
  try{
    return JSON.parse(localStorage.getItem('sw25_logs') || '[]');
  }catch(e){
    return [];
  }
}

function clearLogs(){
  localStorage.removeItem('sw25_logs');
  renderLogs();
}

function deleteLogAt(index){
  const logs = getLogs();
  logs.splice(index,1);
  localStorage.setItem('sw25_logs', JSON.stringify(logs));
  renderLogs();
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>{
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

// computeStreakFor2d6: 直前ログから同じ rawTotal が連続している回数を数える。
// 戻り値は「今回を含めた連続回数」。（例: 1=単発, 2=直前と同じ合計が1回続いている）
function computeStreakFor2d6(rawTotal){
  const logs = getLogs(); // newest first
  let streak = 1;
  for(let i=0;i<logs.length;i++){
    const L = logs[i];
    if(L.type === '2d6' && (L.rawTotal === rawTotal)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function renderLogs(){
  const list = el('log-list');
  list.innerHTML = '';
  const logs = getLogs();
  logs.forEach((lg, idx) => {
    const li = document.createElement('li');
    li.className = 'log-item';
    const left = document.createElement('div');
    left.className = 'log-left';

    let html = `<strong>${escapeHtml(lg.expr)}</strong>`;

    if(lg.type === '2d6'){
      const d1 = lg.rolls[0];
      const d2 = lg.rolls[1];
      const raw = lg.rawTotal;
      const mod = lg.modifier || 0;
      html += `<div class="log-meta">`;
      if(raw === 12){
        html += `<span class="badge crit">大成功</span>`;
      } else if(raw === 2){
        html += `<span class="badge fumble">ファンブル</span>`;
      }
      if(d1 === d2){
        html += `<span class="badge double">ダブル</span>`;
      }
      if(lg.streak && lg.streak > 1){
        html += `<span class="badge streak">連続 ${lg.streak} 回</span>`;
      }
      html += `</div>`;

      html += `<div class="dice">`;
      html += `<span class="die ${d1===d2?'double':''}">${d1}</span>`;
      html += `<span class="muted">+</span>`;
      html += `<span class="die ${d1===d2?'double':''}">${d2}</span>`;
      if(mod !== 0){
        html += `<span class="expr-mod">+ ${mod}</span>`;
      }
      html += `</div>`;

      html += `<div class="log-meta">生合計: ${raw} — 最終合計: ${lg.total} — ${lg.time}</div>`;
    } else {
      html += `<div class="log-meta">${lg.time} — 個別: ${lg.rolls.join(', ')} — 合計: ${lg.total}</div>`;
    }

    left.innerHTML = html;

    const right = document.createElement('div');
    right.className = 'log-right';
    const btnDel = document.createElement('button');
    btnDel.className = 'small-btn';
    btnDel.textContent = '削除';
    btnDel.addEventListener('click', () => deleteLogAt(idx));
    right.appendChild(btnDel);
    li.appendChild(left);
    li.appendChild(right);
    list.appendChild(li);
  });
}

// --- ページ分割対応の修正値 UI ---
const modGroupsSpec = [
  { title: '+3〜+20', from: 3, to: 20 },
  { title: '+21〜+40', from: 21, to: 40 },
  { title: '+41〜+60', from: 41, to: 60 },
  { title: '+61〜+80', from: 61, to: 80 },
  { title: '+81〜+100', from: 81, to: 100 },
];
let currentModPage = 0;
let modGroupNodes = [];

function buildModGroups(){
  const container = el('mod-groups');
  container.innerHTML = '';
  modGroupNodes = [];

  modGroupsSpec.forEach((g, pageIndex) => {
    const wrap = document.createElement('div');
    wrap.className = 'mod-page';
    wrap.style.display = 'none'; // 非表示で先に作成
    const title = document.createElement('div');
    title.className = 'mod-group-title';
    title.textContent = g.title;
    wrap.appendChild(title);

    const row = document.createElement('div');
    row.className = 'mod-row';
    for(let v = g.from; v <= g.to; v++){
      const b = document.createElement('button');
      b.className = 'mod-btn';
      b.textContent = `+${v}`;
      b.addEventListener('click', ()=>{
        const rolls = rollNdM(2,6);
        const raw = rolls[0] + rolls[1];
        const total = raw + v;
        const streak = computeStreakFor2d6(raw);
        addLog({
          expr: `2d6+${v}`,
          type: '2d6',
          rolls,
          modifier: v,
          rawTotal: raw,
          total,
          streak,
          time: new Date().toLocaleString()
        });
      });
      row.appendChild(b);
    }
    wrap.appendChild(row);
    container.appendChild(wrap);
    modGroupNodes.push(wrap);
  });

  buildModPager();
  showModPage(0);
}

function buildModPager(){
  const nav = el('mod-page-nav');
  nav.innerHTML = '';

  const prev = document.createElement('button');
  prev.className = 'nav-arrow';
  prev.textContent = '◀';
  prev.title = '前のページ';
  prev.addEventListener('click', () => showModPage(currentModPage - 1));
  nav.appendChild(prev);

  modGroupsSpec.forEach((g, i) => {
    const btn = document.createElement('button');
    btn.textContent = `${i+1}`;
    btn.title = g.title;
    btn.addEventListener('click', () => showModPage(i));
    btn.dataset.page = i;
    nav.appendChild(btn);
  });

  const next = document.createElement('button');
  next.className = 'nav-arrow';
  next.textContent = '▶';
  next.title = '次のページ';
  next.addEventListener('click', () => showModPage(currentModPage + 1));
  nav.appendChild(next);
}

function showModPage(index){
  if(index < 0) index = 0;
  if(index >= modGroupNodes.length) index = modGroupNodes.length - 1;
  currentModPage = index;
  modGroupNodes.forEach((node, i) => {
    node.style.display = (i === index) ? 'block' : 'none';
  });
  // ページナビのアクティブ表示更新
  const nav = el('mod-page-nav');
  Array.from(nav.querySelectorAll('button')).forEach(btn => {
    const p = btn.dataset.page;
    if(typeof p !== 'undefined'){
      btn.classList.toggle('active', Number(p) === index);
    }
  });
}

// --- UI 初期化 ---
function init(){
  // 2d6 ボタン
  el('btn-2d6').addEventListener('click', ()=>{
    const rolls = rollNdM(2,6);
    const raw = rolls[0] + rolls[1];
    const streak = computeStreakFor2d6(raw);
    const entry = {
      expr: '2d6',
      type: '2d6',
      rolls,
      modifier: 0,
      rawTotal: raw,
      total: raw,
      streak,
      time: new Date().toLocaleString()
    };
    addLog(entry);
  });

  // 修正値群（ページ分割で構築）
  buildModGroups();

  // ドロップダウン 1d1～1d100
  const dropdown = el('dropdown-d');
  for(let s=1;s<=100;s++){
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `1d${s}`;
    dropdown.appendChild(opt);
  }
  el('btn-roll-dropdown').addEventListener('click', ()=>{
    const m = parseInt(dropdown.value,10);
    const rolls = rollNdM(1,m);
    const total = rolls[0];
    addLog({
      expr: `1d${m}`,
      type: 'other',
      rolls,
      total,
      time: new Date().toLocaleString()
    });
  });

  // カスタムダイス
  el('btn-roll-custom').addEventListener('click', ()=>{
    const n = Math.max(1, parseInt(el('custom-n').value,10) || 1);
    const m = Math.max(1, parseInt(el('custom-m').value,10) || 1);
    const k = parseInt(el('custom-k').value,10) || 0;
    const rolls = rollNdM(n,m);
    const sum = rolls.reduce((a,b)=>a+b,0);
    const total = sum + k;
    addLog({
      expr: `${n}d${m}${k>=0?'+':''}${k}`,
      type: 'other',
      rolls: rolls.concat(k!==0? [`(+${k})`]:[]),
      total,
      time: new Date().toLocaleString()
    });
  });

  // ログクリア
  el('btn-clear-log').addEventListener('click', ()=>{
    if(confirm('ログを全て削除します。よろしいですか？')) clearLogs();
  });

  renderLogs();
}

window.addEventListener('DOMContentLoaded', init);
