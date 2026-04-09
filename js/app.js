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
  accountName: $('accountName'),
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

// ─── Parse CSV ────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter(line => line.trim() !== '');

  if (!lines.length) return [];

  const headers = parseCSVRow(lines[0]).map(h => h.trim().replace(/^\uFEFF/, ''));
  const accounts = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]).map(c => c.trim());
    if (!cols.length || !cols[0]) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] || '';
    });

    const skinList = obj['Skin_List']
      ? obj['Skin_List'].split(/[|,]/).map(s => s.trim()).filter(Boolean)
      : [];

    const rank = normalizeInfoValue(obj['Rank']);
    const level = normalizeInfoValue(obj['Level'], { keepZero: false });
    const heroCount = normalizeInfoValue(obj['Tuong'], { keepZero: false });
    const country = normalizeInfoValue(obj['QuocGia']) || 'N/A';
    const rawStatus = normalizeInfoValue(obj['TrangThai']) || 'N/A';
    const email = normalizeInfoValue(obj['Email']) || 'N/A';
    const phone = normalizeInfoValue(obj['SĐT']) || 'N/A';
    const skinCount = parseInt(obj['Skin_Count'] || '0', 10) || 0;
    const loginDate = (obj['Login_Cuoi'] || '').trim();

    const hasFull =
      hasMeaningfulValue(rank) ||
      hasMeaningfulValue(level) ||
      hasMeaningfulValue(heroCount);

    const normalizedStatus = rawStatus.toLowerCase();
    const isWhite =
      normalizedStatus.includes('trắng') ||
      normalizedStatus.includes('trang') ||
      normalizedStatus.includes('lỗi pass') ||
      normalizedStatus.includes('loi pass');

    accounts.push({
      type: hasFull ? 'FULL INFO' : 'NICK | PASS',
      credential: `${obj['User'] || ''}|${obj['Pass'] || ''}`,
      username: obj['User'] || '',
      info: {
        Rank: rank || 'N/A',
        Level: level || 'N/A',
        'Tướng': heroCount || 'N/A',
        Skin: String(skinCount),
        'Quốc Gia': country,
        Email: email,
        'SĐT': phone,
        'Login Cuối': loginDate || 'N/A',
        'Trạng Thái': rawStatus,
      },
      skins: skinList,
      skinCount,
      isWhite,
      hasSkin: skinCount > 0,
      loginDate,
      loginTimestamp: parseLoginDate(loginDate),
      status: isWhite ? 'Acc trắng / lỗi pass' : 'Sẵn sàng',
      source: 'csv',
    });
  }

  return accounts;
}

function parseCSVRow(row) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    const next = row[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cols.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  cols.push(current);
  return cols;
}

function normalizeInfoValue(value, options = {}) {
  const keepZero = options.keepZero ?? true;
  const raw = String(value || '').trim();
  if (!raw) return 'N/A';

  const normalized = raw.toLowerCase();
  const invalidTokens = new Set([
    'không lọc được',
    'khong loc duoc',
    'chưa xác thực',
    'chua xac thuc',
    'n/a',
    'no [chưa xác thực]',
    'no [chua xac thuc]',
    'no',
  ]);

  if (invalidTokens.has(normalized)) return 'N/A';
  if (!keepZero && (normalized === '0' || normalized === 'chưa có' || normalized === 'chua co')) {
    return 'N/A';
  }

  return raw;
}

function hasMeaningfulValue(value) {
  return value && value !== 'N/A';
}

function parseLoginDate(str) {
  if (!str) return 0;

  const parts = str.split(' ');
  if (parts.length < 2) return 0;

  const [timePart, datePart] = parts;
  const [d, m, y] = datePart.split('-');
  const [hh = '00', mm = '00', ss = '00'] = timePart.split(':');

  if (!d || !m || !y) return 0;

  const dt = new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}`);
  return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
}

// ─── Parse TXT ────────────────────────────────────────────────────────────
function parseTXT(text) {
  const lines = String(text || '').trim().split('\n');
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

// ─── Load data ────────────────────────────────────────────────────────────
async function loadAccounts() {
  const results = await Promise.allSettled([
    fetch('data/acc.csv').then(r => r.ok ? r.text() : Promise.reject(new Error('Không tải được acc.csv'))),
    fetch('data/acc.txt').then(r => r.ok ? r.text() : Promise.reject(new Error('Không tải được acc.txt'))),
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
  const filtered = getFilteredAccounts();
  renderList(filtered);
  renderAccount(filtered[0] || null);

  return allAccounts;
}

function refreshView({ keepCurrent = true } = {}) {
  const filtered = getFilteredAccounts();
  updateStats(allAccounts, filtered);
  renderList(filtered);

  if (!keepCurrent) {
    renderAccount(filtered[0] || null);
    return;
  }

  if (!currentAccount) {
    renderAccount(filtered[0] || null);
    return;
  }

  const stillVisible = filtered.find(acc => acc.credential === currentAccount.credential);
  renderAccount(stillVisible || filtered[0] || null);
}

// ─── Stats ────────────────────────────────────────────────────────────────
function updateStats(all, visible) {
  if (dom.countDisplay) dom.countDisplay.textContent = all.length;
  if (dom.visibleCount) dom.visibleCount.textContent = visible.length;
  if (dom.skinCount) dom.skinCount.textContent = all.filter(a => a.hasSkin).length;
}

function updateFilterCounts() {
  const set = (id, count) => {
    const el = $(id);
    if (el) el.textContent = count;
  };

  set('countAll', allAccounts.length);
  set('countFull', allAccounts.filter(a => a.type === 'FULL INFO').length);
  set('countPartial', allAccounts.filter(a => a.type === 'NICK | PASS').length);
  set('countSkin', allAccounts.filter(a => a.hasSkin).length);
  set('countWhite', allAccounts.filter(a => a.isWhite).length);
}

// ─── Filter + Sort ────────────────────────────────────────────────────────
function getFilteredAccounts() {
  const activeFilter = document.querySelector('input[name="filter"]:checked')?.value || 'all';
  const keyword = dom.searchInput?.value.trim().toLowerCase() || '';
  const sortBy = dom.sortSelect?.value || 'latest';

  let pool = [...allAccounts];

  if (activeFilter === 'full') pool = pool.filter(a => a.type === 'FULL INFO');
  if (activeFilter === 'partial') pool = pool.filter(a => a.type === 'NICK | PASS');
  if (activeFilter === 'skin') pool = pool.filter(a => a.hasSkin);
  if (activeFilter === 'white') pool = pool.filter(a => a.isWhite);

  if (keyword) {
    pool = pool.filter(a =>
      [
        a.username,
        a.credential,
        a.status,
        a.info?.['Quốc Gia'] || '',
        a.info?.['Rank'] || '',
        a.info?.['Email'] || '',
        a.info?.['SĐT'] || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }

  if (sortBy === 'latest') pool.sort((a, b) => b.loginTimestamp - a.loginTimestamp);
  if (sortBy === 'skins') pool.sort((a, b) => b.skinCount - a.skinCount);
  if (sortBy === 'user') pool.sort((a, b) => a.username.localeCompare(b.username));
  if (sortBy === 'random') fisherYatesShuffle(pool);

  return pool;
}

// ─── Render account card ──────────────────────────────────────────────────
function renderAccount(account) {
  dom.loadingState?.classList.add('hidden');

  if (!account) {
    dom.accountCard?.classList.add('hidden');
    dom.emptyState?.classList.remove('hidden');
    currentAccount = null;
    return;
  }

  dom.emptyState?.classList.add('hidden');
  dom.accountCard?.classList.remove('hidden');

  if (dom.accType) dom.accType.textContent = account.type;

  if (dom.accStatus) {
    dom.accStatus.textContent = account.status;
    dom.accStatus.className = 'acc-status-badge';

    if (account.isWhite) {
      dom.accStatus.style.cssText =
        'color:var(--warning);border-color:rgba(255,209,102,.28);background:rgba(255,209,102,.08)';
    } else {
      dom.accStatus.style.cssText = '';
    }
  }

  if (dom.credential) dom.credential.textContent = account.credential;
  if (dom.accountName) dom.accountName.textContent = `Tên acc: ${account.username || 'N/A'}`;

  if (dom.infoGrid) {
    dom.infoGrid.innerHTML = Object.entries(account.info)
      .map(
        ([label, value]) =>
          `<div class="info-item"><span class="label">${label}</span><span class="value">${value}</span></div>`
      )
      .join('');
  }

  if (dom.skinSection) {
    dom.skinSection.innerHTML =
      account.skins.length > 0
        ? account.skins.map(s => `<span class="skin-tag">${escHtml(s)}</span>`).join('')
        : `<span class="skin-tag" style="opacity:0.5">Không có skin</span>`;
  }

  currentAccount = account;

  document.querySelectorAll('.account-row').forEach(row => {
    row.classList.toggle('active', row.dataset.credential === account.credential);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Infinite Scroll ───────────────────────────────────────────────────────
function renderList(pool) {
  if (!dom.accountList) return;

  currentPool = pool;
  renderedCount = 0;

  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect();
    infiniteScrollObserver = null;
  }

  dom.accountList.innerHTML = '';

  if (!pool.length) {
    dom.accountList.innerHTML = `<div class="empty-list">Không có tài khoản phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  appendRows();
  setupInfiniteScroll();
}

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
    row.dataset.credential = acc.credential;
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Chọn tài khoản ${acc.username}`);

    const pillClass = acc.hasSkin ? 'skin' : acc.isWhite ? 'white' : '';
    const pillText = acc.hasSkin ? `🎨 ${acc.skinCount} skin` : acc.isWhite ? '⚠ Trắng' : 'Cơ bản';

    row.innerHTML = `
      <div class="row-main">
        <div class="row-user">${escHtml(acc.username)}</div>
        <div class="row-sub">${escHtml(acc.type)} · ${escHtml(acc.info['Quốc Gia'] || 'N/A')}</div>
      </div>
      <div class="row-type">${escHtml(acc.info['Rank'] || 'N/A')}</div>
      <div class="row-meta">${escHtml(acc.loginDate ? acc.loginDate.split(' ').pop() : '—')}</div>
      <div class="row-action"><span class="row-pill ${pillClass}">${pillText}</span></div>
    `;

    const selectRow = () => {
      renderAccount(acc);
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    row.addEventListener('click', selectRow);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectRow();
      }
    });

    frag.appendChild(row);
  }

  dom.accountList.appendChild(frag);
  renderedCount = end;
  updateSentinel();
}

function updateSentinel() {
  if (!dom.accountList) return;

  let sentinel = dom.accountList.querySelector('.infinite-scroll-sentinel');

  if (renderedCount >= currentPool.length) {
    sentinel?.remove();
    return;
  }

  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.className = 'infinite-scroll-sentinel';
    sentinel.style.cssText = 'height: 1px;';
    dom.accountList.appendChild(sentinel);
  }
}

function setupInfiniteScroll() {
  const sentinel = dom.accountList?.querySelector('.infinite-scroll-sentinel');
  if (!sentinel) return;

  infiniteScrollObserver = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && renderedCount < currentPool.length) {
          appendRows();

          const nextSentinel = dom.accountList?.querySelector('.infinite-scroll-sentinel');
          if (nextSentinel && nextSentinel !== entry.target) {
            infiniteScrollObserver.disconnect();
            infiniteScrollObserver.observe(nextSentinel);
          }
        }
      }
    },
    {
      root: dom.accountList,
      rootMargin: '120px',
      threshold: 0,
    }
  );

  infiniteScrollObserver.observe(sentinel);
}

function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function debounce(fn, wait = 200) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function pickRandomAccount() {
  const filtered = getFilteredAccounts();
  if (!filtered.length) {
    renderAccount(null);
    return;
  }

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  renderAccount(random);
}

function copyCurrentAccount() {
  if (!currentAccount?.credential) return;

  const value = currentAccount.credential;

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {});
    return;
  }

  const temp = document.createElement('textarea');
  temp.value = value;
  temp.style.position = 'fixed';
  temp.style.left = '-9999px';
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  document.execCommand('copy');
  temp.remove();
}

function initReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  if (!revealElements.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  revealElements.forEach(el => observer.observe(el));
}

function initEvents() {
  dom.scrollToPanel?.addEventListener('click', () => {
    dom.panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  dom.rollBtns.forEach(btn => btn.addEventListener('click', pickRandomAccount));
  dom.copyBtn?.addEventListener('click', copyCurrentAccount);

  const debouncedSearch = debounce(() => refreshView({ keepCurrent: true }), 180);
  dom.searchInput?.addEventListener('input', debouncedSearch);
  dom.sortSelect?.addEventListener('change', () => refreshView({ keepCurrent: true }));

  document.querySelectorAll('input[name="filter"]').forEach(input => {
    input.addEventListener('change', () => refreshView({ keepCurrent: false }));
  });
}

async function initApp() {
  initReveal();
  initEvents();

  try {
    await loadAccounts();
  } catch (error) {
    console.error('initApp error:', error);

    dom.loadingState?.classList.remove('hidden');
    if (dom.loadingState) {
      dom.loadingState.innerHTML = `
        <p>Không thể tải dữ liệu tài khoản.</p>
        <small>Hãy chạy trang qua web server (vd: Live Server) thay vì mở trực tiếp file://.</small>
      `;
    }
    renderAccount(null);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
