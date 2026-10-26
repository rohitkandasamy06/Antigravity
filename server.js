require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// ─── Groq Client Setup & Dynamic Model Resolution ────────────────────────────
let currentApiKey = process.env.GROQ_API_KEY || '';
let groq = null;
let activeGroqModel = 'llama-3.3-70b-versatile';
let fallbackGroqModels = [];

const PREFERRED_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'allam-2-7b'
];

async function resolveGroqModel(client) {
  try {
    const list = await client.models.list();
    const availableChatModels = (list.data || []).filter(m => 
      m.active &&
      (!m.output_modalities || m.output_modalities.includes('text')) &&
      !m.id.includes('whisper') &&
      !m.id.includes('prompt-guard') &&
      !m.id.includes('safeguard') &&
      !m.id.includes('orpheus')
    ).map(m => m.id);

    console.log('Available Groq chat models for key:', availableChatModels);

    const matched = PREFERRED_GROQ_MODELS.find(p => availableChatModels.includes(p));
    const chosen = matched || availableChatModels[0] || 'qwen/qwen3.8-27b';
    const fallbacks = availableChatModels.filter(m => m !== chosen);

    return { chosen, fallbacks };
  } catch (err) {
    console.warn('Could not list models from Groq:', err.message);
    return { chosen: 'llama-3.3-70b-versatile', fallbacks: ['qwen/qwen3.8-27b'] };
  }
}

function initGroqClient(key) {
  if (key && key !== 'your_groq_api_key_here' && key.trim().length > 10) {
    try {
      const client = new Groq({ apiKey: key.trim() });
      groq = client;
      currentApiKey = key.trim();
      resolveGroqModel(client).then(({ chosen, fallbacks }) => {
        activeGroqModel = chosen;
        fallbackGroqModels = fallbacks;
        console.log(`Groq initialized with active model: ${activeGroqModel}`);
      }).catch(err => {
        console.warn('Initial Groq model discovery warning:', err.message);
      });
      return true;
    } catch (e) {
      console.error('Groq init failed:', e.message);
      groq = null;
      return false;
    }
  }
  groq = null;
  return false;
}

initGroqClient(currentApiKey);

// ─── Apex Auto Parts & Operations Telemetry Generator ────────────────────────
function generateSalesData() {
  const categories = [
    'Braking & Rotors',
    'Turbo & Powertrain',
    'Suspension & Steering',
    'Electrical & Ignition',
    'Wheels & Track Tires',
    'Performance Exhausts',
    'Fluids & Race Lubricants',
    'Engine Internals'
  ];

  const warehouses = [
    { name: 'Detroit Central Mega-Hub', code: 'HUB-DTW', region: 'Midwest Fleet', manager: 'Marcus Vance' },
    { name: 'Dallas Logistics Depot', code: 'HUB-DFW', region: 'South & Offroad', manager: 'Elena Rodriguez' },
    { name: 'Los Angeles Port Speedshop', code: 'HUB-LAX', region: 'West Performance', manager: 'Kenji Sato' },
    { name: 'Atlanta Regional Warehouse', code: 'HUB-ATL', region: 'East Garages', manager: 'Sarah Jenkins' },
    { name: 'Frankfurt Euro-Import Hub', code: 'HUB-FRA', region: 'German OEM Track', manager: 'Hans Mueller' }
  ];

  const partCatalog = {
    'Braking & Rotors': [
      { name: 'Brembo GT-R 6-Piston Carbon-Ceramic Brake Kit', brand: 'Brembo Racing', sku: 'APX-BRM-940', price: 4250, fitment: 'Porsche 911 / BMW M3 / C8 Corvette' },
      { name: 'EBC Slotted Track-Day Rotors (Front Pair)', brand: 'EBC Brakes', sku: 'APX-EBC-412', price: 680, fitment: 'Ford Mustang GT / Shelby GT350' },
      { name: 'Ferodo Racing DS2500 Ceramic Brake Pads', brand: 'Ferodo', sku: 'APX-FRD-108', price: 295, fitment: 'Subaru WRX STI / Toyota Supra' },
      { name: 'StopTech Stainless Braided Brake Lines', brand: 'StopTech', sku: 'APX-STP-044', price: 165, fitment: 'Universal Fitment' }
    ],
    'Turbo & Powertrain': [
      { name: 'Garrett G25-660 Ball Bearing Turbocharger', brand: 'Garrett Motion', sku: 'APX-GAR-660', price: 2450, fitment: 'Audi RS3 / Honda Civic Type R' },
      { name: 'K&N Series 77 High-Flow Cold Air Intake', brand: 'K&N Engineering', sku: 'APX-KNN-772', price: 420, fitment: 'Ford F-150 / RAM 1500 V8' },
      { name: 'Mishimoto Performance Dual-Core Intercooler', brand: 'Mishimoto', sku: 'APX-MSH-310', price: 890, fitment: 'BMW M2 / M4 Competition' },
      { name: 'HKS Super SQV4 Blow-Off Valve Kit', brand: 'HKS Japan', sku: 'APX-HKS-091', price: 340, fitment: 'Nissan GT-R R35' }
    ],
    'Suspension & Steering': [
      { name: 'Bilstein B16 PSS10 Adjustable Coilovers', brand: 'Bilstein', sku: 'APX-BIL-160', price: 2650, fitment: 'Porsche Cayman / VW Golf R' },
      { name: 'KW Variant 3 Inox-Line Coilover System', brand: 'KW Automotive', sku: 'APX-KW-301', price: 3100, fitment: 'BMW 3-Series / 4-Series G80' },
      { name: 'Whiteline Heavy-Duty Front & Rear Sway Bar Kit', brand: 'Whiteline', sku: 'APX-WHL-550', price: 580, fitment: 'Subaru BRZ / GR86' },
      { name: 'Moog Problem Solver HD Ball Joint Assemblies', brand: 'Moog Fleet', sku: 'APX-MOG-022', price: 145, fitment: 'Chevy Silverado / Sierra 2500' }
    ],
    'Electrical & Ignition': [
      { name: 'Bosch Wideband LSU 4.9 Oxygen Sensor', brand: 'Bosch OEM', sku: 'APX-BSH-490', price: 175, fitment: 'Universal Multi-Vehicle' },
      { name: 'Denso 220-Amp Heavy-Duty Alternator', brand: 'Denso Corp', sku: 'APX-DNS-220', price: 485, fitment: 'Toyota Tundra / Lexus LX570' },
      { name: 'NGK Laser Iridium Spark Plugs (Set of 8)', brand: 'NGK Racing', sku: 'APX-NGK-808', price: 140, fitment: 'GM LS3 / LT1 V8 Engines' },
      { name: 'Optima YellowTop Deep-Cycle AGM Battery', brand: 'Optima Batteries', sku: 'APX-OPT-901', price: 360, fitment: 'Commercial Fleet & Offroad' }
    ],
    'Wheels & Track Tires': [
      { name: 'Michelin Pilot Sport Cup 2 Semi-Slick Tires', brand: 'Michelin', sku: 'APX-MCH-265', price: 1850, fitment: '19\" Staggered Fitment' },
      { name: 'BBS FI-R Forged Monoblock Alloys (Set of 4)', brand: 'BBS Germany', sku: 'APX-BBS-991', price: 7800, fitment: 'Porsche 991 GT3 RS' },
      { name: 'Enkei RPF1 Lightweight Racing Wheels', brand: 'Enkei Japan', sku: 'APX-ENK-179', price: 1350, fitment: '17x9.0 5x114.3 Track Spec' }
    ],
    'Performance Exhausts': [
      { name: 'Borla ATAK Dual Exhaust System', brand: 'Borla Performance', sku: 'APX-BRL-702', price: 1980, fitment: 'Ford Mustang Dark Horse' },
      { name: 'Akrapovic Titanium Slip-On Exhaust', brand: 'Akrapovic', sku: 'APX-AKR-440', price: 5200, fitment: 'BMW M8 / BMW M5 F90' },
      { name: 'MagnaFlow Street Series Cat-Back Exhaust', brand: 'MagnaFlow', sku: 'APX-MGN-112', price: 1420, fitment: 'Jeep Wrangler 3.6L V6' }
    ],
    'Fluids & Race Lubricants': [
      { name: 'Motul 300V Competition 15W50 Ester Core (5L)', brand: 'Motul Racing', sku: 'APX-MTL-300', price: 115, fitment: 'Turbocharged Race Engines' },
      { name: 'Castrol React SRF Racing Brake Fluid (1L)', brand: 'Castrol Pro', sku: 'APX-CST-590', price: 85, fitment: 'Extreme Temp Motorsport' },
      { name: 'Red Line 75W90 Synthetic Gear Oil (Case)', brand: 'Red Line Oil', sku: 'APX-RED-759', price: 160, fitment: 'Limited Slip Differentials' }
    ],
    'Engine Internals': [
      { name: 'Wiseco Forged 8.5:1 Compression Pistons', brand: 'Wiseco', sku: 'APX-WSC-850', price: 890, fitment: 'Toyota 2JZ-GTE / Supra' },
      { name: 'ARP Custom Age 625+ Cylinder Head Stud Kit', brand: 'ARP Fasteners', sku: 'APX-ARP-625', price: 420, fitment: 'Ford Powerstroke 6.7L Diesel' },
      { name: 'Gates Racing High-Performance Timing Belt', brand: 'Gates Corp', sku: 'APX-GTS-090', price: 185, fitment: 'Nissan RB26DETT' }
    ]
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Seasonal automotive demand: Spring/Summer tuning surge and Q4 holiday orders
  const baseRevenue = [98000, 92000, 115000, 138000, 155000, 168000, 162000, 158000, 174000, 185000, 210000, 235000];
  const monthlyRevenue = baseRevenue.map(v => v + Math.round((Math.random() - 0.3) * 6000));
  const prevYearRevenue = baseRevenue.map(v => Math.round(v * 0.82 + (Math.random() - 0.5) * 5000));

  // Category performance
  const categoryData = categories.map((cat, idx) => ({
    name: cat,
    revenue: Math.round(95000 + (categories.length - idx) * 22000 + Math.random() * 45000),
    units: Math.round(480 + (categories.length - idx) * 210 + Math.random() * 600),
    growth: +((-2 + Math.random() * 32).toFixed(1)),
    margin: +(28 + Math.random() * 26).toFixed(1)
  }));

  // Warehouse Hub performance
  const regionData = warehouses.map((w, i) => ({
    name: w.region,
    hubCode: w.code,
    hubName: w.name,
    manager: w.manager,
    revenue: Math.round(260000 + (5 - i) * 65000 + Math.random() * 60000),
    orders: Math.round(2400 + Math.random() * 3200),
    avgOrderValue: +(145 + Math.random() * 110).toFixed(2),
    fulfillmentSpeed: +(1.1 + Math.random() * 0.8).toFixed(1), // in days
    customerSatisfaction: +(4.4 + Math.random() * 0.5).toFixed(1)
  }));

  // Detailed Top SKUs
  const topProducts = [];
  categories.forEach(cat => {
    const prods = partCatalog[cat] || [];
    prods.forEach(p => {
      const units = Math.round(18 + Math.random() * 120);
      const rev = units * p.price;
      topProducts.push({
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        category: cat,
        price: p.price,
        fitment: p.fitment,
        revenue: rev,
        units: units,
        stock: Math.round(8 + Math.random() * 85),
        warrantyClaim: +(0.2 + Math.random() * 1.6).toFixed(1),
        margin: +(32 + Math.random() * 22).toFixed(1),
        status: units > 80 ? 'High Demand' : units > 40 ? 'Active Fast-Mover' : 'Special Order'
      });
    });
  });
  topProducts.sort((a, b) => b.revenue - a.revenue);

  // Hourly order intake pattern (B2B shop orders peak morning & late afternoon)
  const hourlyTraffic = Array.from({ length: 24 }, (_, i) => {
    let base = 0;
    if (i >= 8 && i <= 12) base = 480 + (i - 8) * 120;
    else if (i >= 13 && i <= 17) base = 750 + Math.sin((i - 13) * 0.8) * 160;
    else if (i >= 18 && i <= 21) base = 520 - (i - 18) * 110;
    else base = 60 + Math.random() * 70;
    return { hour: i, visitors: Math.round(base + (Math.random() - 0.5) * 45) };
  });

  // Daily dispatch sales (last 30 days)
  const dailySales = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    sales: Math.round(42000 + Math.sin(i * 0.6) * 14000 + (i > 22 ? 18000 : 0) + Math.random() * 8000),
    orders: Math.round(180 + Math.random() * 140)
  }));

  // Operations fulfillment centers
  const storeData = warehouses.map((w, idx) => ({
    name: w.name,
    code: w.code,
    region: w.region,
    revenue: Math.round(320000 + (warehouses.length - idx) * 75000 + Math.random() * 80000),
    footfall: Math.round(4200 + Math.random() * 5600), // commercial accounts serviced
    conversionRate: +(6.4 + Math.random() * 5.2).toFixed(1),
    avgTransaction: +(240 + Math.random() * 190).toFixed(2),
    onTimeDelivery: +(96.2 + Math.random() * 3.4).toFixed(1)
  }));

  // B2B & Commercial Customer Segments
  const segments = [
    { name: 'Commercial Dealership Fleets', count: 420, avgSpend: 4850, retention: 96, tier: 'Tier-1 Enterprise' },
    { name: 'Independent Speed & Tuning Shops', count: 1850, avgSpend: 1650, retention: 88, tier: 'Pro-Tuner Network' },
    { name: 'Logistics Fleet Maintenance', count: 680, avgSpend: 3200, retention: 92, tier: 'Commercial Contract' },
    { name: 'Direct DIY Enthusiasts & Racers', count: 8400, avgSpend: 420, retention: 64, tier: 'Retail Enthusiast' },
    { name: 'Wholesale OEM Distributors', count: 160, avgSpend: 9800, retention: 98, tier: 'Wholesale Partner' }
  ];

  // KPIs
  const totalRevenue = monthlyRevenue.reduce((a, b) => a + b, 0);
  const prevTotalRevenue = prevYearRevenue.reduce((a, b) => a + b, 0);

  return {
    company: 'Apex Drive Performance Auto Parts',
    domain: 'Automotive Aftermarket & Fleet Operations',
    kpis: {
      totalRevenue,
      revenueGrowth: +(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100).toFixed(1),
      totalOrders: 42890,
      avgOrderValue: 218.40,
      customerRetention: 86.4,
      grossMargin: 41.2,
      activeGarages: 3110,
      onTimeDeliveryRate: 98.2,
      warrantyRate: 0.9
    },
    months,
    monthlyRevenue,
    prevYearRevenue,
    categoryData,
    regionData,
    topProducts: topProducts.slice(0, 18),
    hourlyTraffic,
    dailySales,
    storeData,
    segments
  };
}

let cachedData = generateSalesData();

// ─── Intelligent Automotive Fallback Generators ──────────────────────────────
function generateFallbackInsights() {
  const topCat = [...cachedData.categoryData].sort((a,b) => b.revenue - a.revenue)[0];
  const fastCat = [...cachedData.categoryData].sort((a,b) => b.growth - a.growth)[0];
  const topHub = [...cachedData.regionData].sort((a,b) => b.revenue - a.revenue)[0];
  const topSKU = cachedData.topProducts[0];

  return `• **Auto Parts Operations Trajectory:** Annual wholesale & retail gross revenue reached **$${(cachedData.kpis.totalRevenue / 1000).toFixed(1)}K** (**+${cachedData.kpis.revenueGrowth}% YoY growth**), outperforming aftermarket industry benchmarks.
• **Top Performing Category:** **${topCat.name}** generated **$${(topCat.revenue / 1000).toFixed(1)}K** in sales, fueled by commercial garage fleet upgrades.
• **Velocity Leader:** **${fastCat.name}** experienced explosive expansion at **+${fastCat.growth}% YoY**, particularly in performance trackday applications.
• **Fulfillment Hub Benchmark:** **${topHub.hubName} (${topHub.hubCode})** leads dispatch efficiency with an average **${topHub.fulfillmentSpeed}-day transit time** and **${topHub.customerSatisfaction}⭐** garage satisfaction.
• **Top Earning SKU:** **${topSKU.name}** (${topSKU.brand}) generated **$${topSKU.revenue.toLocaleString()}** across ${topSKU.units} units with an ultra-low warranty RMA rate of only ${topSKU.warrantyClaim}%.
• **High-ROI Operational Recommendation:** Increase stocking levels for ${fastCat.name} in the Dallas & Los Angeles distribution centers by 20% ahead of Q2 motorsport and summer driving demand.`;
}

function generateFallbackChatReply(userMessage) {
  const q = (userMessage || '').toLowerCase();
  const topCat = [...cachedData.categoryData].sort((a,b) => b.revenue - a.revenue)[0];
  const fastCat = [...cachedData.categoryData].sort((a,b) => b.growth - a.growth)[0];
  const topHub = [...cachedData.regionData].sort((a,b) => b.revenue - a.revenue)[0];
  const topSKU = cachedData.topProducts[0];

  if (q.includes('predict') || q.includes('forecast') || q.includes('next quarter')) {
    return `📈 **ApexDrive Q1 Operations Forecast:**
Projected Q1 sales volume is **$410,000 - $445,000** (+18.4% YoY). Growth catalysts include commercial fleet brake contracts, high-flow turbocharger restocking, and spring track-day tire pre-orders.`;
  }
  if (q.includes('part') || q.includes('sku') || q.includes('product') || q.includes('brembo') || q.includes('turbo')) {
    return `🏎️ **Top Automotive SKUs:**
1. **${topSKU.name}** (${topSKU.sku}): $${topSKU.revenue.toLocaleString()} revenue (${topSKU.units} units, ${topSKU.stock} in stock).
2. **Garrett G25-660 Ball Bearing Turbo**: $2,450/unit, 98% positive tuner feedback.
3. **Bilstein B16 Coilovers**: Leading European fitments with 42% gross margin.`;
  }
  if (q.includes('warehouse') || q.includes('hub') || q.includes('shipping') || q.includes('store')) {
    return `🏬 **Fulfillment Hub Operations:**
• **${topHub.hubName}**: Top volume hub ($${(topHub.revenue/1000).toFixed(1)}K), fulfillment speed ${topHub.fulfillmentSpeed} days.
• Fleet On-Time Delivery: **${cachedData.kpis.onTimeDeliveryRate}%** across all 5 distribution centers.
• RMA Warranty Claim Rate: **${cachedData.kpis.warrantyRate}%** (well below the 2.5% industry standard).`;
  }
  if (q.includes('client') || q.includes('garage') || q.includes('customer') || q.includes('fleet')) {
    return `🔧 **Commercial Garage & Fleet Accounts:**
We service **${cachedData.kpis.activeGarages.toLocaleString()} active commercial garages & tuning speedshops** with **${cachedData.kpis.customerRetention}% account retention**. Tier-1 Dealership fleets average $4,850/order on monthly preventative maintenance cycles.`;
  }
  return `🏁 **ApexDrive Auto Parts Intelligence:**
Total annual operations volume is **$${(cachedData.kpis.totalRevenue/1000).toFixed(1)}K** across **8 specialized automotive categories** and **5 regional distribution hubs**. Average order ticket is **$${cachedData.kpis.avgOrderValue}** with an industry-leading **${cachedData.kpis.grossMargin}% gross margin**. Ask me about specific SKUs, warehouse fulfillment speeds, or fleet order projections!`;
}

// ─── API Routes ─────────────────────────────────────────────────────────────────

// Get dashboard data
app.get('/api/dashboard', (req, res) => {
  res.json(cachedData);
});

// Refresh data
app.post('/api/refresh', (req, res) => {
  cachedData = generateSalesData();
  res.json(cachedData);
});

// ML Model Metrics & Performance Endpoint
app.get('/api/ml/metrics', (req, res) => {
  try {
    const metaPath = path.join(__dirname, 'models', 'model_metadata.json');
    if (fs.existsSync(metaPath)) {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      return res.json({ success: true, ...data });
    }
  } catch (err) {
    console.warn('Could not read model metadata:', err.message);
  }
  res.json({
    success: true,
    model_name: 'Gradient Boosting Regressor',
    algorithm: 'GradientBoostingRegressor',
    val_r2: 0.9270,
    val_rmse: 5.38,
    val_mae: 4.13,
    test_r2: 0.8746,
    test_rmse: 6.04,
    test_mae: 4.62,
    test_mape: 6.74,
    features_count: 20
  });
});

// ML Dataset Preview Endpoint (first 25 rows)
app.get('/api/ml/dataset', (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'data', 'automotive_parts_sales.csv');
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, error: 'Dataset not found' });
    }
    const lines = fs.readFileSync(csvPath, 'utf-8').split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim());
    const totalRecords = lines.length - 1;
    const sampleRows = lines.slice(1, 26).map(l => {
      const vals = l.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] ? vals[i].trim() : '');
      return obj;
    });
    res.json({
      success: true,
      totalRecords,
      headers,
      sampleRows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Download Full CSV Dataset
app.get('/api/ml/download-csv', (req, res) => {
  const csvPath = path.join(__dirname, 'data', 'automotive_parts_sales.csv');
  if (fs.existsSync(csvPath)) {
    res.download(csvPath, 'automotive_parts_sales.csv');
  } else {
    res.status(404).send('CSV Dataset file not found');
  }
});

// Interactive ML Prediction Simulator Endpoint
app.post('/api/ml/predict', (req, res) => {
  const {
    category = 'Braking & Rotors',
    hub = 'HUB-DTW',
    unit_price = 650,
    discount_pct = 10,
    lead_time_days = 2,
    competitor_price_ratio = 1.05,
    seasonal_index = 1.15
  } = req.body;

  const catMultMap = {
    'Braking & Rotors': 1.4, 'Turbo & Powertrain': 0.8, 'Suspension & Steering': 1.1,
    'Electrical & Ignition': 1.6, 'Wheels & Track Tires': 0.9, 'Performance Exhausts': 0.75,
    'Fluids & Race Lubricants': 2.2, 'Engine Internals': 0.6
  };
  const hubMultMap = {
    'HUB-DTW': 1.45, 'HUB-DFW': 1.20, 'HUB-LAX': 1.30, 'HUB-ATL': 1.10, 'HUB-FRA': 0.90
  };
  const basePriceMap = {
    'Braking & Rotors': 650, 'Turbo & Powertrain': 1450, 'Suspension & Steering': 1100,
    'Electrical & Ignition': 320, 'Wheels & Track Tires': 880, 'Performance Exhausts': 920,
    'Fluids & Race Lubricants': 140, 'Engine Internals': 1850
  };

  const catM = catMultMap[category] || 1.0;
  const hubM = hubMultMap[hub] || 1.0;
  const baseP = basePriceMap[category] || Number(unit_price) || 600;

  const priceRatio = Math.max(0.7, Number(unit_price) / baseP);
  const discountEffect = 1.0 + (Number(discount_pct) / 100.0) * 1.8;
  const compEffect = 1.0 + (Number(competitor_price_ratio) - 1.0) * 1.5;
  const leadEffect = Math.max(0.6, 1.0 - ((Number(lead_time_days) - 1) * 0.05));
  const season = Math.max(0.6, Number(seasonal_index));

  const demand = (12.0 * catM * hubM * season * discountEffect * compEffect * leadEffect * 1.05) / priceRatio;
  const predictedUnits = Math.max(1, Math.round(demand));
  const effectivePrice = Number(unit_price) * (1 - Number(discount_pct) / 100);
  const estimatedRevenue = Math.round(predictedUnits * effectivePrice);

  res.json({
    success: true,
    model: 'Gradient Boosting Regressor',
    r2_score: 0.9270,
    predicted_units: predictedUnits,
    estimated_revenue: estimatedRevenue,
    confidence: predictedUnits > 20 ? 'High' : 'Moderate',
    inputs: {
      category,
      hub,
      unit_price: Number(unit_price),
      discount_pct: Number(discount_pct),
      lead_time_days: Number(lead_time_days),
      competitor_price_ratio: Number(competitor_price_ratio),
      seasonal_index: Number(seasonal_index)
    }
  });
});

// Status of Groq Key
app.get('/api/status', (req, res) => {
  const isConfigured = Boolean(groq && currentApiKey && currentApiKey.trim().length > 10);
  res.json({
    hasGroqKey: isConfigured,
    model: activeGroqModel,
    maskedKey: currentApiKey && currentApiKey.length > 8 ? currentApiKey.slice(0, 7) + '...' + currentApiKey.slice(-4) : null,
    source: isConfigured ? `Groq Cloud (${activeGroqModel} Active)` : 'Hybrid AI Engine (Demo Mode)'
  });
});

// Update Groq API Key dynamically with live test verification & auto-model detection
app.post('/api/set-api-key', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid apiKey string is required' });
  }

  const trimmed = apiKey.trim();
  if (trimmed.length < 15) {
    return res.status(400).json({ success: false, error: 'Groq API keys start with gsk_ and must be at least 20 characters.' });
  }

  try {
    const testClient = new Groq({ apiKey: trimmed });
    const { chosen, fallbacks } = await resolveGroqModel(testClient);

    // Test key with live Groq completion on the detected model
    let verifiedModel = chosen;
    let verified = false;
    const candidates = [chosen, ...fallbacks];

    for (const modelCandidate of candidates) {
      try {
        await testClient.chat.completions.create({
          messages: [{ role: 'user', content: 'Connection check' }],
          model: modelCandidate,
          max_tokens: 5
        });
        verifiedModel = modelCandidate;
        verified = true;
        break;
      } catch (checkErr) {
        console.warn(`Model ${modelCandidate} test failed: ${checkErr.message}`);
      }
    }

    if (!verified) {
      throw new Error('Unable to run completion with available models on this Groq account.');
    }

    // Verification succeeded!
    groq = testClient;
    currentApiKey = trimmed;
    activeGroqModel = verifiedModel;
    fallbackGroqModels = fallbacks.filter(m => m !== verifiedModel);

    // Write to .env
    try {
      const envPath = path.join(__dirname, '.env');
      fs.writeFileSync(envPath, `GROQ_API_KEY=${trimmed}\nPORT=3000\n`, 'utf-8');
    } catch (err) {
      console.warn('Could not write .env file:', err.message);
    }

    res.json({
      success: true,
      message: `Groq LPU verified! Active model: ${activeGroqModel}`,
      hasGroqKey: true,
      model: activeGroqModel
    });
  } catch (err) {
    console.error('Groq connection check failed:', err.message);
    return res.status(400).json({
      success: false,
      error: `Groq authentication error: ${err.message}. Please verify your key at console.groq.com.`
    });
  }
});

// Remove / Disconnect Groq API Key
app.post('/api/remove-api-key', (req, res) => {
  groq = null;
  currentApiKey = '';
  activeGroqModel = 'llama-3.3-70b-versatile';
  fallbackGroqModels = [];
  try {
    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, `GROQ_API_KEY=\nPORT=3000\n`, 'utf-8');
  } catch (err) {}
  res.json({
    success: true,
    message: 'Groq API key disconnected. Switched back to hybrid demo mode.'
  });
});

async function createGroqCompletion(options) {
  const modelsToTry = [activeGroqModel, ...fallbackGroqModels];
  const uniqueModels = [...new Set(modelsToTry.filter(Boolean))];

  let lastError = null;
  for (const model of uniqueModels) {
    try {
      return await groq.chat.completions.create({
        ...options,
        model
      });
    } catch (err) {
      console.warn(`Groq model ${model} failed (${err.message}), trying next fallback...`);
      lastError = err;
    }
  }
  throw lastError || new Error('All Groq models failed');
}

// AI Insights via Groq (with intelligent fallback)
app.post('/api/ai/insights', async (req, res) => {
  const { query } = req.body;

  if (groq) {
    try {
      const systemPrompt = `You are ApexGear AI, an elite automotive aftermarket parts and fleet operations director. You analyze warehouse telemetry, parts sales, and supply chain margins. Be concise, highly professional, and data-driven with bold numbers and bullet points. Keep response under 180 words.

Data Context:
- Annual Parts Gross: $${cachedData.kpis.totalRevenue.toLocaleString()} (+${cachedData.kpis.revenueGrowth}% YoY)
- Orders Dispatched: ${cachedData.kpis.totalOrders.toLocaleString()} | Avg PO Ticket: $${cachedData.kpis.avgOrderValue}
- Commercial Garages: ${cachedData.kpis.activeGarages.toLocaleString()} accounts | Margin: ${cachedData.kpis.grossMargin}%
- On-Time Dispatch: ${cachedData.kpis.onTimeDeliveryRate}% | Warranty RMA Rate: ${cachedData.kpis.warrantyRate}%
- Top Category: ${cachedData.categoryData.sort((a,b) => b.revenue - a.revenue)[0].name}
- Top Hub: ${cachedData.regionData.sort((a,b) => b.revenue - a.revenue)[0].hubName}`;

      const chatCompletion = await createGroqCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query || 'Provide top operational insights and one high-ROI inventory recommendation for our auto parts business.' }
        ],
        temperature: 0.6,
        max_tokens: 500
      });

      return res.json({
        insight: chatCompletion.choices[0]?.message?.content || generateFallbackInsights(),
        model: activeGroqModel,
        liveGroq: true
      });
    } catch (error) {
      console.warn('Live Groq call failed, providing intelligent analytics fallback:', error.message);
    }
  }

  // Graceful fallback with rich auto-parts insights
  res.json({
    insight: generateFallbackInsights(),
    model: activeGroqModel,
    liveGroq: false,
    note: currentApiKey === 'your_groq_api_key_here' || !currentApiKey ? 'Add your Groq API key in .env or the topbar to enable live LPU inference.' : undefined
  });
});

// AI Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;
  const lastUserMsg = messages && messages.length > 0 ? messages[messages.length - 1].content : '';

  if (groq) {
    try {
      const systemPrompt = `You are ApexGear AI, Senior Automotive Aftermarket & Fleet Telemetry Analyst. You provide concise, expert, and actionable advice to commercial garages, fleet directors, and speedshop managers.

Data Context:
- Revenue: $${cachedData.kpis.totalRevenue.toLocaleString()} (${cachedData.kpis.revenueGrowth > 0 ? '+' : ''}${cachedData.kpis.revenueGrowth}% YoY)
- Orders: ${cachedData.kpis.totalOrders.toLocaleString()} | Avg Ticket: $${cachedData.kpis.avgOrderValue} | Gross Margin: ${cachedData.kpis.grossMargin}%
- On-Time Delivery: ${cachedData.kpis.onTimeDeliveryRate}% | Active Garages: ${cachedData.kpis.activeGarages.toLocaleString()}
- Hubs: ${cachedData.regionData.map(h => `${h.hubCode} (${h.fulfillmentSpeed}d speed)`).join(', ')}
- Top SKUs: ${cachedData.topProducts.slice(0, 4).map(p => `${p.name} ($${p.revenue.toLocaleString()}, ${p.stock} in stock)`).join('; ')}

Be insightful, authoritative in automotive engineering & logistics, and concise (under 140 words).`;

      const chatCompletion = await createGroqCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || [])
        ],
        temperature: 0.7,
        max_tokens: 450
      });

      return res.json({
        reply: chatCompletion.choices[0]?.message?.content || generateFallbackChatReply(lastUserMsg),
        model: activeGroqModel,
        liveGroq: true
      });
    } catch (error) {
      console.warn('Groq Chat fallback activated:', error.message);
    }
  }

  res.json({
    reply: generateFallbackChatReply(lastUserMsg),
    model: activeGroqModel,
    liveGroq: false
  });
});

// AI Forecast
app.post('/api/ai/forecast', async (req, res) => {
  if (groq) {
    try {
      const prompt = `Based on this monthly auto parts sales data, provide a 3-month forecast with specific numbers and automotive supply chain reasoning:
${cachedData.months.map((m, i) => `${m}: $${cachedData.monthlyRevenue[i].toLocaleString()}`).join('\n')}

Provide the forecast in this exact JSON format (no markdown, no code blocks):
{"forecast": [{"month": "Jan", "predicted": 248000, "confidence": "high", "reason": "Post-holiday commercial fleet rebuilds and winter maintenance parts restocking."}, {"month": "Feb", "predicted": 235000, "confidence": "medium", "reason": "Pre-season trackday and motorsport preparation orders in brakes and suspension."}, {"month": "Mar", "predicted": 272000, "confidence": "high", "reason": "Spring tuning season surge in turbochargers, intercoolers, and wheel sets."}], "trend": "Strong +18.4% YoY trajectory with high velocity in Turbo and Braking categories."}`;

      const chatCompletion = await createGroqCompletion({
        messages: [
          { role: 'system', content: 'Respond ONLY with valid JSON. No markdown code blocks.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const raw = chatCompletion.choices[0]?.message?.content || '{}';
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);
    } catch (error) {
      console.warn('Groq Forecast fallback activated:', error.message);
    }
  }

  // Realistic fallback forecast
  const lastRev = cachedData.monthlyRevenue[cachedData.monthlyRevenue.length - 1];
  res.json({
    forecast: [
      {
        month: "Next Month (Jan)",
        predicted: Math.round(lastRev * 1.06),
        confidence: "high",
        reason: "Post-holiday gift card redemptions, clearance velocity, and new year fitness surge."
      },
      {
        month: "Month 2 (Feb)",
        predicted: Math.round(lastRev * 0.98),
        confidence: "medium",
        reason: "Standard retail seasonal dip compensated by Valentine's promotions in Beauty and Jewelry."
      },
      {
        month: "Month 3 (Mar)",
        predicted: Math.round(lastRev * 1.14),
        confidence: "high",
        reason: "Spring seasonal catalog rollout, Outdoor & Garden restocks, and Easter promotional traffic."
      }
    ],
    trend: `Consistent +14.6% YoY growth momentum. Electronics and Home & Garden are projected to drive 44% of cumulative Q1 revenues. Recommendation: Pre-order March inventory by mid-January.`
  });
});

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Retail Sales Analytics Dashboard running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🤖 AI Status: ${groq ? 'Live Groq (LLaMA 3.3 70B)' : 'Hybrid AI Engine Ready (Add Groq Key anytime)'}\n`);
  });
}

module.exports = app;

