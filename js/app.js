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
      return { username: parts[0].trim(), password: parts[1].trim(), type: 'simple' };
    }

    if (line.includes(':') && (line.includes('result =') || line.includes('NAME :') || line.includes('RANK :') || line.includes('LEVEL :') || line.includes('QH :') || line.includes('HERO :') || line.includes('SKIN :') || line.includes('BAN :') || line.includes('EMAIL :') || line.includes('SDT :') || line.includes('CMND :') || line.includes('AUTHEN :') || line.includes('FB :') || line.includes('SÒ :') || line.includes('QUỐC GIA :') || line.includes('LOGIN LẦN CUỐI :') || line.includes('SS :') || line.includes('SSS :') || line.includes('ANIME :') || line.includes('OTHER :') || line.includes('TRẠNG THÁI :')) {
      const info = {};
      
      // Pattern for full info
      if (line.includes('result =')) {
        const afterResult = line.replace(/^result =/, '').trim();
        const parts = afterResult.split('|');
        const credentialPart = parts[0];
        const rest = parts.slice(1).join('|');
        
        // Extract username:password
        const colonMatch = credentialPart.match(/^([^:]+):([^:]+)$/);
        if (colonMatch) {
          const [_, username, password] = colonMatch;
          return { username, password, type: 'full' };
        }
      } else {
        // Pattern for simple pipe format
        const parts = line.split('|');
        if (parts.length >= 2) {
          const [username, password] = parts.slice(0, 2);
          return { username, password, type: 'simple' };
        }
      }
    }

    return null;
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

  // Render enhanced account card with grid layout and badges
  function renderEnhancedAccount(acc) {
    if (!acc) {
      hideCard();
      showState('emptyState');
      document.getElementById('emptyState').innerText = 'Không có account phù hợp';
      return;
    }

    const cardBody = document.querySelector('.card-body');
    cardBody.innerHTML = '';

    // Credential section
    const credDiv = document.createElement('div');
    credDiv.className = 'credential-section';
    credDiv.innerHTML = `
      <div class="card-header">
        <span class="card-badge">ACCOUNT</span>
      </div>
      <div class="card-body">
        <div class="credential">
          <span class="neon-cyan">${acc.username}</span>
          <span class="separator">|</span>
          <span class="neon-purple">${acc.password}</span>
        </div>
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
      { key: 'EMAIL', label: 'EMAIL' },
      { key: 'SDT', label: 'SDT' },
      { key: 'CMND', label: 'CMND' },
      { key: 'AUTHEN', label: 'AUTHEN' },
      { key: 'FB', label: 'FB' },
      { key: 'SÒ', label: 'SÒ' },
      { key: 'QUỐC GIA', label: 'Quốc gia' },
      { key: 'LOGIN LẦN CUỐI', label: 'Login cuối' },
      { key: 'SS', label: 'SS' },
      { key: 'SSS', label: 'SSS' },
      { key: 'ANIME', label: 'Anime' },
      { key: 'OTHER', label: 'Other' },
      { key: 'TRẠNG THÁI', label: 'Trạng thái' }
    ];

    fieldMap.forEach(field => {
      const val = acc[field.key];
      if (val === undefined || val === null) return;
      
      const item = document.createElement('div');
      item.className = 'info-item';
      
      if (field.key === 'BAN') {
        item.innerHTML = `
          <span class="label">${field.label}:</span>
          <span class="value">${val}</span>
        `;
      } else {
        item.innerHTML = `
          <span class="label">${field.label}:</span>
          <span class="value">${val}</span>
        `;
      }
      
      grid.appendChild(item);
    });

    // Badges
    const badgeDiv = document.createElement('div');
    badgeDiv.className = 'info-grid';
    badgeDiv.innerHTML = `
      <div class="badge-section">
        <span class="badge">${acc.type}</span>
      </div>
    `;

    // Add badge section
    cardBody.appendChild(grid);
    cardBody.appendChild(badgeDiv);

    // Source
    const source = document.createElement('div');
    source.className = 'source';
    source.innerHTML = `Loại: ${acc.type}`;
    cardBody.appendChild(source);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = `Liên Quân Account Share | Powered by OpenClaw`; 
    cardBody.appendChild(footer);
  }

  // UI helpers
  function showCard() { document.getElementById('accountCard').classList.remove('hidden'); }
  function hideCard() { document.getElementById('accountCard').classList.add('hidden'); }
  function showState(id) { document.getElementById(id).classList.remove('hidden'); }
  function hideState(id) { document.getElementById(id).classList.add('hidden'); }

  // Events
  document.getElementById('rollBtn').addEventListener('click', roll);
  document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
  document.querySelectorAll('.filter-label').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('.filter-label').forEach(l => l.classList.remove('active'));
      label.classList.add('active');
      applyFilter();
    });
  });

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    loadData();
  });
  console.log('Lien Quan Account Share initialized');
})();

// Export for testing
if (typeof window !== 'undefined') {
  window.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof global !== 'undefined') {
  global.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof window !== 'undefined') {
  window.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof global !== 'undefined') {
  global.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof window !== 'undefined') {
  window.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof global !== 'undefined') {
  global.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof self !== 'undefined') {
  self.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  module.exports = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof define === 'function' && define.amd) {
  define('lienquan-accounts', [], () => ({
    loadData,
    renderEnhancedAccount
  }));
}

// Export for testing
if (typeof window !== 'undefined') {
  window.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof global !== 'undefined') {
  global.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof self !== 'undefined') {
  self.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof window !== 'undefined') {
  window.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof global !== 'undefined') {
  global.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof self !== 'undefined') {
  self.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof require !== 'undefined' && require) {
  require('./app.js');
}

// Export for testing
if (typeof define === 'function' && define.amd) {
  define('lienquan-accounts', [], () => ({
    loadData,
    renderEnhancedAccount
  }));
}

// Export for testing
if (typeof window !== 'undefined') {
  window.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof global !== 'undefined') {
  global.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports) {
  exports.LienQuanAccountShare = {
    loadData,
    renderEnhancedAccount
  };
}

// Export for testing
if (typeof exports !== 'undefined' && exports)