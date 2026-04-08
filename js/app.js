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
  accStatus: $('accStatus'),
  countDisplay: $('countDisplay'),
  visibleCount: $('visibleCount'),
  skinCount: $('skinCount'),
  rollBtns: [$('rollBtnMain'), $('rollBtn')].filter(Boolean),
  copyBtn: $('copyBtn'),
  searchInput: $('searchInput'),
  sortSelect: $('sortSelect'),
  accountList: $('accountList'),
};

let allAccounts = [];
let currentAccount = null;

// ─── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
  const accounts = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 2 || !cols[0]) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });

    const skinList = obj['Skin_List']
      ? obj['Skin_List'].split('|').map(s => s.trim()).filter(Boolean)
      : [];

    const hasFull = obj['Rank'] || obj['Level'] || obj['Tuong'];
    const isWhite = (obj['TrangThai'] || '').toLowerCase().includes('trắng')
      || (obj['TrangThai'] || '').toLowerCase().includes('loi pass');
    const skinCount = parseInt(obj['Skin_Count'] || '0', 10) || 0;
    const loginDate = obj['Login_Cuoi'] || '';

    accounts.push({
      type: hasFull ? 'FULL INFO' : 'NICK | PASS',
      credential: `${obj['User']}|${obj['Pass']}`,
      username: obj['User'] || '',
      info: {
        Rank: obj['Rank'] || 'N/A',
        Level: obj['Level'] || 'N/A',
        'Tướng': obj['Tuong'] || 'N/A',
        Skin: obj['Skin_Count'] || '0',
        'Quốc Gia': obj['QuocGia'] || 'N/A',
        'Trạng Thái': obj['TrangThai'] || 'N/A',
      },
      skins: skinList,
      skinCount,
      isWhite,
      hasSkin: skinCount > 0,
      loginDate,
      loginTimestamp: parseLoginDate(loginDate),
      status: isWhite ? 'Lỗi pass' : 'Sẵn sàng',
      source: 'csv',
    });
  }
  return accounts;
}

function parseLoginDate(str) {
  // format: "HH:mm:ss DD-MM-YYYY"
  if (!str) return 0;
  const parts = str.split(' ');
  if (parts.length < 2) return 0;
  const [d, m, y] = parts[1].split('-');
  const [hh, mm, ss] = parts[0].split(':');
  const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}`);
  return isNaN(dt) ? 0 : dt.getTime();
}

// ─── Parse TXT ────────────────────────────────────────────────────────────────
function parseTXT(text) {
  const lines = text.trim().split('\n');
  const accounts = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, '');
    if (!trimmed) continue;
    const parts = trimmed.split('|');
    if (parts.length < 2) continue;
    const user = parts[0].trim();
    const pass = parts[1].trim();
    if (!user || !pass) continue;
    accounts.push({
      type: 'NICK | PASS',
      credential: `${user}|${pass}`,
      username: user,
      info: { 'Ghi Chú': 'Tài khoản cơ bản', Server: 'Mặt Trời' },
      skins: [],
      skinCount: 0,
      isWhite: false,
      hasSkin: false,
      loginDate: '',
      loginTimestamp: 0,
      status: 'Sẵn sàng',
      source: 'txt',
    });
  }
  return accounts;
}

// ─── Load data ────────────────────────────────────────────────────────────────
async function loadAccounts() {
  const results = await Promise.allSettled([
    fetch('data/acc.csv').then(r => r.ok ? r.text() : Promise.reject()),
    fetch('data/acc.txt').then(r => r.ok ? r.text() : Promise.reject()),
  ]);

  let csvAccounts = [];
  let txtAccounts = [];

  if (results[0].status === 'fulfilled') csvAccounts = parseCSV(results[0].value);
  if (results[1].status === 'fulfilled') txtAccounts = parseTXT(results[1].value);

  const csvUsers = new Set(csvAccounts.map(a => a.username.toLowerCase()));
  const uniqueTxt = txtAccounts.filter(a => !csvUsers.has(a.username.toLowerCase()));
  allAccounts = [...csvAccounts, ...uniqueTxt];

  updateStats(allAccounts, allAccounts);
  return allAccounts;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats(all, visible) {
  if (dom.countDisplay) dom.countDisplay.textContent = all.length;
  if (dom.visibleCount) dom.visibleCount.textContent = visible.length;
  if (dom.skinCount) dom.skinCount.textContent = all.filter(a => a.hasSkin).length;
}

// ─── Filter + Sort ────────────────────────────────────────────────────────────
function getFilteredAccounts() {
  const activeFilter = document.querySelector('input[name="filter"]:checked')?.value || 'all';
  const keyword = dom.searchInput?.value.trim().toLowerCase() || '';
  const sortBy = dom.sortSelect?.value || 'random';

  let pool = [...allAccounts];

  // filter
  if (activeFilter === 'full')    pool = pool.filter(a => a.type === 'FULL INFO');
  if (activeFilter === 'partial') pool = pool.filter(a => a.type === 'NICK | PASS');
  if (activeFilter === 'skin')    pool = pool.filter(a => a.hasSkin);
  if (activeFilter === 'white')   pool = pool.filter(a => a.isWhite);

  // search
  if (keyword) {
    pool = pool.filter(a =>
      `${a.username} ${a.credential} ${a.status} ${a.info['Quốc Gia'] || ''}`.toLowerCase().includes(keyword)
    );
  }

  // sort
  if (sortBy === 'latest')  pool.sort((a, b) => b.loginTimestamp - a.loginTimestamp);
  if (sortBy === 'skins')   pool.sort((a, b) => b.skinCount - a.skinCount);
  if (sortBy === 'user')    pool.sort((a, b) => a.username.localeCompare(b.username));
  if (sortBy === 'random')  pool.sort(() => Math.random() - 0.5);

  return pool;
}

// ─── Render account card ──────────────────────────────────────────────────────
function renderAccount(account) {
  dom.loadingState?.classList.add('hidden');

  if (!account) {
    dom.accountCard?.classList.add('hidden');
    dom.emptyState?.classList.remove('hidden');
    return;
  }

  dom.emptyState?.classList.add('hidden');
  dom.accountCard?.classList.remove('hidden');

  if (dom.accType) dom.accType.textContent = account.type;

  if (dom.accStatus) {
    dom.accStatus.textContent = account.status;
    dom.accStatus.className = 'acc-status-tag';
    if (account.isWhite) {
      dom.accStatus.style.color = 'var(--warning)';
      dom.accStatus.style.borderColor = 'rgba(255,209,102,0.28)';
      dom.accStatus.style.background = 'rgba(255,209,102,0.1)';
    } else {
      dom.accStatus.style.color = 'var(--success)';
      dom.accStatus.style.borderColor = 'rgba(90,247,142,0.26)';
      dom.accStatus.style.background = 'rgba(90,247,142,0.08)';
    }
  }

  if (dom.credential) dom.credential.textContent = account.credential;

  if (dom.infoGrid) {
    dom.infoGrid.innerHTML = Object.entries(account.info)
      .map(([label, value]) =>
        `<div class="info-item"><span class="label">${label}</span><span class="value">${value}</span></div>`
      ).join('');
  }

  if (dom.skinSection) {
    dom.skinSection.innerHTML = account.skins.length > 0
      ? account.skins.map(s => `<span class="skin-tag">${s}</span>`).join('')
      : `<span class="skin-tag" style="opacity:0.5">Không có skin</span>`;
  }

  currentAccount = account;

  // highlight active row in list
  document.querySelectorAll('.account-row').forEach(row => {
    row.classList.toggle('active', row.dataset.credential === account.credential);
  });
}

// ─── Render list ──────────────────────────────────────────────────────────────
function renderList(pool) {
  if (!dom.accountList) return;

  if (!pool.length) {
    dom.accountList.innerHTML = `<div class="empty-list">Không có tài khoản phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  dom.accountList.innerHTML = pool.map((acc, idx) => {
    const pillClass = acc.hasSkin ? 'skin' : acc.isWhite ? 'white' : '';
    const pillText = acc.hasSkin
      ? `🎨 ${acc.skinCount} skin`
      : acc.isWhite ? '⚠ Trắng' : 'Cơ bản';
    return `
      <div class="account-row" data-index="${idx}" data-credential="${escHtml(acc.credential)}" role="button" tabindex="0" aria-label="Chọn tài khoản ${escHtml(acc.username)}">
        <div class="row-main">
          <div class="row-user">${escHtml(acc.username)}</div>
          <div class="row-sub">${acc.type} · ${acc.info['Quốc Gia'] || 'N/A'}</div>
        </div>
        <div class="row-type">${acc.info['Rank'] || 'N/A'}</div>
        <div class="row-meta">${acc.loginDate ? acc.loginDate.split(' ').pop() : '—'}</div>
        <div class="row-action"><span class="row-pill ${pillClass}">${pillText}</span></div>
      </div>`;
  }).join('');

  // click / keyboard on rows
  dom.accountList.querySelectorAll('.account-row').forEach(row => {
    const selectRow = () => {
      const idx = parseInt(row.dataset.index, 10);
      if (!isNaN(idx) && pool[idx]) renderAccount(pool[idx]);
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    row.addEventListener('click', selectRow);
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRow(); } });
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Roll random ──────────────────────────────────────────────────────────────
function rollRandomAccount() {
  const pool = getFilteredAccounts();
  renderList(pool);
  updateStats(allAccounts, pool);
  if (!pool.length) { renderAccount(null); return; }
  const random = pool[Math.floor(Math.random() * pool.length)];
  renderAccount(random);
}

// ─── Refresh list (no random roll) ───────────────────────────────────────────
function refreshList() {
  const pool = getFilteredAccounts();
  renderList(pool);
  updateStats(allAccounts, pool);
  // keep current card if still in pool, else pick first
  if (currentAccount && pool.some(a => a.credential === currentAccount.credential)) {
    document.querySelectorAll('.account-row').forEach(row => {
      row.classList.toggle('active', row.dataset.credential === currentAccount.credential);
    });
  } else if (pool.length) {
    renderAccount(pool[0]);
  } else {
    renderAccount(null);
  }
}

// ─── Particles ────────────────────────────────────────────────────────────────
function createParticles(total = 28) {
  if (!dom.particles) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < total; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = (Math.random() * 6 + 2).toFixed(1);
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:${Math.random()*-120}px;animation-duration:${Math.random()*9+8}s;animation-delay:${Math.random()*-9}s`;
    frag.appendChild(p);
  }
  dom.particles.appendChild(frag);
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function setupRevealOnScroll() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); });
  }, { threshold: 0.16 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─── Events ───────────────────────────────────────────────────────────────────
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
      dom.copyBtn.textContent = '✓ ĐÃ SAO CHÉP';
      setTimeout(() => { dom.copyBtn.textContent = 'SAO CHÉP'; }, 1500);
    } catch {
      dom.copyBtn.textContent = 'LỖI COPY';
      setTimeout(() => { dom.copyBtn.textContent = 'SAO CHÉP'; }, 1500);
    }
  });

  // filter chips → refresh list (don't random roll, keep context)
  document.querySelectorAll('input[name="filter"]').forEach(input => {
    input.addEventListener('change', refreshList);
  });

  // search & sort → refresh list
  let searchTimer;
  dom.searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshList, 220);
  });

  dom.sortSelect?.addEventListener('change', () => {
    const pool = getFilteredAccounts();
    renderList(pool);
    updateStats(allAccounts, pool);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
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

// ─── Update filter chip counts ───────────────────────────────────────────────
function updateFilterCounts() {
  const set = (id, count) => { const el = $(id); if (el) el.textContent = count; };
  set('countAll',     allAccounts.length);
  set('countFull',    allAccounts.filter(a => a.type === 'FULL INFO').length);
  set('countPartial', allAccounts.filter(a => a.type === 'NICK | PASS').length);
  set('countSkin',    allAccounts.filter(a => a.hasSkin).length);
  set('countWhite',   allAccounts.filter(a => a.isWhite).length);
}

// ─── Clear search button ─────────────────────────────────────────────────────
function setupClearBtn() {
  const clearBtn = $('clearSearch');
  const input    = $('searchInput');
  if (!clearBtn || !input) return;

  input.addEventListener('input', () => {
    clearBtn.classList.toggle('visible', input.value.length > 0);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('visible');
    input.dispatchEvent(new Event('input'));
    input.focus();
  });
}

// ─── Patch: fix accStatus class + call new helpers in init ───────────────────
// Override renderAccount to use correct badge class
const _origRenderAccount = renderAccount;
function renderAccountPatched(account) {
  _origRenderAccount(account);
  // Switch acc-status-tag -> acc-status-badge
  const statusEl = $('accStatus');
  if (statusEl) {
    statusEl.className = account && account.isWhite ? 'acc-status-badge warning' : 'acc-status-badge';
    if (statusEl.className.includes('warning')) {
      statusEl.style.cssText = 'color:var(--warning);border-color:rgba(255,209,102,.28);background:rgba(255,209,102,.08)';
    } else {
      statusEl.style.cssText = '';
    }
  }
}

// Patch loadAccounts to also update counts
const _origLoadAccounts = loadAccounts;
async function loadAccountsPatched() {
  const result = await _origLoadAccounts();
  updateFilterCounts();
  return result;
}

// Re-wire DOMContentLoaded to call patched version
document.removeEventListener('DOMContentLoaded', init);
document.addEventListener('DOMContentLoaded', async function initPatched() {
  createParticles();
  setupRevealOnScroll();
  setupEvents();
  setupClearBtn();

  $('loadingState')?.classList.remove('hidden');
  $('accountCard')?.classList.add('hidden');
  $('emptyState')?.classList.add('hidden');

  await loadAccountsPatched();
  setTimeout(rollRandomAccount, 650);
});
