(() => {
  // State
  let allAccounts = [];
  let filteredAccounts = [];
  let current = null;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // Enhanced Parser - extract all fields
  function parseAccount(line) {
    line = line.trim();
    if (!line) return null;

    let username = '', password = '', raw = line, type = 'simple';
    
    // Check if it's a result line with full info
    if (line.startsWith('result =')) {
      type = 'full';
      const afterResult = line.replace(/^result\s*=\s*/, '').trim();
      // Split by | to get credential first, then rest
      const parts = afterResult.split('|');
      const credentialPart = parts[0];
      const rest = parts.slice(1).join('|');
      
      // Extract username:password
      const colonMatch = credentialPart.match(/^([^:]+):([^:]+)$/);
      if (colonMatch) {
        username = colonMatch[1].trim();
        password = colonMatch[2].trim();
      } else {
        // Fallback: try pipe
        const pipeMatch = credentialPart.split('|');
        if (pipeMatch.length >= 2) {
          username = pipeMatch[0].trim();
          password = pipeMatch[1].trim();
        }
      }
      
      // Parse all other fields from rest
      const info = parseInfoFields(rest);
      return { username, password, raw, type, ...info };
    } 
    else if (line.includes('|') && !line.includes(':')) {
      // Simple pipe format
      const parts = line.split('|');
      username = parts[0].trim();
      password = parts[1] ? parts[1].trim() : '';
      return { username, password, type: 'simple' };
    }
    else if (line.includes(':')) {
      // Colon format (fallback)
      const colonParts = line.split(':');
      username = colonParts[0].trim();
      password = colonParts[1] ? colonParts[1].trim() : '';
      return { username, password, raw: line, type: 'fallback' };
    }
    
    return null;
  }

  function parseInfoFields(text) {
    const info = {};
    
    // Pattern: FIELD : value (with optional brackets and content after brackets)
    const patterns = [
      { key: 'NAME', re: /NAME\s*:\s*([^\n|]+)/i },
      { key: 'RANK', re: /RANK\s*:\s*([^\n|]+)/i },
      { key: 'LEVEL', re: /LEVEL\s*:\s*(\d+)/i },
      { key: 'QH', re: /QH\s*:\s*(\d+)/i },
      { key: 'HERO', re: /HERO\s*:\s*(\d+)/i },
      { key: 'SKIN', re: /SKIN\s*:\s*(\d+)/i },
      { key: 'BAN', re: /BAN\s*:\s*(YES|NO|N/A|N\/A)/i },
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
    };

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
      filteredAccounts = allAccounts.filter(acc => acc.type === 'full' || acc.type === 'fallback');
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
      <div class="credential-line">
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
      { key: 'BAN', label: 'BAN', badge: true },
      { key: 'EMAIL', label: 'Email', badge: true },
      { key: 'SDT', label: 'SDT', badge: true },
      { key: 'CMND', label: 'CMND', badge: true },
      { key: 'AUTHEN', label: 'Auth', badge: true },
      { key: 'FB', label: 'FB', badge: true },
      { key: 'SÒ', label: 'Sò' },
      { key: 'QUỐC GIA', label: 'Quốc gia' },
      { key: 'LOGIN LẦN CUỐI', label: 'Login cuối' },
      { key: 'SS_count', label: 'SS Count' },
      { key: 'SSS_count', label: 'SSS Count' },
      { key: 'ANIME_count', label: 'Anime' },
      { key: 'OTHER_count', label: 'Other' },
      { key: 'TRẠNG THÁI', label: 'Trạng thái', badge: true }
    ];

    fieldMap.forEach(field => {
      const val = acc[field.key];
      if (val === undefined || val === '' || val === null) return;
      
      const item = document.createElement('div');
      item.className = 'info-item';
      
      if (field.badge) {
        item.innerHTML = `
          <span class="label">${field.label}:</span>
          <span class="badge ${getBadgeClass(val, field.key)}">${val}</span>
        `;
      } else {
        item.innerHTML = `
          <span class="label">${field.label}:</span>
          <span class="value">${val}</span>
        `;
      }
      
      grid.appendChild(item);
    });

    cardBody.appendChild(grid);

    // Skin lists (if any)
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

    showCard();
  }

  function getBadgeClass(value, key) {
    const v = String(value).toUpperCase();
    if (key === 'BAN') {
      return v === 'YES' ? 'badge-danger' : 'badge-success';
    }
    if (key === 'EMAIL' || key === 'SDT' || key === 'CMND') {
      return (v === 'YES' || v.includes('ĐÃ XÁC THỰC')) ? 'badge-success' : 'badge-warning';
    }
    if (key === 'FB') {
      return v === 'LIVE' ? 'badge-success' : 'badge-danger';
    }
    if (key === 'TRẠNG THÁI') {
      return v.includes('FULL') ? 'badge-primary' : 'badge-secondary';
    }
    return 'badge-secondary';
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
  document.getElementById('rollBtnMain').addEventListener('click', roll);
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