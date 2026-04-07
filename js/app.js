(() => {
  // State
  let allAccounts = [];
  let filteredAccounts = [];
  let current = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // Parser
  function parseAccount(line) {
    line = line.trim();
    if (!line) return null;

    if (line.includes('|') && !line.includes(':')) {
      const parts = line.split('|');
      return { username: parts[0], password: parts[1] || '', type: 'simple' };
    }

    if (line.includes(':') && (line.includes('Info =') || line.includes('result ='))) {
      let before = line;
      const infoIdx = line.indexOf('Info');
      const resultIdx = line.indexOf('result =');
      if (infoIdx > 0) before = line.slice(0, infoIdx).trim();
      else if (resultIdx === 0) before = line.slice(resultIdx + 'result ='.length).trim();
      const colonParts = before.split(':');
      if (colonParts.length >= 2) {
        return {
          username: colonParts[0].trim(),
          password: colonParts[1].split(' ')[0].trim(),
          raw: line,
          type: 'full'
        };
      }
    }

    const colonParts = line.split(':');
    if (colonParts.length >= 2) {
      return { username: colonParts[0].trim(), password: colonParts[1].trim(), raw: line, type: 'fallback' };
    }
    return null;
  }

  function extractInfo(acc) {
    if (acc.type === 'simple') return [];
    const raw = acc.raw || '';
    const items = [];
    const patterns = [
      { re: /RANK\s*:\s*([^\n|]+)/i, label: 'Rank' },
      { re: /LEVEL\s*:\s*(\d+)/i, label: 'Level' },
      { re: /HERO\s*:\s*(\d+)/i, label: 'Hero' },
      { re: /SKIN\s*:\s*(\d+)/i, label: 'Skin' },
      { re: /TRẠNG THÁI\s*:\s*([^\n|]+)/i, label: 'Trạng thái' },
      { re: /BAN\s*:\s*(YES|NO)/i, label: 'Ban' }
    ];
    for (const p of patterns) {
      const m = raw.match(p.re);
      if (m) items.push(`${p.label}: ${m[1].trim()}`);
    }
    return items;
  }

  // UI helpers
  function showCard() { document.getElementById('accountCard').classList.remove('hidden'); }
  function hideCard() { document.getElementById('accountCard').classList.add('hidden'); }
  function showState(id) {
    document.querySelectorAll('.state-message').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }

  // Data loading with retry
  async function loadData() {
    const fileNames = ['data/acclq1.txt', 'data/acclq2.txt', 'data/acclq3.txt'];
    const results = [];

    for (const fname of fileNames) {
      try {
        const resp = await fetch(fname, { cache: 'no-store' });
        if (!resp.ok) continue;
        const text = await resp.text();
        results.push(text);
      } catch (e) {
        console.warn(`Failed to load ${fname}:`, e);
      }
    }

    if (results.length === 0) {
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
        setTimeout(loadData, 2000 * retryCount);
        return;
      } else {
        showState('emptyState');
        return;
      }
    }

    // Success
    retryCount = 0;
    const allText = results.join('\n');
    const lines = allText.split(/\r?\n/);
    allAccounts = lines.map(parseAccount).filter(Boolean);
    filteredAccounts = allAccounts;

    if (allAccounts.length === 0) {
      showState('emptyState');
      document.getElementById('emptyState').innerText = 'Không có dữ liệu hợp lệ trong file.';
    } else {
      showCard();
      document.getElementById('countDisplay').textContent = allAccounts.length;
      // Auto roll first
      roll();
    }
  }

  function applyFilter() {
    const filter = document.querySelector('input[name="filter"]:checked').value;
    if (filter === 'all') filteredAccounts = allAccounts;
    else if (filter === 'full') {
      filteredAccounts = allAccounts.filter(acc => acc.type !== 'simple');
    } else if (filter === 'partial') {
      filteredAccounts = allAccounts.filter(acc => acc.type === 'simple');
    }
  }

  function getRandom() {
    if (filteredAccounts.length === 0) return null;
    const idx = Math.floor(Math.random() * filteredAccounts.length);
    return filteredAccounts[idx];
  }

  function renderAccount(acc) {
    if (!acc) {
      hideCard();
      showState('emptyState');
      document.getElementById('emptyState').innerText = 'Không có account phù hợp';
      return;
    }

    const credEl = document.getElementById('credential');
    credEl.innerHTML = `<span class="neon-cyan">${acc.username}</span><span class="mx-2 text-slate-600">|</span><span class="neon-purple">${acc.password}</span>`;
    credEl.classList.remove('fade-in');
    void credEl.offsetWidth;
    credEl.classList.add('fade-in');

    const infoEl = document.getElementById('info');
    const infos = extractInfo(acc);
    infoEl.innerHTML = infos.length ? infos.join('<span class="text-slate-600 mx-2">•</span>') : '<span class="text-slate-500">Chỉ có username và mật khẩu</span>';

    document.getElementById('source').textContent = `Loại: ${acc.type}`;
    showCard();
  }

  function roll() {
    applyFilter();
    current = getRandom();
    renderAccount(current);
  }

  function copyToClipboard() {
    if (!current) return;
    const text = `${current.username}|${current.password}`;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'ĐÃ COPY';
      setTimeout(() => btn.textContent = 'COPY', 1500);
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }

  // Events
  document.getElementById('rollBtn').addEventListener('click', roll);
  document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
  document.querySelectorAll('input[name="filter"]').forEach(r => r.addEventListener('change', roll));

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement === document.body) {
      e.preventDefault();
      roll();
    }
  });

  // Init
  loadData();
  console.log('Lien Quan Account Share initialized');
})();