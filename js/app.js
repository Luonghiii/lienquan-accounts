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

// ─── Infinite Scroll state ────────────────────────────────────────────────
const PAGE_SIZE = 50;
let currentPool = [];
let renderedCount = 0;
let infiniteScrollObserver = null;

// ─── Parse CSV ─────────────────────────────────────────────────────────────────
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
  if (!str) return 0;
  const parts = str.split(' ');
  if (parts.length < 2) return 0;
  const [d, m, y] = parts[1].split('-');
  const [hh, mm, ss] = parts[0].split(':');
  const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}`);
  return isNaN(dt) ? 0 : dt.getTime();
}

// ─── Parse TXT ─────────────────────────────────────────────────────────────────
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

// ─── Load data ─────────────────────────────────────────────────────────────────
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
  updateFilterCounts();
  currentPool = allAccounts;
  renderList(getFilteredAccounts());

  return allAccounts;
}

// ─── Stats ──────────────────────────────────────────────────────────────────
function updateStats(all, visible) {
  if (dom.countDisplay) dom.countDisplay.textContent = all.length;
  if (dom.visibleCount) dom.visibleCount.textContent = visible.length;
  if (dom.skinCount) dom.skinCount.textContent = all.filter(a => a.hasSkin).length;
}

function updateFilterCounts() {
  const set = (id, count) => { const el = $(id); if (el) el.textContent = count; };
  set('countAll',     allAccounts.length);
  set('countFull',    allAccounts.filter(a => a.type === 'FULL INFO').length);
  set('countPartial', allAccounts.filter(a => a.type === 'NICK | PASS').length);
  set('countSkin',    allAccounts.filter(a => a.hasSkin).length);
  set('countWhite',   allAccounts.filter(a => a.isWhite).length);
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

// ─── Render account card ────────────────────────────────────────────────────
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
    dom.accStatus.className = 'acc-status-badge';
    if (account.isWhite) {
      dom.accStatus.style.cssText = 'color:var(--warning);border-color:rgba(255,209,102,.28);background:rgba(255,209,102,.08)';
    } else {
      dom.accStatus.style.cssText = '';
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

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}

// ─── INFINITE SCROLL: Render list (chỉ render 50 items đầu tiên) ───────────────
function renderList(pool) {
  if (!dom.accountList) return;

  currentPool = pool;
  renderedCount = 0;

  // Clean up old observer if exists
  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver = null;
  }

  dom.accountList.innerHTML = '';

  if (!pool.length) {
    dom.accountList.innerHTML = `<div class="empty-list">Không có tài khoản phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  // Render first batch
  appendRows();

  // Setup infinite scroll observer on sentinel element
  setupInfiniteScroll();
}

// Append next PAGE_SIZE rows to DOM
function appendRows() {
  if (!dom.accountList || renderedCount >= currentPool.length) return;

  const start = renderedCount;
  const end = Math.min(start + PAGE_SIZE, currentPool.length);
  const frag = document.createDocumentFragment();

  for (let i = start; i < end; i++) {
    const acc = currentPool[i];
    const row = document.createElement('div');
    row.className = 'account-row';
    row.dataset.index = i;
    row.dataset.credential = escHtml(acc.credential);
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Chọn tài khoản ${escHtml(acc.username)}`);

    const pillClass = acc.hasSkin ? 'skin' : acc.isWhite ? 'white' : '';
    const pillText = acc.hasSkin ? `🎨 ${acc.skinCount} skin` : acc.isWhite ? '⚠ Trắng' : 'Cơ bản';

    row.innerHTML = `
      <div class="row-main">
        <div class="row-user">${escHtml(acc.username)}</div>
        <div class="row-sub">${acc.type} · ${acc.info['Quốc Gia'] || 'N/A'}</div>
      </div>
      <div class="row-type">${acc.info['Rank'] || 'N/A'}</div>
      <div class="row-meta">${acc.loginDate ? acc.loginDate.split(' ').pop() : '—'}</div>
      <div class="row-action"><span class="row-pill ${pillClass}">${pillText}</span></div>
    `;

    const selectRow = () => {
      renderAccount(acc);
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    row.addEventListener('click', selectRow);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRow(); }
    });

    frag.appendChild(row);
  }

  dom.accountList.appendChild(frag);
  renderedCount = end;

  // Update sentinel
  updateSentinel();
}

// Create or update sentinel element at end of list for IntersectionObserver
function updateSentinel() {
  if (!dom.accountList) return;

  let sentinel = dom.accountList.querySelector('.infinite-scroll-sentinel');

  if (renderedCount >= currentPool.length) {
    // All items rendered -> remove sentinel
    sentinel?.remove();
    return;
  }

  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.className = 'infinite-scroll-sentinel';
    sentinel.style.cssText = 'height:1px;';
    dom.accountList.appendChild(sentinel);
  }
}

function setupInfiniteScroll() {
  const sentinel = dom.accountList?.querySelector('.infinite-scroll-sentinel');
  if (!sentinel) return;

  infiniteScrollObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && renderedCount < currentPool.length) {
          appendRows();
        }
      });
    },
    { root: null, rootMargin: '100px', threshold: 0 }
  );

  infiniteScrollObserver.observe(sentinel);
}
