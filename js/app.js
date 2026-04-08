(() => {
  // State
  let allAccounts = [];
  let filteredAccounts = [];
  let current = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // Parser - supports simple (username|password or username:password) and full info lines
  function parseAccount(line) {
    line = line.trim();
    if (!line) return null;

    // Simple format: username|password or username:password
    if (line.includes('|') && !line.includes(':')) {
      const parts = line.split('|');
      return { username: parts[0].trim(), password: parts[1].trim(), type: 'simple' };
    }

    if (line.includes(':') && !line.includes('result =') && !line.includes('NAME :') && !line.includes('RANK :') && !line.includes('LEVEL :') && !line.includes('QH :') && !line.includes('HERO :') && !line.includes('SKIN :') && !line.includes('BAN :') && !line.includes('EMAIL :') && !line.includes('SDT :') && !line.includes('CMND :') && !line.includes('AUTHEN :') && !line.includes('FB :') && !line.includes('SÒ :') && !line.includes('QUỐC GIA :') && !line.includes('LOGIN LẦN CUỐI :') && !line.includes('SS :') && !line.includes('SSS :') && !line.includes('ANIME :') && !line.includes('OTHER :') && !line.includes('TRẠNG THÁI :')) {
      const colonParts = line.split(':');
      if (colonParts.length >= 2) {
        return { username: colonParts[0].trim(), password: colonParts[1].trim(), type: 'simple' };
      }
    }

    // Full info format: result = username:password | NAME : xxx | RANK : xxx ...
    if (line.includes('result =') || line.includes('NAME :') || line.includes('RANK :')) {
      const info = {};
      let username = '', password = '', type = 'full';
      
      if (line.startsWith('result =')) {
        const afterResult = line.replace(/^result =/, '').trim();
        const parts = afterResult.split('|');
        const credentialPart = parts[0];
        
        // Extract username:password
        if (credentialPart.includes(':')) {
          const [user, pass] = credentialPart.split(':').map(s => s.trim());
          username = user;
          password = pass;
        }
        
        // Parse remaining fields
        const rest = parts.slice(1).join('|');
        const parsedInfo = parseInfoFields(rest);
        return { username, password, raw: line, type, ...parsedInfo };
      }
    }

    return null;
  }

  function parseInfoFields(text) {
    const info = {};
    
    const patterns = [
      { key: 'NAME', re: /NAME\s*:\s*([^\n|]+)/i },
      { key: 'RANK', re: /RANK\s*:\s*([^\n|]+)/i },
      { key: 'LEVEL', re: /LEVEL\s*:\s*(\d+)/i },
      { key: 'QH', re: /QH\s*:\s*(\d+)/i },
      { key: 'HERO', re: /HERO\s*:\s*(\d+)/i },
      { key: 'SKIN', re: /SKIN\s*:\s*(\d+)/i },
      { key: 'BAN', re: /BAN\s*:\s*(YES|NO|N\/A)/i },
      { key: 'EMAIL', re: /EMAIL\s*:\s*(YES|NO|ĐÃ XÁC THỰC|CHƯA XÁC THỰC|[^\n|]+)/i },
      { key: 'SDT', re: /SDT\s*:\s*(YES|NO|[^\n|]+)/i },
      { key: 'CMND', re: /CMND\s*:\s*(YES|NO|[^\n|]+)/i },
      { key: 'AUTHEN', re: /AUTHEN\s*:\s*(YES|NO|[^\n|]+)/i },
      { key: 'FB', re: /FB\s*:\s*(LIVE|DIE|[^\n|]+)/i },
      { key: 'SÒ', re: /SÒ\s*:\s*(\d+|[^\n|]+)/i },
      { key: 'QUỐC GIA', re: /QUỐC GIA\s*:\s*([^\n|]+)/i },
      { key: 'LOGIN LẦN CUỐI', re: /LOGIN LẦN CUỐI\s*:\s*([^\n|]+)/i },
      { key: 'SS', re: /SS\s*:\s*(\d+)\s*\[([^\]]+)\]/i },
      { key: 'SSS', re: /SSS\s*:\s*(\d+)\s*\[([^\]]*)\]/i },
      { key: 'ANIME', re: /ANIME\s*:\s*(\d+)\s*\[([^\]]*)\]/i },
      { key: 'OTHER', re: /OTHER\s*:\s*(\d+)\s*\[([^\]]*)\]/i },
      { key: 'TRẠNG THÁI', re: /TRẠNG THÁI\s*:\s*([^\n|]+)/i }
    ];

    for (const p of patterns) {
      const match = text.match(p.re);
      if (match) {
        if (p.key === 'SS' || p.key === 'SSS' || p.key === 'ANIME' || p.key === 'OTHER') {
          info[`${p.key}_count`] = parseInt(match[1]) || 0;
          info[`${p.key}_list`] = match[2] ? match[2].split(',').map(s => s.trim()).filter(Boolean) : [];
        } else {
          info[p.key] = match[1].trim();
        }
      }
    }

    return info;
  }

  // UI helpers
  function showCard() { document.getElementById('accountCard').classList.remove('hidden'); }
  function hideCard() { document.getElementById('accountCard').classList.add('hidden'); }
  function showState(id) {
    document.querySelectorAll('.state-message').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }

  // Create particles for hero section
  function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const particleCount = window.innerWidth < 768 ? 15 : 30;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 3 + 1;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 15 + 's';
      p.style.animationDuration = (Math.random() * 10 + 10) + 's';
      container.appendChild(p);
    }
  }

  // Data loading with retry - try multiple file patterns
  async function loadData() {
    // Try both naming patterns
    const patterns = [
      'data/acclq1.txt', 'data/acclq2.txt', 'data/acclq3.txt',
      'data/acclq_1.txt', 'data/acclq_2.txt', 'data/acclq_3.txt'
    ];
    const results = [];

    for (const fname of patterns) {
      try {
        const resp = await fetch(fname, { cache: 'no-store' });
        if (!resp.ok) continue;
        const text = await resp.text();
        if (text.trim()) {
          results.push(text);
          console.log(`Loaded ${fname}: ${text.split('\n').length} lines`);
        }
      } catch (e) {
        // File not found or error, continue to next pattern
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
    const lines = allText.split(/\r?\n/).filter(line => line.trim());
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
      filteredAccounts = allAccounts.filter(acc => acc.type === 'full');
    } else if (filter === 'partial') {
      filteredAccounts = allAccounts.filter(acc => acc.type === 'simple');
    }
  }

  function getRandom() {
    if (filteredAccounts.length === 0) return null;
    const idx = Math.floor(Math.random() * filteredAccounts.length);
    return filteredAccounts[idx];
  }

  // Render enhanced account card with all info
  function renderEnhancedAccount(acc) {
    if (!acc) {
      hideCard();
      showState('emptyState');
      document.getElementById('emptyState').innerText = 'Không có account phù hợp';
      return;
    }

    const cardBody = document.querySelector('.account-card .card-body');
    cardBody.innerHTML = '';

    // Credential section
    const credDiv = document.createElement('div');
    credDiv.className = 'credential-section';
    credDiv.innerHTML = `
      <div class="credential">
        <span class="neon-cyan">${acc.username}</span>
        <span class="separator">|</span>
        <span class="neon-purple">${acc.password}</span>
      </div>
    `;
    cardBody.appendChild(credDiv);

    // Info grid
    const grid = document.createElement('div');
    grid.className = 'info-grid';

    // Map of field -> label
    const fieldMap = [
      { key: 'NAME', label: 'Tên' },
      { key: 'RANK', label: 'Rank' },
      { key: 'LEVEL', label: 'Level' },
      { key: 'HERO', label: 'Hero' },
      { key: 'SKIN', label: 'Skin' },
      { key: 'BAN', label: 'BAN' },
      { key: 'EMAIL', label: 'Email' },
      { key: 'SDT', label: 'SDT' },
      { key: 'CMND', label: 'CMND' },
      { key: 'AUTHEN', label: 'Auth' },
      { key: 'FB', label: 'FB' },
      { key: 'SÒ', label: 'Sò' },
      { key: 'QUỐC GIA', label: 'Quốc gia' },
      { key: 'LOGIN LẦN CUỐI', label: 'Login cuối' },
      { key: 'SS_count', label: 'SS Count' },
      { key: 'SSS_count', label: 'SSS Count' },
      { key: 'ANIME_count', label: 'Anime' },
      { key: 'OTHER_count', label: 'Other' },
      { key: 'TRẠNG THÁI', label: 'Trạng thái' }
    ];

    fieldMap.forEach(field => {
      const val = acc[field.key];
      if (val === undefined || val === null) return;
      
      const item = document.createElement('div');
      item.className = 'info-item';
      item.innerHTML = `
        <span class="label">${field.label}:</span>
        <span class="value">${val}</span>
      `;
      grid.appendChild(item);
    });

    cardBody.appendChild(grid);

    // Skin lists
    if (acc.SS_list && acc.SS_list.length > 0) {
      const ssSection = document.createElement('div');
      ssSection.className = 'list-section';
      ssSection.innerHTML = `<div class="list-title">Skins SS (${acc.SS_list.length}):</div><div class="skin-list">${acc.SS_list.map(s => `<span class="skin-tag">${s}</span>`).join('')}</div>`;
      cardBody.appendChild(ssSection);
    }
    if (acc.SSS_list && acc.SSS_list.length > 0) {
      const sssSection = document.createElement('div');
      sssSection.className = 'list-section';
      sssSection.innerHTML = `<div class="list-title">Skins SSS (${acc.SSS_list.length}):</div><div class="skin-list">${acc.SSS_list.map(s => `<span class="skin-tag">${s}</span>`).join('')}</div>`;
      cardBody.appendChild(sssSection);
    }

    // Source
    const source = document.createElement('div');
    source.className = 'source';
    source.textContent = `Loại: ${acc.type}`;
    cardBody.appendChild(source);
  }

  function roll() {
    applyFilter();
    current = getRandom();
    renderEnhancedAccount(current);
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
  document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    loadData();
  });
  console.log('Lien Quan Account Share initialized');
})();