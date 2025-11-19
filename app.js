// app.js
// 既存実装を維持しつつ、ログ内の合計表示を見やすく（.total-value 追加）
// それ以外の挙動は変えていません。

(function(){
  const el = id => document.getElementById(id);

  // --- utils ---
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function rollNdM(n,m){
    const a=[];
    for(let i=0;i<n;i++) a.push(randInt(1,m));
    return a;
  }
  function nowStr(){ return new Date().toLocaleString(); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // --- storage ---
  const KEY = 'sw25_logs_ui_v3';
  function getLogs(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){ return []; } }
  function saveLogs(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }
  function addLog(entry){ const logs=getLogs(); logs.unshift(entry); saveLogs(logs); renderLogs(); }
  function deleteLogAt(i){ const logs=getLogs(); logs.splice(i,1); saveLogs(logs); renderLogs(); }
  function clearLogs(){ localStorage.removeItem(KEY); renderLogs(); }

  // --- streak for 2d6 ---
  function computeStreakFor2d6(rawTotal){
    const logs = getLogs();
    let cnt = 0;
    for(let i=0;i<logs.length;i++){
      const L = logs[i];
      if(L.type === '2d6' && L.rawTotal === rawTotal) cnt++;
      else break;
    }
    return cnt + 1;
  }

  // --- render rolls array to HTML (numbers emphasized as .die) ---
  function rollsToHtml(rolls){
    let html = '<div class="dice">';
    for(const r of rolls){
      // treat numeric-like strings or numbers as die
      if(typeof r === 'number' || (!isNaN(Number(r)) && String(r).trim() !== '')){
        html += `<div class="die">${escapeHtml(String(r))}</div>`;
      } else {
        html += `<div class="expr-mod">${escapeHtml(String(r))}</div>`;
      }
    }
    html += '</div>';
    return html;
  }

  // --- render logs (ここで合計表示を強調) ---
  function renderLogs(){
    const list = el('log-list');
    list.innerHTML = '';
    const logs = getLogs();
    if(logs.length === 0){
      const li = document.createElement('li');
      li.className = 'log-item';
      li.innerHTML = `<div class="log-left"><strong>ログはまだありません。</strong><div class="log-meta">ここに振った結果が表示されます。</div></div>`;
      list.appendChild(li);
      return;
    }

    logs.forEach((lg, idx) => {
      const li = document.createElement('li');
      li.className = 'log-item';

      let left = `<div class="log-left"><strong>${escapeHtml(lg.expr)}</strong>`;

      if(lg.type === '2d6'){
        left += `<div class="log-meta">`;
        if(lg.rawTotal === 12) left += `<span class="badge crit">大成功</span>`;
        else if(lg.rawTotal === 2) left += `<span class="badge fumble">ファンブル</span>`;
        if(lg.streak && lg.streak > 1) left += `<span class="badge streak">連続 ${lg.streak} 回</span>`;
        left += `</div>`;

        left += `<div class="dice">`;
        left += `<div class="die">${escapeHtml(String(lg.rolls[0]))}</div>`;
        left += `<div class="die">${escapeHtml(String(lg.rolls[1]))}</div>`;
        if(lg.modifier) left += `<div class="expr-mod">+ ${escapeHtml(String(lg.modifier))}</div>`;
        left += `</div>`;

        // 強調された合計表示（目立つバッジ）
        left += `<div class="total-value">合計 ${escapeHtml(String(lg.total))}</div>`;

        left += `<div class="log-meta">生合計: ${lg.rawTotal} — ${lg.time}</div>`;
      } else {
        left += `<div class="log-meta">${escapeHtml(lg.time)}</div>`;
        left += rollsToHtml(lg.rolls);
        // 非2d6 も合計を見やすく表示
        left += `<div class="total-value">合計 ${escapeHtml(String(lg.total))}</div>`;
      }

      left += `</div>`;

      const right = `<div class="log-right"><button class="log-del" data-idx="${idx}">削除</button></div>`;
      li.innerHTML = left + right;
      list.appendChild(li);
    });

    // attach delete handlers
    Array.from(list.querySelectorAll('.log-del')).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const i = Number(btn.dataset.idx);
        deleteLogAt(i);
      });
    });
  }

  // --- modifiers (page groups) ---
  const modGroupsSpec = [
    { title: '+3〜+20', from: 3, to: 20 },
    { title: '+21〜+40', from: 21, to: 40 },
    { title: '+41〜+60', from: 41, to: 60 },
    { title: '+61〜+80', from: 61, to: 80 },
    { title: '+81〜+100', from: 81, to: 100 },
  ];
  let currentPage = 0;

  // render current palette (match image: show 2d6 and modifiers for page)
  function renderPresetGrid(){
    const grid = el('preset-grid');
    grid.innerHTML = '';
    const spec = modGroupsSpec[currentPage];

    // always show 2d6 button first
    const btn2 = document.createElement('button');
    btn2.className = 'preset-btn';
    btn2.textContent = '2d6';
    btn2.addEventListener('click', ()=>roll2d6(0));
    grid.appendChild(btn2);

    // create modifiers for that page
    for(let v=spec.from; v<=spec.to; v++){
      const b = document.createElement('button');
      b.className = 'preset-btn';
      b.textContent = `2d6+${v}`;
      b.addEventListener('click', ()=>roll2d6(v));
      grid.appendChild(b);
    }
    updatePagerUI();
  }

  // build pager UI (buttons)
  function buildPagerUI(){
    const nav = el('mod-page-nav');
    nav.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'page-nav';
    prev.textContent = '◀';
    prev.addEventListener('click', ()=>{ if(currentPage>0){ currentPage--; renderPresetGrid(); } });
    nav.appendChild(prev);

    modGroupsSpec.forEach((g,i)=>{
      const btn = document.createElement('button');
      btn.className = 'page-btn';
      btn.textContent = String(i+1);
      btn.title = g.title;
      btn.addEventListener('click', ()=>{ currentPage = i; renderPresetGrid(); });
      nav.appendChild(btn);
    });

    const next = document.createElement('button');
    next.className = 'page-nav';
    next.textContent = '▶';
    next.addEventListener('click', ()=>{ if(currentPage < modGroupsSpec.length-1){ currentPage++; renderPresetGrid(); } });
    nav.appendChild(next);
    updatePagerUI();
  }

  function updatePagerUI(){
    const nav = el('mod-page-nav');
    Array.from(nav.querySelectorAll('.page-btn')).forEach(btn=>{
      const n = Number(btn.textContent) - 1;
      btn.classList.toggle('active', n === currentPage);
    });
    const allNav = nav.querySelectorAll('.page-nav');
    if(allNav.length >= 2){
      const [prev,next] = allNav;
      prev.disabled = currentPage <= 0;
      next.disabled = currentPage >= modGroupsSpec.length-1;
      prev.style.opacity = prev.disabled?0.35:1;
      next.style.opacity = next.disabled?0.35:1;
      prev.style.cursor = prev.disabled?'default':'pointer';
      next.style.cursor = next.disabled?'default':'pointer';
    }
  }

  // --- roll handlers ---
  function roll2d6(mod){
    const rolls = rollNdM(2,6);
    const raw = rolls[0] + rolls[1];
    const total = raw + (mod||0);
    const streak = computeStreakFor2d6(raw);
    addLog({
      expr: `2d6${mod?('+'+mod):''}`,
      type: '2d6',
      rolls,
      modifier: mod||0,
      rawTotal: raw,
      total,
      streak,
      time: nowStr()
    });
  }

  function roll1dN(n){
    const r = rollNdM(1,n);
    addLog({
      expr: `1d${n}`,
      type: 'other',
      rolls: r,
      total: r[0],
      time: nowStr()
    });
  }

  // parse custom strings (support multiple comma-separated)
  function parseAndRollCustom(text){
    if(!text || !text.trim()) return;
    const parts = text.split(',').map(s=>s.trim()).filter(Boolean);
    for(const p of parts){
      try{
        const m = p.match(/^([+-]?\d*)d(\d+)([+-]\d+)?$/i);
        if(m){
          let n = m[1] === '' ? 1 : Number(m[1]);
          if(isNaN(n)) n = 1;
          const sides = Number(m[2]);
          const mod = m[3] ? Number(m[3]) : 0;
          const rolls = rollNdM(Math.abs(n), sides);
          const sum = rolls.reduce((a,b)=>a+b,0) * (n<0?-1:1);
          const total = sum + mod;
          // display: append modifier as "+m" or "-m" string
          const display = rolls.slice();
          if(mod !== 0) display.push((mod>0?'+':'')+String(mod));
          addLog({
            expr: p,
            type: 'other',
            rolls: display,
            total,
            time: nowStr()
          });
        } else {
          const m2 = p.match(/^d?(\d+)$/i);
          if(m2){
            const sides = Number(m2[1]);
            roll1dN(sides);
          } else {
            // unknown format: store literal
            addLog({
              expr: p,
              type: 'other',
              rolls: [p],
              total: 0,
              time: nowStr()
            });
          }
        }
      }catch(e){
        console.error('parse error', e);
      }
    }
  }

  // --- init UI ---
  function init(){
    // populate 1dN dropdown
    const dd = el('dropdown-d');
    for(let i=1;i<=100;i++){
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `1d${i}`;
      dd.appendChild(opt);
    }

    el('btn-roll-dropdown').addEventListener('click', ()=>{ const n = Number(dd.value); if(n>0) roll1dN(n); });
    el('btn-roll-custom').addEventListener('click', ()=>{ parseAndRollCustom(el('custom-input').value); el('custom-input').value = ''; });
    el('btn-clear-log').addEventListener('click', ()=>{ if(confirm('ログを全削除します。よろしいですか？')) clearLogs(); });

    buildPagerUI();
    renderPresetGrid();
    renderLogs();

    // Enter in custom input triggers roll
    el('custom-input').addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ parseAndRollCustom(el('custom-input').value); el('custom-input').value = ''; }
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
