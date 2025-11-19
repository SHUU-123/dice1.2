// app.js
// SW2.5 ダイスツール — UI を画像イメージに合わせたレイアウトで実装
// 機能: 2d6 / 2d6+修正（ページ分割） / 1dN プルダウン / カスタムダイス / ログ（localStorage）
// 2d6 系: 大成功(12), ファンブル(2), ダブル（同目）、連続表示

(function(){
  const el = id => document.getElementById(id);

  // ----- utils -----
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function rollNdM(n,m){
    const a=[];
    for(let i=0;i<n;i++) a.push(randInt(1,m));
    return a;
  }
  function nowStr(){ return new Date().toLocaleString(); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // ----- storage -----
  const STORAGE_KEY = 'sw25_logs_v2';
  function getLogs(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }catch(e){ return []; } }
  function saveLogs(logs){ localStorage.setItem(STORAGE_KEY, JSON.stringify(logs)); }
  function addLog(entry){ const logs=getLogs(); logs.unshift(entry); saveLogs(logs); renderLogs(); }
  function deleteLogAt(i){ const logs=getLogs(); logs.splice(i,1); saveLogs(logs); renderLogs(); }
  function clearLogs(){ localStorage.removeItem(STORAGE_KEY); renderLogs(); }

  // ----- streak (連続判定) -----
  // rawTotal を与えると、直前ログから同じ rawTotal の連続回数をカウントして「今回を含めた回数」を返す
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

  // ----- rendering logs -----
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

      let leftHtml = `<div class="log-left"><strong>${escapeHtml(lg.expr)}</strong>`;
      if(lg.type === '2d6'){
        const d1 = lg.rolls[0], d2 = lg.rolls[1];
        leftHtml += `<div class="log-meta">`;
        if(lg.rawTotal === 12) leftHtml += `<span class="badge crit">大成功</span>`;
        else if(lg.rawTotal === 2) leftHtml += `<span class="badge fumble">ファンブル</span>`;
        if(d1 === d2) leftHtml += `<span class="badge double">ダブル</span>`;
        if(lg.streak && lg.streak > 1) leftHtml += `<span class="badge streak">連続 ${lg.streak} 回</span>`;
        leftHtml += `</div>`;

        leftHtml += `<div class="dice">`;
        leftHtml += `<div class="die ${d1===d2?'double':''}">${d1}</div>`;
        leftHtml += `<div class="die ${d1===d2?'double':''}">${d2}</div>`;
        if(lg.modifier) leftHtml += `<div class="expr-mod">+ ${lg.modifier}</div>`;
        leftHtml += `</div>`;
        leftHtml += `<div class="log-meta">生合計: ${lg.rawTotal} — 最終合計: ${lg.total} — ${lg.time}</div>`;
      } else {
        leftHtml += `<div class="log-meta">${lg.time} — 個別: ${lg.rolls.join(', ')} — 合計: ${lg.total}</div>`;
      }

      leftHtml += `</div>`;

      const rightHtml = `<div class="log-right"><button class="log-del" data-idx="${idx}">削除</button></div>`;

      li.innerHTML = leftHtml + rightHtml;
      list.appendChild(li);
    });

    // attach delete handlers
    Array.from(list.querySelectorAll('.log-del')).forEach(btn=>{
      btn.addEventListener('click', e=>{
        const i = Number(btn.dataset.idx);
        deleteLogAt(i);
      });
    });
  }

  // ----- mod pages config -----
  const modGroupsSpec = [
    { title: '+3〜+20', from: 3, to: 20 },
    { title: '+21〜+40', from: 21, to: 40 },
    { title: '+41〜+60', from: 41, to: 60 },
    { title: '+61〜+80', from: 61, to: 80 },
    { title: '+81〜+100', from: 81, to: 100 },
  ];
  let currentModPage = 0;

  // render current mod page (preset buttons)
  function renderModPage(){
    const grid = el('preset-grid');
    grid.innerHTML = '';
    const spec = modGroupsSpec[currentModPage];

    // create preset 2d6 (no modifier) on first slot if page 0
    if(currentModPage === 0){
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = '2d6';
      btn.addEventListener('click', ()=>roll2d6(0));
      grid.appendChild(btn);
    } else {
      // keep a placeholder to keep layout consistent
      const ph = document.createElement('div'); ph.style.height='0'; grid.appendChild(ph);
    }

    // create modifiers in the page's range
    for(let v = spec.from; v <= spec.to; v++){
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = `2d6+${v}`;
      btn.addEventListener('click', ()=>roll2d6(v));
      grid.appendChild(btn);
    }

    updatePager();
  }

  // build pager buttons
  function buildPager(){
    const nav = el('mod-page-nav');
    nav.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'page-nav';
    prev.textContent = '◀';
    prev.addEventListener('click', ()=>{ if(currentModPage>0){ currentModPage--; renderModPage(); } });
    nav.appendChild(prev);

    modGroupsSpec.forEach((g,i)=>{
      const b = document.createElement('button');
      b.className = 'page-btn';
      b.textContent = `${i+1}`;
      b.addEventListener('click', ()=>{ currentModPage = i; renderModPage(); });
      nav.appendChild(b);
    });

    const next = document.createElement('button');
    next.className = 'page-nav';
    next.textContent = '▶';
    next.addEventListener('click', ()=>{ if(currentModPage < modGroupsSpec.length-1){ currentModPage++; renderModPage(); } });
    nav.appendChild(next);
  }

  function updatePager(){
    const nav = el('mod-page-nav');
    Array.from(nav.querySelectorAll('.page-btn')).forEach(btn=>{
      const n = Number(btn.textContent)-1;
      btn.classList.toggle('active', n === currentModPage);
    });
    // prev/next disabled state:
    const allNav = nav.querySelectorAll('.page-nav');
    if(allNav.length >= 2){
      const [prev,next] = allNav;
      prev.disabled = (currentModPage <= 0);
      next.disabled = (currentModPage >= modGroupsSpec.length-1);
      prev.style.opacity = prev.disabled?0.35:1;
      next.style.opacity = next.disabled?0.35:1;
      prev.style.cursor = prev.disabled?'default':'pointer';
      next.style.cursor = next.disabled?'default':'pointer';
    }
  }

  // ----- roll handlers -----
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

  // parse simple custom expressions (support multiple comma separated)
  // format examples: "2d6+3", "d20", "-1d6+2", "d6-1"
  function parseAndRollCustom(text){
    if(!text || !text.trim()) return;
    const parts = text.split(',').map(s=>s.trim()).filter(Boolean);
    for(const p of parts){
      try{
        // capture signs and numbers
        // pattern: optional sign+N (repeat count) d S (sides) optional +/- modifier
        const m = p.match(/^([+-]?\d*)d(\d+)([+-]\d+)?$/i);
        if(m){
          let n = m[1] === '' ? 1 : Number(m[1]);
          if(isNaN(n)) n = 1;
          const sides = Number(m[2]);
          const mod = m[3] ? Number(m[3]) : 0;
          const rolls = rollNdM(Math.abs(n), sides);
          const sum = rolls.reduce((a,b)=>a+b,0) * (n<0?-1:1);
          const total = sum + mod;
          addLog({
            expr: p,
            type: 'other',
            rolls: rolls.concat(mod? [`(${mod>=0?'+':'-'}${Math.abs(mod)})`]:[]),
            total,
            time: nowStr()
          });
        } else {
          // fallback: try single number like "20" => 1d20
          const m2 = p.match(/^d?(\d+)$/i);
          if(m2){
            const sides = Number(m2[1]);
            roll1dN(sides);
          } else {
            // unsupported format - show as plain text log
            addLog({
              expr: p,
              type: 'other',
              rolls: ['?'],
              total: 0,
              time: nowStr()
            });
          }
        }
      }catch(e){
        console.error('custom parse error', e);
      }
    }
  }

  // ----- init UI and events -----
  function init(){
    // fill 1dN dropdown
    const dd = el('dropdown-d');
    for(let i=1;i<=100;i++){
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `1d${i}`;
      dd.appendChild(opt);
    }

    // buttons
    el('btn-roll-dropdown').addEventListener('click', ()=>{
      const n = Number(dd.value);
      if(n>0) roll1dN(n);
    });

    el('btn-roll-custom').addEventListener('click', ()=>{
      parseAndRollCustom(el('custom-input').value);
      el('custom-input').value = '';
    });

    el('btn-clear-log').addEventListener('click', ()=>{
      if(confirm('ログを全削除します。よろしいですか？')) clearLogs();
    });

    // pager and presets
    buildPager();
    renderModPage();

    // initial logs render
    renderLogs();

    // keyboard: Enter on custom input triggers roll
    el('custom-input').addEventListener('keydown', e=>{
      if(e.key === 'Enter') {
        parseAndRollCustom(el('custom-input').value);
        el('custom-input').value = '';
      }
    });
  }

  window.addEventListener('DOMContentLoaded', init);
})();
