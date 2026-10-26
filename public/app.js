/* ═══════════════════════════════════════════════════════════════════════════════
   APEXDRIVE — High-Performance Auto Parts & Operations Telemetry Engine
   ═══════════════════════════════════════════════════════════════════════════════ */

// ─── State ──────────────────────────────────────────────────────────────────────
let dashboardData = null;
let charts = {};
let chatHistory = [];
let currentPage = 'dashboard';
let revenueView = 'monthly';
let activeCatalogFilter = 'All';
let catalogSearchQuery = '';

// ─── Chart.js Global Config & Custom Radiant Styling ────────────────────────────
Chart.defaults.font.family = "'Outfit', 'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#94a3b8';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13, 17, 26, 0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 242, 254, 0.3)';
Chart.defaults.plugins.tooltip.borderWidth = 1.5;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.titleFont = { weight: '800', size: 12 };
Chart.defaults.plugins.tooltip.bodyFont = { size: 12, family: "'JetBrains Mono', monospace" };
Chart.defaults.elements.point.radius = 0;
Chart.defaults.elements.point.hoverRadius = 7;
Chart.defaults.elements.point.hoverBorderWidth = 2.5;
Chart.defaults.elements.line.tension = 0.38;
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.08)';

// High-Octane Palette
const COLORS = {
  cyan: '#00f2fe',
  blue: '#3b82f6',
  orange: '#ff6b00',
  amber: '#ffb800',
  green: '#00e676',
  red: '#ff3366',
  purple: '#8b5cf6',
  palette: [
    '#00f2fe', // Electric Cyan
    '#ff6b00', // Racing Orange
    '#00e676', // Neon Mint
    '#ffb800', // Racing Amber
    '#3b82f6', // Cobalt Blue
    '#ff3366', // Brembo Red
    '#8b5cf6', // Deep Purple
    '#14b8a6'  // Seafoam
  ]
};

// ─── Initialize ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initParticles();
  initNotifications();
  setCurrentDate();
  updatePageBackground('dashboard');
  await loadDashboard();
  checkStatus();

  // Handle URL deep-linking for multi-session pop-out tabs
  const params = new URLSearchParams(window.location.search);
  const hubParam = params.get('hub');
  const skuParam = params.get('sku');
  const pageParam = params.get('page');

  if (hubParam || skuParam || pageParam) {
    // Auto-enter dashboard directly if deep-linked
    const splash = document.getElementById('page-splash');
    const dashboard = document.getElementById('page-dashboard');
    if (splash) splash.classList.remove('active');
    if (dashboard) dashboard.classList.add('active');

    if (hubParam) {
      openHubSession(hubParam);
    } else if (skuParam) {
      openSkuSession(skuParam);
    } else if (pageParam) {
      navigateTo(pageParam);
    }
  }
});

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  }
}

// ─── Particle Canvas Engine (Cyan & Amber Physics) ──────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const count = Math.min(Math.floor((width * height) / 24000), 50);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 1.8 + 0.8,
      isCyan: Math.random() > 0.4,
      alpha: Math.random() * 0.4 + 0.2
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.isCyan
        ? `rgba(0, 242, 254, ${p.alpha})`
        : `rgba(255, 107, 0, ${p.alpha})`;
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = p.isCyan
            ? `rgba(0, 242, 254, ${0.14 * (1 - dist / 110)})`
            : `rgba(255, 107, 0, ${0.14 * (1 - dist / 110)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// ─── Page Transitions ───────────────────────────────────────────────────────────
function enterDashboard() {
  const splash = document.getElementById('page-splash');
  const dashboard = document.getElementById('page-dashboard');

  splash.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  splash.style.opacity = '0';
  splash.style.transform = 'scale(0.96)';

  setTimeout(() => {
    splash.classList.remove('active');
    dashboard.classList.add('active');
    navigateTo('dashboard');
  }, 350);
}

// ─── Multi-Page Router & Page Titles ──────────────────────────────────────────
const PAGE_TITLES = {
  'dashboard': 'Overview Deck',
  'revenue': 'Fleet Revenue',
  'products': 'Parts Catalog & SKUs',
  'customers': 'Garage & Fleet Accounts',
  'regions': 'Hub Telemetry',
  'stores': 'Warehouses',
  'trends': 'Intake Trends',
  'about': 'Who We Are',
  'admin': 'Administration',
  'trends-intel': 'Business Trends',
  'customer-behavior': 'Customer Behaviour',
  'hub-detail': 'Hub Drilldown',
  'sku-detail': 'SKU Engineering Drilldown',
  'ai-chat': 'ApexGear AI Advisor',
  'forecast': 'Demand Forecast'
};

// ─── Deep Drilldown Navigation ──────────────────────────────────────────────────
function openHubSession(hubCode) {
  renderHubDetail(hubCode);
  navigateTo('hub-detail');
}

function openSkuSession(skuCode) {
  renderSkuDetail(skuCode);
  navigateTo('sku-detail');
}

function navigateTo(pageId) {
  currentPage = pageId;
  updatePageBackground(pageId);

  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
    if (el.getAttribute('data-page') === pageId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  // Switch active sub-page
  document.querySelectorAll('.sub-page').forEach(page => page.classList.remove('active'));
  const targetSubpage = document.getElementById(`subpage-${pageId}`);
  if (targetSubpage) {
    targetSubpage.classList.add('active');
  }

  // Update Breadcrumb
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb) {
    if (pageId === 'dashboard') {
      breadcrumb.innerHTML = `<span class="breadcrumb-current">Overview Deck</span>`;
    } else {
      const title = PAGE_TITLES[pageId] || pageId;
      breadcrumb.innerHTML = `
        <span class="breadcrumb-item" onclick="navigateTo('dashboard')">Overview Deck</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">${title}</span>
      `;
    }
  }

  // Mobile sidebar auto-close
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('open');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (!dashboardData) return;
  setTimeout(() => {
    renderViewContent(pageId);
  }, 40);
}

function renderViewContent(pageId) {
  switch (pageId) {
    case 'dashboard':
      renderKPIs();
      renderRevenueChart();
      renderCategoryDoughnut();
      renderTrafficChart();
      renderStoreChartHome();
      renderTopProductsPreview();
      break;

    case 'revenue':
      renderRevenueKpis();
      renderRevenueDetailChart();
      renderDailySalesChart();
      renderRevenueByCatChart();
      break;

    case 'products':
      renderProductCatChart();
      renderScatterChart();
      renderProductsTable('revenue');
      break;

    case 'customers':
      renderCustomerKpis();
      renderSegments();
      renderSegmentPieChart();
      renderSegmentBarChart();
      break;

    case 'regions':
      renderRegionCards();
      renderRegionBarChart();
      renderRegionRadarChart();
      break;

    case 'stores':
      renderStoreCards();
      renderStoreDetailChart();
      break;

    case 'trends':
      renderTrafficDetailChart();
      renderTrendDailyChart();
      renderGrowthChart();
      break;

    case 'about':
    case 'admin':
    case 'trends-intel':
    case 'customer-behavior':
      // Static rich HTML content
      break;

    case 'ai-chat':
      const chatContainer = document.getElementById('chatMessages');
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
      break;

    case 'forecast':
      renderForecastBaseChart();
      break;
  }
}

// ─── Drilldown Content Renderers ────────────────────────────────────────────────
let currentInspectedHub = null;
let currentInspectedSku = null;

function renderHubDetail(hubCode) {
  if (!dashboardData || !dashboardData.regionData) return;
  const hub = dashboardData.regionData.find(r => r.hubCode === hubCode) || dashboardData.regionData[0];
  currentInspectedHub = hub;

  const codeEl = document.getElementById('hubHeroCode');
  const nameEl = document.getElementById('hubHeroName');
  const regionEl = document.getElementById('hubHeroRegion');
  const revEl = document.getElementById('hubHeroRevenue');

  if (codeEl) codeEl.textContent = hub.hubCode;
  if (nameEl) nameEl.textContent = hub.hubName;
  if (regionEl) regionEl.textContent = `${hub.region} • Managed by ${hub.manager}`;
  if (revEl) revEl.textContent = `$${(hub.revenue / 1000).toFixed(1)}K`;

  const specsGrid = document.getElementById('hubSpecsGrid');
  if (specsGrid) {
    specsGrid.innerHTML = `
      <div class="spec-box">
        <div class="spec-box-label">Orders Throughput</div>
        <div class="spec-box-val" style="color:var(--cyan);">${hub.orders.toLocaleString()}</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Wholesale POs</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Dispatch Speed</div>
        <div class="spec-box-val" style="color:var(--green);">${hub.fulfillmentSpeed} Days</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Same-day cut-off 4PM</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Garages Serviced</div>
        <div class="spec-box-val">${hub.activeStores || 48} Garages</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Regional Dealer Network</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Quality Score</div>
        <div class="spec-box-val" style="color:var(--amber);">${hub.customerSatisfaction} ⭐</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Dealer Satisfaction</div>
      </div>
    `;
  }

  const telBody = document.getElementById('hubTelemetryBody');
  if (telBody) {
    telBody.innerHTML = `
      <div class="intel-grid" style="margin-bottom:0;">
        <div style="background:var(--bg-1);padding:18px;border-radius:var(--radius-md);border:1px solid var(--border-1);">
          <div style="font-size:0.8rem;font-weight:800;color:var(--cyan);margin-bottom:8px;">AUTOMATED DOCKING STATUS</div>
          <p style="font-size:0.85rem;color:var(--text-2);line-height:1.5;">Bays 1-8 active for pallet dispatch. Real-time conveyor sortation operating at 99.1% efficiency. Night hauler pickups scheduled at 21:00 EST.</p>
        </div>
        <div style="background:var(--bg-1);padding:18px;border-radius:var(--radius-md);border:1px solid var(--border-1);">
          <div style="font-size:0.8rem;font-weight:800;color:var(--orange);margin-bottom:8px;">HIGH-PRIORITY FLEET DISPATCH</div>
          <p style="font-size:0.85rem;color:var(--text-2);line-height:1.5;">Emergency brake and coilover restock orders for commercial dealerships are routed with expedited 24-hr courier delivery guarantee.</p>
        </div>
      </div>
    `;
  }
}

function renderSkuDetail(skuCode) {
  if (!dashboardData || !dashboardData.topProducts) return;
  const p = dashboardData.topProducts.find(item => item.sku === skuCode) || dashboardData.topProducts[0];
  currentInspectedSku = p;

  const tagEl = document.getElementById('skuHeroTag');
  const nameEl = document.getElementById('skuHeroName');
  const fitmentEl = document.getElementById('skuHeroFitment');
  const priceEl = document.getElementById('skuHeroPrice');

  if (tagEl) tagEl.textContent = p.sku;
  if (nameEl) nameEl.textContent = p.name;
  if (fitmentEl) fitmentEl.textContent = `OEM Fitment: ${p.fitment} • Brand: ${p.brand} • Category: ${p.category}`;
  if (priceEl) priceEl.textContent = `$${p.price.toLocaleString()}`;

  const specsGrid = document.getElementById('skuSpecsGrid');
  if (specsGrid) {
    specsGrid.innerHTML = `
      <div class="spec-box">
        <div class="spec-box-label">Gross Revenue</div>
        <div class="spec-box-val" style="color:var(--cyan);">$${p.revenue.toLocaleString()}</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Wholesale + Retail</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Units Dispatched</div>
        <div class="spec-box-val">${p.units.toLocaleString()} units</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">FY2026 Volume</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Total Stock Count</div>
        <div class="spec-box-val" style="color:var(--green);">${p.stock} in Stock</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Across all 5 Hubs</div>
      </div>
      <div class="spec-box">
        <div class="spec-box-label">Warranty RMA Rate</div>
        <div class="spec-box-val" style="color:${p.warrantyClaim < 1.0 ? 'var(--green)' : 'var(--orange)'};">${p.warrantyClaim}%</div>
        <div style="font-size:0.75rem;color:var(--text-3);margin-top:4px;">Motorsport Tolerance</div>
      </div>
    `;
  }

  const stockBody = document.getElementById('skuHubStockBody');
  if (stockBody && dashboardData.regionData) {
    const hubStock = [
      { hub: 'Detroit DTW', stock: Math.round(p.stock * 0.35), status: 'High Stock' },
      { hub: 'Dallas DFW', stock: Math.round(p.stock * 0.25), status: 'Available' },
      { hub: 'Los Angeles LAX', stock: Math.round(p.stock * 0.20), status: 'Available' },
      { hub: 'Atlanta ATL', stock: Math.round(p.stock * 0.12), status: 'Low Stock' },
      { hub: 'Frankfurt FRA', stock: Math.max(1, Math.round(p.stock * 0.08)), status: 'Import Buffer' }
    ];

    stockBody.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Hub Depot</th>
              <th>Available Units</th>
              <th>Allocation Status</th>
              <th>Courier Dispatch SLA</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${hubStock.map(h => `
              <tr>
                <td><strong>${h.hub}</strong></td>
                <td style="font-family:'JetBrains Mono';font-weight:700;">${h.stock} units</td>
                <td><span class="table-badge">${h.status}</span></td>
                <td><span style="color:var(--green);font-size:0.82rem;"><i class="ri-flashlight-line"></i> Same-Day Priority</span></td>
                <td><button class="btn-ghost" style="padding:4px 10px;font-size:0.72rem;" onclick="showToast('Dispatch allocated from ${h.hub}!')">Reserve</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function queryAiAboutHub() {
  if (!currentInspectedHub) return;
  navigateTo('ai-chat');
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = `Analyze operations at ${currentInspectedHub.hubName} (${currentInspectedHub.hubCode}): $${(currentInspectedHub.revenue / 1000).toFixed(1)}K revenue, ${currentInspectedHub.fulfillmentSpeed}d fulfillment speed. What are the best optimization steps?`;
    sendChat();
  }
}

function queryAiAboutSku() {
  if (!currentInspectedSku) return;
  navigateTo('ai-chat');
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = `Provide engineering compatibility, fleet demand, and restocking guidance for SKU ${currentInspectedSku.sku} (${currentInspectedSku.name}) priced at $${currentInspectedSku.price}.`;
    sendChat();
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ─── Data API ───────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    dashboardData = await res.json();
    renderViewContent(currentPage);
    getQuickInsight();
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

async function refreshData() {
  try {
    showToast('Refreshing Auto Parts Telemetry...');
    const res = await fetch('/api/refresh', { method: 'POST' });
    dashboardData = await res.json();
    destroyAllCharts();
    renderViewContent(currentPage);
    getQuickInsight();
    showToast('Telemetry updated across all 5 hubs! 🏎️');
  } catch (err) {
    console.error('Refresh failed:', err);
    showToast('Failed to refresh data');
  }
}

async function checkStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const statusText = document.querySelector('.ai-status span');
    const statusDot = document.querySelector('.ai-status-dot');

    if (statusText && statusDot) {
      if (data.hasGroqKey) {
        statusText.textContent = `Groq LPU Active (${data.model || 'Connected'})`;
        statusDot.style.background = 'var(--green)';
      } else {
        statusText.textContent = 'Hybrid Telemetry Ready';
        statusDot.style.background = 'var(--cyan)';
      }
    }
  } catch (e) {
    console.warn('Status check failed:', e);
  }
}

// ─── Chart Color & Gradient Utilities (Vibrant High-Contrast) ───────────────────
function createBarGradient(ctx, color1, color2) {
  if (!ctx || !ctx.canvas) return color1;
  const h = ctx.canvas.clientHeight || ctx.canvas.height || 300;
  if (h <= 0) return color1;
  try {
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  } catch (e) {
    return color1;
  }
}

function createAreaGradient(ctx, hex, alphaTop = 0.35, alphaBottom = 0) {
  if (!ctx || !ctx.canvas) return hex;
  const h = ctx.canvas.clientHeight || ctx.canvas.height || 300;
  if (h <= 0) return hex;
  try {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, hexToRgba(hex, alphaTop));
    gradient.addColorStop(0.6, hexToRgba(hex, alphaTop * 0.3));
    gradient.addColorStop(1, hexToRgba(hex, alphaBottom));
    return gradient;
  } catch (e) {
    return hex;
  }
}

function hexToRgba(hex, alpha) {
  const c = hex.replace('#', '');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function destroyAllCharts() {
  Object.keys(charts).forEach(key => {
    if (charts[key] && charts[key].destroy) {
      charts[key].destroy();
    }
  });
  charts = {};
}

// ─── 1. Overview Deck Visuals ───────────────────────────────────────────────────
function renderKPIs() {
  const grid = document.getElementById('kpiGrid');
  if (!grid || !dashboardData) return;
  const d = dashboardData.kpis;

  const kpis = [
    {
      label: 'Gross Fleet Revenue',
      value: `$${(d.totalRevenue / 1000).toFixed(1)}K`,
      change: `+${d.revenueGrowth}% YoY`,
      isUp: true,
      sub: '5 distribution hubs active',
      icon: '<i class="ri-funds-box-line"></i>',
      grad: 'var(--grad-cyan)',
      target: 'revenue'
    },
    {
      label: 'Wholesale Orders Dispatched',
      value: d.totalOrders.toLocaleString(),
      change: '+16.8%',
      isUp: true,
      sub: '3,840 fleet purchase orders',
      icon: '<i class="ri-truck-line"></i>',
      grad: 'var(--grad-orange)',
      target: 'revenue'
    },
    {
      label: 'Average Order Value (AOV)',
      value: `$${d.avgOrderValue}`,
      change: '+9.4%',
      isUp: true,
      sub: 'avg ticket across garages',
      icon: '<i class="ri-tools-fill"></i>',
      grad: 'var(--grad-green)',
      target: 'products'
    },
    {
      label: 'Commercial Fleet Retention',
      value: `${d.customerRetention}%`,
      change: '+4.2%',
      isUp: true,
      sub: '3,110 active speedshops',
      icon: '<i class="ri-shield-check-fill"></i>',
      grad: 'var(--grad-4)',
      target: 'customers'
    }
  ];

  grid.innerHTML = kpis.map(kpi => `
    <div class="kpi-card" style="--kpi-grad: ${kpi.grad}" onclick="navigateTo('${kpi.target}')">
      <div class="kpi-top">
        <div class="kpi-icon">${kpi.icon}</div>
        <span class="kpi-change ${kpi.isUp ? 'up' : 'down'}">
          <i class="${kpi.isUp ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}"></i> ${kpi.change}
        </span>
      </div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-value">${kpi.value}</div>
      <div class="kpi-sub">${kpi.sub}</div>
    </div>
  `).join('');
}

function renderRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.revenueHome) charts.revenueHome.destroy();

  charts.revenueHome = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dashboardData.months,
      datasets: [
        {
          label: 'FY2026 Revenue ($)',
          data: dashboardData.monthlyRevenue,
          borderColor: COLORS.cyan,
          backgroundColor: createAreaGradient(ctx, COLORS.cyan, 0.35),
          fill: true,
          borderWidth: 3,
          pointBackgroundColor: COLORS.cyan,
          pointBorderColor: '#080a10',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7
        },
        {
          label: 'FY2025 Prior ($)',
          data: dashboardData.prevYearRevenue,
          borderColor: 'rgba(255, 107, 0, 0.55)',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        y: { ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` }, beginAtZero: false }
      }
    }
  });
}

function renderCategoryDoughnut() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.categoryDoughnut) charts.categoryDoughnut.destroy();

  const sorted = [...dashboardData.categoryData].sort((a, b) => b.revenue - a.revenue);
  const total = sorted.reduce((sum, c) => sum + c.revenue, 0);

  charts.categoryDoughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: sorted.map(c => c.name),
      datasets: [{
        data: sorted.map(c => c.revenue),
        backgroundColor: COLORS.palette,
        borderColor: '#0d111a',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'right', labels: { padding: 12, boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => ` $${ctx.parsed.toLocaleString()} (${((ctx.parsed / total) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

// Hourly order intake heatmap (bars that POP with life!)
function renderTrafficChart() {
  const canvas = document.getElementById('trafficChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.trafficHome) charts.trafficHome.destroy();

  const maxVal = Math.max(...dashboardData.hourlyTraffic.map(h => h.visitors));

  charts.trafficHome = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dashboardData.hourlyTraffic.map(h => `${h.hour}h`),
      datasets: [{
        label: 'Order Telemetry',
        data: dashboardData.hourlyTraffic.map(h => h.visitors),
        backgroundColor: dashboardData.hourlyTraffic.map(h => {
          const ratio = h.visitors / maxVal;
          if (ratio > 0.8) return createBarGradient(ctx, '#00f2fe', '#3b82f6');
          if (ratio > 0.5) return createBarGradient(ctx, '#ff6b00', '#ffb800');
          return 'rgba(0, 242, 254, 0.45)';
        }),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} commercial orders` } }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 8 } },
        y: { beginAtZero: true, ticks: { callback: v => v } }
      }
    }
  });
}

// Warehouse Hubs Bar Chart with Glowing Gradients
function renderStoreChartHome() {
  const canvas = document.getElementById('storeChartHome');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.storeChartHome) charts.storeChartHome.destroy();

  charts.storeChartHome = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dashboardData.storeData.map(s => s.code),
      datasets: [
        {
          label: 'Throughput Revenue ($)',
          data: dashboardData.storeData.map(s => s.revenue),
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return '#ff6b00';
            const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            g.addColorStop(0, '#ff6b00');
            g.addColorStop(1, '#ffb800');
            return g;
          },
          borderColor: '#ff6b00',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
          yAxisID: 'y'
        },
        {
          label: 'On-Time Dispatch %',
          data: dashboardData.storeData.map(s => s.onTimeDelivery),
          type: 'line',
          borderColor: COLORS.cyan,
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          yAxisID: 'y1',
          pointRadius: 4,
          pointBackgroundColor: COLORS.cyan
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { position: 'top', align: 'end' } },
      scales: {
        y: { position: 'left', beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } },
        y1: { position: 'right', min: 85, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: v => `${v}%` } }
      }
    }
  });
}

function renderTopProductsPreview() {
  const container = document.getElementById('topProductsPreview');
  if (!container || !dashboardData) return;
  const top5 = dashboardData.topProducts.slice(0, 5);
  const maxRev = Math.max(...top5.map(p => p.revenue));

  container.innerHTML = top5.map((p, idx) => {
    const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-n';
    const percent = ((p.revenue / maxRev) * 100).toFixed(0);

    return `
      <div class="product-row" onclick="openSkuSession('${p.sku}')" title="Click to open SKU Multi-Session Tab">
        <div class="product-rank ${rankClass}">#${idx + 1}</div>
        <div class="product-info">
          <div class="product-name">
            <span class="sku-tag">${p.sku}</span> ${p.name}
          </div>
          <div class="product-cat">${p.brand} • ${p.category} • Fitment: <strong>${p.fitment}</strong></div>
        </div>
        <div class="product-bar-wrap">
          <div class="product-bar-fill" style="width: ${percent}%"></div>
        </div>
        <div class="product-rev">$${p.revenue.toLocaleString()}</div>
      </div>
    `;
  }).join('');
}

// ─── 2. Revenue Analytics Page ──────────────────────────────────────────────────
function renderRevenueKpis() {
  const container = document.getElementById('revenueKpis');
  if (!container || !dashboardData) return;
  const d = dashboardData.kpis;

  const items = [
    { label: 'Annual Aftermarket Gross', val: `$${d.totalRevenue.toLocaleString()}`, change: `+${d.revenueGrowth}% YoY`, grad: 'var(--grad-cyan)' },
    { label: 'Monthly Wholesale Run Rate', val: `$${Math.round(d.totalRevenue / 12).toLocaleString()}/mo`, change: '+12.6% MoM', grad: 'var(--grad-orange)' },
    { label: 'Operating Gross Margin', val: `${d.grossMargin}%`, change: '+4.8% YoY', grad: 'var(--grad-green)' }
  ];

  container.innerHTML = items.map(item => `
    <div class="kpi-card" style="--kpi-grad: ${item.grad}">
      <div class="kpi-label">${item.label}</div>
      <div class="kpi-value">${item.val}</div>
      <span class="kpi-change up"><i class="ri-arrow-up-line"></i> ${item.change}</span>
    </div>
  `).join('');
}

function renderRevenueDetailChart() {
  const canvas = document.getElementById('revenueDetailChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.revenueDetail) charts.revenueDetail.destroy();

  let dataCurr = dashboardData.monthlyRevenue;
  let dataPrev = dashboardData.prevYearRevenue;

  if (revenueView === 'cumulative') {
    let accCurr = 0;
    dataCurr = dataCurr.map(v => accCurr += v);
    let accPrev = 0;
    dataPrev = dataPrev.map(v => accPrev += v);
  }

  charts.revenueDetail = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dashboardData.months,
      datasets: [
        {
          label: 'FY2026 Auto Revenue ($)',
          data: dataCurr,
          borderColor: COLORS.cyan,
          backgroundColor: createAreaGradient(ctx, COLORS.cyan, 0.38),
          fill: true,
          borderWidth: 3.5,
          pointBackgroundColor: COLORS.cyan,
          pointBorderColor: '#080a10',
          pointRadius: 4.5,
          pointHoverRadius: 8
        },
        {
          label: 'FY2025 Benchmark ($)',
          data: dataPrev,
          borderColor: 'rgba(255, 107, 0, 0.6)',
          backgroundColor: 'transparent',
          borderWidth: 2.2,
          borderDash: [6, 4],
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { position: 'top', align: 'end' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        y: { ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

function setRevenueView(view, btn) {
  revenueView = view;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderRevenueDetailChart();
}

function renderDailySalesChart() {
  const canvas = document.getElementById('dailySalesChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.dailySales) charts.dailySales.destroy();

  charts.dailySales = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dashboardData.dailySales.map(d => `D${d.day}`),
      datasets: [{
        label: 'Invoiced Sales ($)',
        data: dashboardData.dailySales.map(d => d.sales),
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#00f2fe';
          const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          g.addColorStop(0, '#0088ff');
          g.addColorStop(1, '#00f2fe');
          return g;
        },
        borderColor: '#00f2fe',
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `Sales: $${ctx.parsed.y.toLocaleString()}` } }
      },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 10 } },
        y: { beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

function renderRevenueByCatChart() {
  const canvas = document.getElementById('revenueByCatChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.revenueByCat) charts.revenueByCat.destroy();

  const sorted = [...dashboardData.categoryData].sort((a, b) => b.revenue - a.revenue);

  charts.revenueByCat = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(c => c.name),
      datasets: [{
        label: 'Revenue',
        data: sorted.map(c => c.revenue),
        backgroundColor: [
          '#00f2fe', '#ff6b00', '#00e676', '#ffb800',
          '#3b82f6', '#ff3366', '#8b5cf6', '#14b8a6'
        ],
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.x.toLocaleString()}` } }
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

// ─── 3. Parts Catalog & Leaderboard ─────────────────────────────────────────────
function renderProductCatChart() {
  const canvas = document.getElementById('productCatChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.productCat) charts.productCat.destroy();

  const sorted = [...dashboardData.categoryData].sort((a, b) => b.units - a.units);

  charts.productCat = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: sorted.map(c => c.name),
      datasets: [{
        data: sorted.map(c => c.units),
        backgroundColor: COLORS.palette,
        borderColor: '#080a10',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString()} units` } }
      }
    }
  });
}

function renderScatterChart() {
  const canvas = document.getElementById('scatterChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.scatter) charts.scatter.destroy();

  charts.scatter = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: dashboardData.categoryData.map((c, i) => ({
        label: c.name,
        data: [{ x: c.growth, y: c.margin, r: Math.max(9, Math.sqrt(c.revenue) / 13) }],
        backgroundColor: COLORS.palette[i % COLORS.palette.length] + 'cc',
        borderColor: COLORS.palette[i % COLORS.palette.length],
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const cat = dashboardData.categoryData[ctx.datasetIndex];
              return `${cat.name}: Growth +${cat.growth}%, Margin ${cat.margin}%, Gross $${cat.revenue.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: { title: { display: true, text: 'YoY Growth Rate (%)', color: '#94a3b8' } },
        y: { title: { display: true, text: 'Profit Margin (%)', color: '#94a3b8' } }
      }
    }
  });
}

function filterCatalogCategory(category, btn) {
  activeCatalogFilter = category;
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
  }
  renderProductsTable();
}

function handleCatalogSearch(query) {
  catalogSearchQuery = (query || '').toLowerCase().trim();
  renderProductsTable();
}

function handleGlobalSearch(query) {
  navigateTo('products');
  const input = document.getElementById('catalogSearchInput');
  if (input) input.value = query;
  handleCatalogSearch(query);
}

function renderProductsTable(sortBy = 'revenue') {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody || !dashboardData) return;

  let list = [...dashboardData.topProducts];

  // Apply category pill filter
  if (activeCatalogFilter !== 'All') {
    list = list.filter(p => p.category === activeCatalogFilter);
  }

  // Apply search query filter
  if (catalogSearchQuery) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(catalogSearchQuery) ||
      p.sku.toLowerCase().includes(catalogSearchQuery) ||
      p.brand.toLowerCase().includes(catalogSearchQuery) ||
      p.fitment.toLowerCase().includes(catalogSearchQuery) ||
      p.category.toLowerCase().includes(catalogSearchQuery)
    );
  }

  // Sort
  list.sort((a, b) => b[sortBy] - a[sortBy]);

  const maxRevenue = Math.max(...dashboardData.topProducts.map(p => p.revenue));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-3)">No auto parts found matching "${catalogSearchQuery}". Try searching "Brembo", "Turbo", or "BMW".</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, i) => {
    const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
    const rmaClass = p.warrantyClaim < 0.6 ? 'return-low' : p.warrantyClaim < 1.2 ? 'return-mid' : 'return-high';
    const perf = ((p.revenue / maxRevenue) * 100).toFixed(0);
    const stockClass = p.stock > 30 ? 'return-low' : p.stock > 10 ? 'return-mid' : 'return-high';

    return `
      <tr onclick="openSkuSession('${p.sku}')" style="cursor: pointer" title="Click to open ${p.sku} in Multi-Session Tab">
        <td><div class="product-rank ${rankClass}">#${i + 1}</div></td>
        <td>
          <div style="font-weight:700;color:#fff">${p.name}</div>
          <div style="margin-top:2px"><span class="sku-tag">${p.sku}</span> <span style="font-size:0.75rem;color:var(--text-3)">$${p.price} MSRP</span></div>
        </td>
        <td>
          <span class="table-badge">${p.brand}</span>
          <div style="font-size:0.75rem;color:var(--text-3);margin-top:2px">${p.category}</div>
        </td>
        <td><span class="fitment-tag"><i class="ri-car-line"></i> ${p.fitment}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:800;color:var(--cyan)">$${p.revenue.toLocaleString()}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-weight:700">${p.units.toLocaleString()}</td>
        <td><span class="${stockClass}" style="font-family:'JetBrains Mono',monospace">${p.stock} units</span></td>
        <td><span class="${rmaClass}">${p.warrantyClaim}% RMA</span></td>
        <td>
          <div class="perf-bar"><div class="perf-fill" style="width: ${perf}%"></div></div>
          <span style="font-size:0.74rem;margin-left:6px;font-family:'JetBrains Mono',monospace">${perf}%</span>
        </td>
      </tr>
    `;
  }).join('');
}

function sortProducts(by, btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  renderProductsTable(by);
}

// ─── 4. Commercial Garage & Fleet Accounts ──────────────────────────────────────
function renderCustomerKpis() {
  const container = document.getElementById('customerKpis');
  if (!container || !dashboardData) return;
  const d = dashboardData.kpis;

  const items = [
    { label: 'Active Commercial Accounts', val: d.activeGarages.toLocaleString(), change: '+14.6% YoY', grad: 'var(--grad-cyan)' },
    { label: 'Commercial Fleet Retention', val: `${d.customerRetention}%`, change: '+3.8%', grad: 'var(--grad-orange)' },
    { label: 'Avg Fleet Order Ticket', val: `$${d.avgOrderValue}`, change: '+8.2%', grad: 'var(--grad-green)' },
    { label: 'On-Time Fleet Fulfillment', val: `${d.onTimeDeliveryRate}%`, change: '+1.4%', grad: 'var(--grad-4)' }
  ];

  container.innerHTML = items.map(item => `
    <div class="kpi-card" style="--kpi-grad: ${item.grad}">
      <div class="kpi-label">${item.label}</div>
      <div class="kpi-value">${item.val}</div>
      <span class="kpi-change up"><i class="ri-arrow-up-line"></i> ${item.change}</span>
    </div>
  `).join('');
}

function renderSegments() {
  const container = document.getElementById('segmentsGrid');
  if (!container || !dashboardData) return;
  const emojis = ['🏢', '🏎️', '🚛', '🏁', '📦'];

  container.innerHTML = dashboardData.segments.map((s, i) => `
    <div class="segment-card">
      <span class="seg-emoji">${emojis[i % emojis.length]}</span>
      <div class="seg-name">${s.name}</div>
      <div style="font-size:0.72rem;color:var(--orange);font-weight:700;margin-bottom:8px">${s.tier}</div>
      <div class="seg-row"><span class="seg-label">Accounts</span><span class="seg-val">${s.count.toLocaleString()}</span></div>
      <div class="seg-row"><span class="seg-label">Avg PO Ticket</span><span class="seg-val">$${s.avgSpend.toLocaleString()}</span></div>
      <div class="seg-row"><span class="seg-label">Retention</span><span class="seg-val">${s.retention}%</span></div>
    </div>
  `).join('');
}

function renderSegmentPieChart() {
  const canvas = document.getElementById('segmentPieChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.segmentPie) charts.segmentPie.destroy();

  charts.segmentPie = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: dashboardData.segments.map(s => s.name),
      datasets: [{
        data: dashboardData.segments.map(s => s.count),
        backgroundColor: COLORS.palette,
        borderColor: '#080a10',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right' } }
    }
  });
}

function renderSegmentBarChart() {
  const canvas = document.getElementById('segmentBarChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.segmentBar) charts.segmentBar.destroy();

  charts.segmentBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dashboardData.segments.map(s => s.name.split(' ')[0]),
      datasets: [{
        label: 'Gross Tier Revenue ($)',
        data: dashboardData.segments.map(s => s.count * s.avgSpend),
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return '#00f2fe';
          const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          g.addColorStop(0, '#0088ff');
          g.addColorStop(1, '#00f2fe');
          return g;
        },
        borderColor: '#00f2fe',
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `Revenue: $${ctx.parsed.y.toLocaleString()}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

// ─── 5. Distribution Hubs & Regional Logistics ──────────────────────────────────
function renderRegionCards() {
  const container = document.getElementById('regionCards');
  if (!container || !dashboardData) return;

  const grads = [
    'var(--grad-cyan)',
    'var(--grad-orange)',
    'var(--grad-green)',
    'var(--grad-red)',
    'var(--grad-4)'
  ];

  container.innerHTML = dashboardData.regionData.map((r, i) => `
    <div class="region-card" style="--rc-color: ${grads[i % grads.length]}; cursor: pointer" onclick="openHubSession('${r.hubCode}')" title="Click to open ${r.hubCode} in Multi-Session Tab">
      <span class="rc-code">${r.hubCode}</span>
      <div class="rc-name">${r.hubName}</div>
      <div style="font-size:0.75rem;color:var(--text-3);margin-bottom:12px">Mgr: ${r.manager} • ${r.name}</div>
      <div class="rc-revenue">$${(r.revenue / 1000).toFixed(1)}K</div>
      <div class="rc-stats">
        <div><div class="rc-stat-label">Orders</div><div class="rc-stat-value">${r.orders.toLocaleString()}</div></div>
        <div><div class="rc-stat-label">Avg PO Ticket</div><div class="rc-stat-value">$${r.avgOrderValue}</div></div>
        <div><div class="rc-stat-label">Dispatch Speed</div><div class="rc-stat-value" style="color:var(--cyan)">${r.fulfillmentSpeed}d</div></div>
        <div><div class="rc-stat-label">Satisfaction</div><div class="rc-stat-value">${r.customerSatisfaction} ⭐</div></div>
      </div>
    </div>
  `).join('');
}

function renderRegionBarChart() {
  const canvas = document.getElementById('regionBarChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.regionBar) charts.regionBar.destroy();

  charts.regionBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dashboardData.regionData.map(r => r.hubCode),
      datasets: [{
        label: 'Hub Throughput ($)',
        data: dashboardData.regionData.map(r => r.revenue),
        backgroundColor: COLORS.palette,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.y.toLocaleString()}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

function renderRegionRadarChart() {
  const canvas = document.getElementById('regionRadarChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.regionRadar) charts.regionRadar.destroy();

  const maxRev = Math.max(...dashboardData.regionData.map(r => r.revenue));

  charts.regionRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Revenue Throughput', 'Fulfillment Velocity', 'Account Retention', 'Fleet Volume', 'Dispatch Speed'],
      datasets: dashboardData.regionData.map((r, i) => ({
        label: r.hubCode,
        data: [
          (r.revenue / maxRev) * 100,
          95,
          88,
          (r.orders / 5000) * 100,
          (1 / r.fulfillmentSpeed) * 100
        ],
        borderColor: COLORS.palette[i],
        backgroundColor: COLORS.palette[i] + '33',
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          grid: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { font: { size: 10, color: '#94a3b8' } },
          ticks: { display: false }
        }
      }
    }
  });
}

// ─── 6. Warehouse Operations ────────────────────────────────────────────────────
function renderStoreCards() {
  const container = document.getElementById('storeCards');
  if (!container || !dashboardData) return;

  const grads = ['var(--grad-cyan)', 'var(--grad-orange)', 'var(--grad-green)', 'var(--grad-red)', 'var(--grad-4)'];

  container.innerHTML = dashboardData.storeData.map((s, i) => `
    <div class="store-card" style="--store-grad: ${grads[i % grads.length]}; cursor: pointer" onclick="openHubSession('${s.code}')" title="Click to open ${s.code} in Multi-Session Tab">
      <div class="store-name"><i class="ri-truck-line" style="color:var(--cyan)"></i> ${s.name}</div>
      <div style="font-size:0.75rem;color:var(--text-3);margin-bottom:8px">${s.region} (${s.code})</div>
      <div class="store-revenue">$${(s.revenue / 1000).toFixed(1)}K</div>
      <div class="store-stats">
        <div class="store-stat"><span class="store-stat-label">On-Time Dispatch</span><span class="store-stat-value" style="color:var(--green)">${s.onTimeDelivery}%</span></div>
        <div class="store-stat"><span class="store-stat-label">Fleet Accounts</span><span class="store-stat-value">${s.footfall.toLocaleString()}</span></div>
        <div class="store-stat"><span class="store-stat-label">Avg PO Ticket</span><span class="store-stat-value">$${s.avgTransaction}</span></div>
        <div class="store-stat"><span class="store-stat-label">Conversion</span><span class="store-stat-value">${s.conversionRate}%</span></div>
      </div>
    </div>
  `).join('');
}

function renderStoreDetailChart() {
  const canvas = document.getElementById('storeDetailChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.storeDetail) charts.storeDetail.destroy();

  charts.storeDetail = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dashboardData.storeData.map(s => s.code),
      datasets: [
        {
          label: 'Total Hub Sales ($)',
          data: dashboardData.storeData.map(s => s.revenue),
          backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return '#00f2fe';
            const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            g.addColorStop(0, '#0088ff');
            g.addColorStop(1, '#00f2fe');
            return g;
          },
          borderColor: '#00f2fe',
          borderWidth: 1.5,
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Commercial Invoices Dispatched',
          data: dashboardData.storeData.map(s => s.footfall),
          type: 'line',
          borderColor: COLORS.orange,
          backgroundColor: 'transparent',
          borderWidth: 2.5,
          pointRadius: 5,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end' } },
      scales: {
        y: { position: 'left', beginAtZero: true, ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } },
        y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: v => v.toLocaleString() } }
      }
    }
  });
}

// ─── 7. Velocity & Intake Trends ────────────────────────────────────────────────
function renderTrafficDetailChart() {
  const canvas = document.getElementById('trafficDetailChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.trafficDetail) charts.trafficDetail.destroy();

  charts.trafficDetail = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dashboardData.hourlyTraffic.map(h => `${h.hour}:00`),
      datasets: [{
        label: 'Hourly Inbound Orders',
        data: dashboardData.hourlyTraffic.map(h => h.visitors),
        borderColor: COLORS.cyan,
        backgroundColor: createAreaGradient(ctx, COLORS.cyan, 0.4),
        fill: true,
        borderWidth: 3,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: 12 } }
      }
    }
  });
}

function renderTrendDailyChart() {
  const canvas = document.getElementById('trendDailyChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.trendDaily) charts.trendDaily.destroy();

  charts.trendDaily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dashboardData.dailySales.map(d => `Day ${d.day}`),
      datasets: [
        {
          label: 'Daily Sales ($)',
          data: dashboardData.dailySales.map(d => d.sales),
          borderColor: COLORS.orange,
          backgroundColor: createAreaGradient(ctx, COLORS.orange, 0.28),
          fill: true,
          borderWidth: 2.5
        },
        {
          label: 'Wholesale Orders Dispatched',
          data: dashboardData.dailySales.map(d => d.orders * 150),
          borderColor: COLORS.green,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 4]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', align: 'end' } },
      scales: {
        y: { ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

function renderGrowthChart() {
  const canvas = document.getElementById('growthChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.growth) charts.growth.destroy();

  const sorted = [...dashboardData.categoryData].sort((a, b) => b.growth - a.growth);

  charts.growth = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(c => c.name),
      datasets: [{
        label: 'YoY Growth (%)',
        data: sorted.map(c => c.growth),
        backgroundColor: sorted.map(c => c.growth >= 0 ? '#00e676' : '#ff3366'),
        borderColor: sorted.map(c => c.growth >= 0 ? '#10b981' : '#ff6b00'),
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y}% YoY Growth` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => `${v}%` } }
      }
    }
  });
}

// ─── 8. AI Demand Forecast & Predictive Telemetry ───────────────────────────────
function renderForecastBaseChart() {
  const canvas = document.getElementById('forecastBaseChart');
  if (!canvas || !dashboardData) return;
  const ctx = canvas.getContext('2d');
  if (charts.forecastBase) charts.forecastBase.destroy();

  charts.forecastBase = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dashboardData.months,
      datasets: [{
        label: 'Historical Auto Parts Revenue ($)',
        data: dashboardData.monthlyRevenue,
        borderColor: COLORS.cyan,
        backgroundColor: createAreaGradient(ctx, COLORS.cyan, 0.25),
        fill: true,
        borderWidth: 3,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { ticks: { callback: v => `$${(v / 1000).toFixed(0)}K` } }
      }
    }
  });
}

async function getForecast() {
  const container = document.getElementById('forecastContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="forecast-empty">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <p style="color:var(--cyan);font-weight:700">Running Groq LLaMA 3.3 70B inference on aftermarket supply chain velocity...</p>
    </div>
  `;

  try {
    const res = await fetch('/api/ai/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (!data.forecast || data.forecast.length === 0) {
      container.innerHTML = `<div class="error-text">⚠️ Forecast unavailable. Please check connectivity.</div>`;
      return;
    }

    let cardsHtml = '<div class="forecast-cards">';
    data.forecast.forEach((f, idx) => {
      const confClass = f.confidence === 'high' ? 'conf-high' : f.confidence === 'medium' ? 'conf-med' : 'conf-low';
      cardsHtml += `
        <div class="fc-card" style="animation-delay: ${idx * 0.1}s">
          <div class="fc-month"><i class="ri-calendar-line" style="color:var(--orange)"></i> ${f.month}</div>
          <div class="fc-value">$${Number(f.predicted).toLocaleString()}</div>
          <span class="fc-confidence ${confClass}">${f.confidence} confidence</span>
          <p class="fc-reason">${f.reason}</p>
        </div>
      `;
    });
    cardsHtml += '</div>';

    if (data.trend) {
      cardsHtml += `
        <div class="fc-trend">
          <strong><i class="ri-line-chart-line"></i> Supply Chain Demand Analysis:</strong><br>${data.trend}
        </div>
      `;
    }

    container.innerHTML = cardsHtml;
  } catch (e) {
    container.innerHTML = `<div class="error-text">⚠️ Error connecting to AI forecast engine.</div>`;
  }
}

// ─── 9. ApexGear AI Insights & Chat ─────────────────────────────────────────────
async function getQuickInsight() {
  const container = document.getElementById('quickInsightText');
  if (!container) return;
  container.innerHTML = `<div class="loading-shimmer"><i class="ri-sparkling-fill"></i> ApexGear AI analyzing fleet velocity with Groq...</div>`;

  try {
    const res = await fetch('/api/ai/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Provide top operations insights and high-ROI inventory recommendations for automotive parts.' })
    });
    const data = await res.json();

    let output = formatMarkdown(data.insight || 'No insights returned.');
    if (data.note) {
      output += `<div style="margin-top:12px;font-size:0.75rem;opacity:0.6"><i class="ri-information-line"></i> ${data.note}</div>`;
    }
    container.innerHTML = output;
  } catch (err) {
    container.innerHTML = `<div class="error-text">⚠️ AI engine currently offline. Click refresh to retry.</div>`;
  }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  appendChatMessage('user', message);
  chatHistory.push({ role: 'user', content: message });

  const typingId = showTypingIndicator();

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory })
    });
    const data = await res.json();
    removeTypingIndicator(typingId);

    const reply = data.reply || "I couldn't process that query.";
    appendChatMessage('bot', reply);
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    removeTypingIndicator(typingId);
    appendChatMessage('bot', "⚠️ Connection to ApexGear AI engine failed. Please try again.");
  }
}

function askSuggestion(question) {
  navigateTo('ai-chat');
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = question;
    sendChat();
  }
}

function appendChatMessage(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${role}`;

  const avatar = role === 'bot'
    ? `<div class="chat-avatar bot-av"><i class="ri-robot-2-fill"></i></div>`
    : `<div class="chat-avatar user-av"><i class="ri-user-settings-fill"></i></div>`;

  msgDiv.innerHTML = `
    ${avatar}
    <div class="chat-bubble">${formatMarkdown(text)}</div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('chatMessages');
  const id = 'typing_' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'chat-message bot';
  div.innerHTML = `
    <div class="chat-avatar bot-av"><i class="ri-robot-2-fill"></i></div>
    <div class="chat-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^• (.*)$/gm, '<li style="margin-left:18px;margin-bottom:5px">$1</li>')
    .replace(/^- (.*)$/gm, '<li style="margin-left:18px;margin-bottom:5px">$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// ─── Dynamic Per-Page Thematic Background System ─────────────────────────────
const PAGE_BACKGROUNDS = {
  'dashboard': 'bg-overview.jpg',
  'revenue': 'bg-revenue.jpg',
  'products': 'bg-products.jpg',
  'customers': 'bg-customers.jpg',
  'regions': 'bg-regions.jpg',
  'stores': 'bg-regions.jpg',
  'trends': 'bg-revenue.jpg',
  'about': 'bg-admin.jpg',
  'admin': 'bg-admin.jpg',
  'trends-intel': 'bg-revenue.jpg',
  'customer-behavior': 'bg-customers.jpg',
  'ai-chat': 'bg-admin.jpg',
  'forecast': 'bg-revenue.jpg',
  'hub-detail': 'bg-regions.jpg',
  'sku-detail': 'bg-products.jpg'
};

function updatePageBackground(pageId) {
  const bgLayer = document.getElementById('heroBgLayer');
  if (!bgLayer) return;
  const img = PAGE_BACKGROUNDS[pageId] || 'bg-overview.jpg';
  bgLayer.style.opacity = '0.35';
  bgLayer.style.transform = 'scale(1.02)';
  setTimeout(() => {
    bgLayer.style.backgroundImage = `url('${img}')`;
    bgLayer.style.opacity = '1';
    bgLayer.style.transform = 'scale(1)';
  }, 180);
}

// ─── Operational Dispatch Alerts & Telemetry Notifications ─────────────────────
let notifications = [
  {
    id: 1,
    priority: 'critical',
    badge: 'CRITICAL STOCK',
    title: 'Low Inventory: Brembo GT-R Calipers',
    msg: 'Detroit Central Mega-Hub (HUB-DTW) has only 4 units left of SKU APX-BRM-940. Auto-reorder triggered.',
    time: '2m ago',
    read: false
  },
  {
    id: 2,
    priority: 'urgent',
    badge: 'NIGHT COURIER',
    title: 'Expedited Dispatch Confirmed',
    msg: 'LAX Port Speedshop night hauler pickup booked for 38 Garrett G25-660 turbos to Frankfurt Euro-Import.',
    time: '14m ago',
    read: false
  },
  {
    id: 3,
    priority: 'intel',
    badge: 'GROQ AI INTEL',
    title: 'Demand Spike Detected',
    msg: 'Groq LLaMA 3.3 70B detected +34.2% surge in wholesale Bilstein B16 suspension orders from East Coast dealer garages.',
    time: '42m ago',
    read: false
  },
  {
    id: 4,
    priority: 'logistics',
    badge: 'EFFICIENCY RECORD',
    title: 'Hub Fulfillment Milestone',
    msg: 'Dallas Logistics Depot (HUB-DFW) achieved 99.4% same-day order fulfillment across 5,084 purchase orders.',
    time: '1h ago',
    read: true
  },
  {
    id: 5,
    priority: 'logistics',
    badge: 'WARRANTY METRIC',
    title: 'Warranty RMA Rate Drop',
    msg: 'Fleet warranty RMA rate dropped to 0.42% across all 8 automotive categories, outperforming the industry benchmark.',
    time: '3h ago',
    read: true
  }
];

function initNotifications() {
  renderNotifications();
  // Close drawer when clicking outside
  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('notificationsDrawer');
    const btn = document.getElementById('notifBtn');
    if (drawer && drawer.classList.contains('active')) {
      if (!drawer.contains(e.target) && !btn.contains(e.target)) {
        drawer.classList.remove('active');
      }
    }
  });
}

function toggleNotificationsDrawer() {
  const drawer = document.getElementById('notificationsDrawer');
  if (!drawer) return;
  drawer.classList.toggle('active');
  if (drawer.classList.contains('active')) {
    renderNotifications();
  }
}

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  const dot = document.getElementById('notifDot');
  if (!list) return;

  const unreadCount = notifications.filter(n => !n.read).length;
  if (dot) {
    dot.style.display = unreadCount > 0 ? 'block' : 'none';
  }

  if (notifications.length === 0) {
    list.innerHTML = `
      <div class="notif-empty">
        <i class="ri-checkbox-circle-line"></i>
        <p>All operational telemetry dispatch alerts cleared.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(n => `
    <div class="notif-card ${n.read ? 'read' : ''}" onclick="markNotificationRead(${n.id})">
      <div class="notif-card-top">
        <span class="notif-badge ${n.priority}">${n.badge}</span>
        <span class="notif-time">${n.time}</span>
      </div>
      <div style="font-size:0.85rem;font-weight:700;color:#fff;margin-bottom:3px">${n.title}</div>
      <div class="notif-msg">${n.msg}</div>
    </div>
  `).join('');
}

function markNotificationRead(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    renderNotifications();
  }
}

function clearAllNotifications() {
  notifications = [];
  renderNotifications();
  showToast('All dispatch alerts cleared 🏁');
}

// ─── Groq API Key Modal & Dynamic Configuration ────────────────────────────────
async function openKeyModal() {
  const modal = document.getElementById('keyModal');
  if (!modal) return;
  modal.classList.add('active');

  const feedback = document.getElementById('keyFeedback');
  if (feedback) feedback.classList.add('hidden');

  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const statusDot = document.getElementById('modalStatusDot');
    const statusText = document.getElementById('modalStatusText');
    const modelBadge = document.getElementById('modalModelBadge');
    const btnDisconnect = document.getElementById('btnDisconnectKey');
    const input = document.getElementById('apiKeyInput');

    if (data.hasGroqKey) {
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#00e676]';
      }
      if (statusText) statusText.textContent = `Connected (${data.maskedKey || 'Key Active'})`;
      if (btnDisconnect) btnDisconnect.classList.remove('hidden');
      if (input && !input.value) input.placeholder = data.maskedKey ? `Current: ${data.maskedKey}` : 'gsk_...';
    } else {
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-[0_0_8px_#ffb800]';
      }
      if (statusText) statusText.textContent = 'Hybrid Demo Mode (Add key to activate)';
      if (btnDisconnect) btnDisconnect.classList.add('hidden');
      if (input && !input.value) input.placeholder = 'gsk_...';
    }
    if (modelBadge && data.model) {
      modelBadge.textContent = data.model;
    }
  } catch (e) {
    console.warn('Status query failed in modal:', e);
  }

  const input = document.getElementById('apiKeyInput');
  if (input) input.focus();
}

function closeKeyModal() {
  const modal = document.getElementById('keyModal');
  if (modal) modal.classList.remove('active');
}

function toggleKeyVisibility() {
  const input = document.getElementById('apiKeyInput');
  const icon = document.getElementById('keyEyeIcon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.className = 'ri-eye-off-line';
  } else {
    input.type = 'password';
    if (icon) icon.className = 'ri-eye-line';
  }
}

async function saveApiKey() {
  const input = document.getElementById('apiKeyInput');
  const btnText = document.getElementById('btnSaveKeyText');
  const btn = document.getElementById('btnSaveKey');
  if (!input) return;

  const key = input.value.trim();
  if (!key) {
    showKeyFeedback('Please enter your Groq API key (starts with gsk_)', 'error');
    return;
  }

  if (btnText) btnText.textContent = 'Verifying with Groq...';
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/set-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const data = await res.json();

    if (data.success) {
      showKeyFeedback(data.message || `Groq API Key verified! ${data.model || ''} live inference active.`, 'success');
      input.value = '';
      checkStatus();
      getQuickInsight();
      showToast('Groq API Key verified & connected! 🏎️');
      setTimeout(() => {
        closeKeyModal();
      }, 1400);
    } else {
      showKeyFeedback(data.error || 'Failed to authenticate Groq key.', 'error');
    }
  } catch (e) {
    showKeyFeedback('Network error verifying Groq key. Please try again.', 'error');
  } finally {
    if (btnText) btnText.textContent = 'Test & Save';
    if (btn) btn.disabled = false;
  }
}

async function disconnectApiKey() {
  if (!confirm('Disconnect your Groq API key and revert to hybrid demo mode?')) return;
  try {
    const res = await fetch('/api/remove-api-key', { method: 'POST' });
    const data = await res.json();
    showToast(data.message || 'Key disconnected');
    closeKeyModal();
    checkStatus();
    getQuickInsight();
  } catch (e) {
    showToast('Error disconnecting key');
  }
}

function showKeyFeedback(msg, type) {
  const fb = document.getElementById('keyFeedback');
  if (!fb) return;
  fb.textContent = msg;
  fb.className = type === 'error'
    ? 'text-xs mt-2 font-medium text-rose-400 bg-rose-950/30 p-2 rounded-lg border border-rose-500/30'
    : 'text-xs mt-2 font-medium text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/30';
  fb.classList.remove('hidden');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (toast && toastMsg) {
    toastMsg.textContent = msg;
    toast.classList.add('active');
    setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }
}

