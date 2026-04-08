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
  copyBtn: $('copyBtn')
};

const sampleAccounts = [
  {
    type: 'FULL INFO',
    credential: 'skypro89|abc123456',
    info: { Rank: 'Cao Thủ', Level: '30', Hero: '112', Skin: '240' },
    skins: ['Murad Siêu Việt', 'Violet Nữ Hoàng Pháo Hoa', 'Nakroth Bboy']
  },
  {
    type: 'NICK | PASS',
    credential: 'lq_mobile01|pass999',
    info: { Note: 'Tài khoản cơ bản', Server: 'Mặt Trời' },
    skins: ['Butterfly Huyền Thoại']
  },
  {
    type: 'FULL INFO',
    credential: 'pro.gamer|qwerty123',
    info: { Rank: 'Tinh Anh', Level: '27', Hero: '98', Skin: '178' },
    skins: ['Florentino Chí Tôn Kiếm Tiên', 'Hayate Tử Thần Vũ Trụ']
  }
];

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
    dom.skinSection.innerHTML = account.skins
      .map((skin) => `<span class="skin-tag">${skin}</span>`)
      .join('');
  }
}

function rollRandomAccount() {
  if (!sampleAccounts.length) {
    renderAccount(null);
    return;
  }

  const random = sampleAccounts[Math.floor(Math.random() * sampleAccounts.length)];
  renderAccount(random);
}

function setupRevealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, { threshold: 0.16 });

  items.forEach((el) => observer.observe(el));
}

function setupEvents() {
  dom.scrollToPanel?.addEventListener('click', () => {
    dom.panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  dom.rollBtns.forEach((btn) => btn.addEventListener('click', rollRandomAccount));

  dom.copyBtn?.addEventListener('click', async () => {
    const text = dom.credential?.textContent?.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      dom.copyBtn.textContent = 'ĐÃ SAO CHÉP';
      setTimeout(() => (dom.copyBtn.textContent = 'SAO CHÉP'), 1200);
    } catch {
      dom.copyBtn.textContent = 'KHÔNG COPY ĐƯỢC';
      setTimeout(() => (dom.copyBtn.textContent = 'SAO CHÉP'), 1200);
    }
  });
}

function init() {
  createParticles();
  setupRevealOnScroll();
  setupEvents();

  dom.countDisplay.textContent = String(sampleAccounts.length);
  setTimeout(rollRandomAccount, 650);
}

document.addEventListener('DOMContentLoaded', init);
