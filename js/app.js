:root {
  --primary: #06b6d4;
  --secondary: #a855f7;
  --bg: #030712;
  --card-bg: rgba(17, 24, 39, 0.7);
  --border: rgba(255, 255, 255, 0.1);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: var(--bg);
  color: #f8fafc;
  line-height: 1.6;
  overflow-x: hidden;
}

/* Hero & Background */
.hero {
  position: relative;
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, #1e1b4b 0%, #030712 100%);
  z-index: -1;
}

.hero-title {
  font-size: clamp(2.5rem, 8vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.hero-title span {
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Glass Card */
.controls-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 2rem;
  margin-top: -100px;
  position: relative;
  z-index: 20;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
}

/* Filters */
.filter-group {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 2rem;
}

.filter-chip input { display: none; }
.filter-chip span {
  padding: 8px 20px;
  border-radius: 99px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: 0.3s;
  font-size: 0.9rem;
}

.filter-chip input:checked + span {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
}

/* Buttons */
.btn-primary, .btn-roll {
  background: linear-gradient(90deg, var(--primary), var(--secondary));
  border: none;
  padding: 16px 40px;
  border-radius: 14px;
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-roll:hover { transform: scale(1.05); box-shadow: 0 10px 25px rgba(168, 85, 247, 0.4); }

/* Account Card */
.account-card {
  margin-top: 2rem;
  background: #0f172a;
  border-radius: 24px;
  padding: 2.5rem;
  border: 1px solid var(--primary);
  position: relative;
  overflow: hidden;
  animation: slideUp 0.5s ease-out;
}

.credential-box {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.8rem;
  text-align: center;
  padding: 1.5rem;
  background: rgba(0,0,0,0.3);
  border-radius: 16px;
  margin-bottom: 2rem;
  word-break: break-all;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 15px;
}

.info-item {
  background: rgba(255,255,255,0.03);
  padding: 10px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.info-item .label { color: #94a3b8; display: block; }
.info-item .value { color: var(--primary); font-weight: 600; }

/* Skins */
.skin-tag {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(168, 85, 247, 0.2);
  border: 1px solid var(--secondary);
  border-radius: 6px;
  font-size: 0.75rem;
  margin: 4px;
}

/* Animations */
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.hidden { display: none; }

/* Responsive */
@media (max-width: 640px) {
  .hero-title { font-size: 2.5rem; }
  .controls-card { margin-top: -50px; padding: 1.5rem; }
  .credential-box { font-size: 1.2rem; }
}
