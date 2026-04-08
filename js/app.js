const $ = (id) => document.getElementById(id);

const dom = {
  particles: $('particles'),
  scrollToPanel: $('scrollToPanel'),
  panel: $('panel'),
  loadingState: $('loadingState'),
  accountCard: $('accountCard'),
  emptyState: $('emptyState'),
  credential: $('credential'),
  infoGrid: $('infoGrid'),
  skinSection: $('skinSection'),
  accType: $('accType'),
  countDisplay: $('countDisplay'),
  rollBtns: [$('rollBtnMain'), $('rollBtn')].filter(Boolean),
  copyBtn: $('copyBtn'),
  filterChips: null
};

let allAccounts = [];

// Parse acc.csv: User,Pass,Rank,Level,Tuong,Skin_Count,Skin_List,Email,SDT,QuocGia,Login_Cuoi,TrangThai
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const accounts = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 2 || !cols[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
    const skinList = obj['Skin_List'] ? obj['Skin_List'].split('|').map(s => s.trim()).filter(Boolean) : [];
    const hasFull = obj['Rank'] || obj['Level'] || obj['Tuong'];
    accounts.push({
      type: hasFull ? 'FULL INFO' : 'NICK | PASS',
      credential: `${obj['User']}|${obj['Pass']}`,
      info: {
        Rank: obj['Rank'] || 'N/A',
        Level: obj['Level'] || 'N/A',
        'Tướng': obj['Tuong'] || 'N/A',
        Skin: obj['Skin_Count'] || '0',
        'Quốc Gia': obj['QuocGia'] || 'N/A',
        'Trạng Thái': obj['TrangThai'] || 'N/A'
      },
      skins: skinList,
      source: 'csv'
    });
  }
  return accounts;
}

// Parse acc.txt: username|password per line
function parseTXT(text) {
  const lines = text.trim().split('\n');
  const accounts = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('|');
    if (parts.length < 2) continue;
    const user = parts[0].trim();
    const pass = parts[1].trim();
    if (!user || !pass) continue;
    accounts.push({
      type: 'NICK | PASS',
      credential: `${user}|${pass}`,
      info: { 'Ghi Chú': 'Tài khoản cơ bản', Server: 'Mặt Trời' },
      skins: [],
      source: 'txt'
    });
  }
  return accounts;
}

async function loadAccounts() {
  const results = await Promise.allSettled([
    fetch('data/acc.csv').then(r => r.ok ? r.text() : Promise.reject()),
    fetch('data/acc.txt').then(r => r.ok ? r.text() : Promise.reject())
  ]);

  let csvAccounts = [];
  let txtAccounts = [];

  if (results[0].status === 'fulfilled') {
    csvAccounts = parseCSV(results[0].value);
  }
  if (results[1].status === 'fulfilled') {
    txtAccounts = parseTXT(results[1].value);
  }

  // Merge: csv accounts first, then txt accounts not already in csv
  const csvUsers = new Set(csvAccounts.map(a => a.credential.split('|')[0].toLowerCase()));
  const uniqueTxt = txtAccounts.filter(a => !csvUsers.has(a.credential.split('|')[0].toLowerCase()));
  allAccounts = [...csvAccounts, ...uniqueTxt];

  if (dom.countDisplay) dom.countDisplay.textContent = String(allAccounts.length);
  return allAccounts;
}

function createParticles(total = 28) {
  if (!dom.particles) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = (Math.random() * 6 + 2).toFixed(1);
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.bottom = `${Math.random() * -120}px`;
    p.style.animationDuration = `${Math.random() * 9 + 8}s`;
    p.style.animationDelay = `${Math.random() * -9}s`;
    frag.appendChild(p);
  }
  dom.particles.appendChild(frag);
}

function renderAccount(account) {
  dom.loadingState?.classList.add('hidden');
  dom.emptyState?.classList.add('hidden');
  dom.accountCard?.classList.remove('hidden');

  if (!account) {
    dom.accountCard?.classList.add('hidden');
    dom.emptyState?.classList.remove('hidden');
    return;
  }

  if (dom.accType) dom.accType.textContent = account.type;
  if (dom.credential) dom.credential.textContent = account.credential;

  if (dom.infoGrid) {
    dom.infoGrid.innerHTML = Object.entries(account.info)
      .map(([label, value]) => `<div class="info-item"><span class="label">${label}</span><span class="value">${value}</span></div>`)
      .join('');
  }

  if (dom.skinSection) {
    if (account.skins && account.skins.length > 0) {
      dom.skinSection.innerHTML = account.skins
        .map(skin => `<span class="skin-tag">${skin}</span>`)
        .join('');
      dom.skinSection.style.display = '';
    } else {
      dom.skinSection.innerHTML = '<span class="skin-tag" style="opacity:0.5">Không có skin</span>';
      dom.skinSection.style.display = '';
    }
  }
}

function getFilteredAccounts() {
  const active = document.querySelector('input[name="filter"]:checked')?.value || 'all';
  if (active === 'full') return allAccounts.filter(a => a.type === 'FULL INFO');
  if (active === 'partial') return allAccounts.filter(a => a.type === 'NICK | PASS');
  return allAccounts;
}

function rollRandomAccount() {
  const pool = getFilteredAccounts();
  if (!pool.length) {
    renderAccount(null);
    return;
  }
  const random = pool[Math.floor(Math.random() * pool.length)];
  renderAccount(random);
}

function setupRevealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, { threshold: 0.16 });
  items.forEach(el => observer.observe(el));
}

function setupEvents() {
  dom.scrollToPanel?.addEventListener('click', () => {
    dom.panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  dom.rollBtns.forEach(btn => btn.addEventListener('click', rollRandomAccount));

  dom.copyBtn?.addEventListener('click', async () => {
    const text = dom.credential?.textContent?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      dom.copyBtn.textContent = 'DA SAO CHEP';
      setTimeout(() => (dom.copyBtn.textContent = 'SAO CHEP'), 1200);
    } catch {
      dom.copyBtn.textContent = 'LOI COPY';
      setTimeout(() => (dom.copyBtn.textContent = 'SAO CHEP'), 1200);
    }
  });

  // Filter chips
  document.querySelectorAll('input[name="filter"]').forEach(input => {
    input.addEventListener('change', rollRandomAccount);
  });
}

async function init() {
  createParticles();
  setupRevealOnScroll();
  setupEvents();

  dom.loadingState?.classList.remove('hidden');
  dom.accountCard?.classList.add('hidden');
  dom.emptyState?.classList.add('hidden');

  await loadAccounts();

  setTimeout(rollRandomAccount, 650);
}

document.addEventListener('DOMContentLoaded', init);
