// Account account
let allAccounts = [];
let filteredAccounts = [];
let current = null;

function parseAccount(line) {
  line = line.trim();
  if (!line) return null;

  // Format 1: simple "user|pass"
  if (line.includes('|') && !line.includes(':')) {
    const parts = line.split('|');
    return { username: parts[0], password: parts[1] || '', type: 'simple' };
  }

  // Format 2: "user:pass Info = ..." or "result = user:pass"
  if (line.includes(':') && (line.includes('Info =') || line.includes('result ='))) {
    let before = line;
    const infoIdx = line.indexOf('Info');
    const resultIdx = line.indexOf('result =');
    if (infoIdx > 0) before = line.slice(0, infoIdx).trim();
    else if (resultIdx === 0) before = line.slice(resultIdx + 'result ='.length).trim();
    const colonParts = before.split(':');
    if (colonParts.length >= 2) {
      return { username: colonParts[0].trim(), password: colonParts[1].split(' ')[0].trim(), raw: line, type: 'full' };
    }
  }

  // Fallback: user:pass
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
    document.getElementById('accountCard').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('emptyState').innerText = 'Không có account phù hợp';
    return;
  }
  const credEl = document.getElementById('credential');
  credEl.innerHTML = `<span class="neon-cyan">${acc.username}</span><span class="text-slate-500 mx-2">|</span><span class="neon-purple">${acc.password}</span>`;
  credEl.classList.remove('fade-in');
  void credEl.offsetWidth;
  credEl.classList.add('fade-in');

  const infoEl = document.getElementById('info');
  const infos = extractInfo(acc);
  if (infos.length > 0) {
    infoEl.innerHTML = infos.join('<span class="text-slate-600"> | </span>');
  } else {
    infoEl.innerHTML = '<span class="text-slate-500">Chỉ có username và mật khẩu</span>';
  }

  document.getElementById('source').textContent = `Loại: ${acc.type}`;
  document.getElementById('accountCard').classList.remove('hidden');
  document.getElementById('emptyState').classList.add('hidden');
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
  });
}

async function loadData() {
  const fileNames = ['data/acclq1.txt', 'data/acclq2.txt', 'data/acclq3.txt'];
  const results = [];
  for (const fname of fileNames) {
    try {
      const resp = await fetch(fname);
      if (!resp.ok) continue;
      const text = await resp.text();
      results.push(text);
    } catch (e) {
      console.log(`Missing ${fname}`);
    }
  }
  if (results.length === 0) {
    document.getElementById('emptyState').innerText = 'Không tìm thấy file acclq*.txt. Upload vào thư mục data/';
    return;
  }
  const allText = results.join('\n');
  allAccounts = [];
  for (const line of allText.split(/\r?\n/)) {
    const acc = parseAccount(line);
    if (acc) allAccounts.push(acc);
  }
  filteredAccounts = allAccounts;
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('accountCard').classList.remove('hidden');
  document.getElementById('countDisplay').textContent = `${allAccounts.length} accounts loaded`;
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
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
    copyToClipboard();
  }
});

// Init
loadData();
console.log('Lien Quan Account Share loaded');