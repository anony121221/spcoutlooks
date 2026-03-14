const API_BASE = (window.SPC_CONFIG && window.SPC_CONFIG.apiBase || '').replace(/\/$/, '');
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 760;
const PADDING = 36;

const DAY_CONFIG = {
  day1: {
    label: 'DAY 1',
    apiDay: '1',
    layers: [
      { key: 'categorical', label: 'CATEGORICAL' },
      { key: 'tornado', label: 'TORNADO' },
      { key: 'wind', label: 'WIND' },
      { key: 'hail', label: 'HAIL' }
    ]
  },
  day2: {
    label: 'DAY 2',
    apiDay: '2',
    layers: [
      { key: 'categorical', label: 'CATEGORICAL' },
      { key: 'tornado', label: 'TORNADO' },
      { key: 'wind', label: 'WIND' },
      { key: 'hail', label: 'HAIL' }
    ]
  },
  day3: {
    label: 'DAY 3',
    apiDay: '3',
    layers: [
      { key: 'categorical', label: 'CATEGORICAL' },
      { key: 'any_severe', label: 'PROBABILISTIC' }
    ]
  },
  day4_8: {
    label: 'DAY 4-8',
    apiDay: '4-8',
    layers: [
      { key: 'any_severe', label: 'SEVERE' }
    ]
  }
};

const COLOR_TABLE = {
  categorical: {
    TSTM: { fill: '#C1E9C1', stroke: '#646464', label: 'TSTM' },
    MRGL: { fill: '#80C580', stroke: '#3C783C', label: 'MRGL' },
    SLGT: { fill: '#F7F780', stroke: '#FF9600', label: 'SLGT' },
    ENH:  { fill: '#E6C280', stroke: '#FF7F00', label: 'ENH' },
    MDT:  { fill: '#E68080', stroke: '#CD0000', label: 'MDT' },
    HIGH: { fill: '#FF80FF', stroke: '#FF00FF', label: 'HIGH' }
  },
  tornado: {
    '0.02': { fill: '#80C580', stroke: '#3C783C', label: '2%' },
    '0.05': { fill: '#C5A393', stroke: '#8B4726', label: '5%' },
    '0.10': { fill: '#FFEB80', stroke: '#FF9600', label: '10%' },
    '0.15': { fill: '#FF8080', stroke: '#FF0000', label: '15%' },
    '0.30': { fill: '#FF80FF', stroke: '#FF00FF', label: '30%' },
    '0.45': { fill: '#C896F7', stroke: '#9636EE', label: '45%' },
    '0.60': { fill: '#5C85D6', stroke: '#3962B3', label: '60%' }
  },
  wind: {
    '0.05': { fill: '#C5A393', stroke: '#8B4726', label: '5%' },
    '0.15': { fill: '#FAE77B', stroke: '#FF9600', label: '15%' },
    '0.30': { fill: '#FF8080', stroke: '#CD0000', label: '30%' },
    '0.45': { fill: '#FF80FF', stroke: '#FF00FF', label: '45%' },
    '0.60': { fill: '#C895F6', stroke: '#912CEE', label: '60%' },
    '0.75': { fill: '#5C85D6', stroke: '#3962B3', label: '75%' },
    '0.90': { fill: '#1AFFFF', stroke: '#46ACE3', label: '90%' }
  },
  hail: {
    '0.05': { fill: '#C5A393', stroke: '#8B4726', label: '5%' },
    '0.15': { fill: '#FAE77B', stroke: '#FF9600', label: '15%' },
    '0.30': { fill: '#FF8080', stroke: '#CD0000', label: '30%' },
    '0.45': { fill: '#FF80FF', stroke: '#FF00FF', label: '45%' },
    '0.60': { fill: '#C895F6', stroke: '#912CEE', label: '60%' }
  },
  any_severe: {
    '0.05': { fill: '#C5A393', stroke: '#8B4726', label: '5%' },
    '0.15': { fill: '#FAE77B', stroke: '#FF9600', label: '15%' },
    '0.30': { fill: '#FF8080', stroke: '#CD0000', label: '30%' },
    '0.45': { fill: '#C895F6', stroke: '#FF00FF', label: '45%' },
    '0.60': { fill: '#7FF7F7', stroke: '#6E4D96', label: '60%' },
    day48_15: { fill: '#F8F781', stroke: '#DC9E29', label: '15%' },
    day48_30: { fill: '#E7C281', stroke: '#E78920', label: '30%' }
  }
};

const state = {
  currentDay: 'day1',
  currentLayer: 'categorical',
  currentSubday: 4,
  showCig: true,
  dataCache: new Map(),
  basemap: null
};

const els = {
  dayRow: document.getElementById('dayRow'),
  layerRow: document.getElementById('layerRow'),
  subdayRow: document.getElementById('subdayRow'),
  legend: document.getElementById('legend'),
  legendTitle: document.getElementById('legendTitle'),
  statusText: document.getElementById('statusText'),
  metaIssued: document.getElementById('metaIssued'),
  metaValid: document.getElementById('metaValid'),
  metaProduct: document.getElementById('metaProduct'),
  showCig: document.getElementById('showCig'),
  mapSvg: document.getElementById('mapSvg')
};

function clearElement(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function createButton(label, active, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn${active ? ' active' : ''}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function buildControls() {
  clearElement(els.dayRow);
  clearElement(els.layerRow);
  clearElement(els.subdayRow);

  Object.entries(DAY_CONFIG).forEach(([key, cfg]) => {
    els.dayRow.appendChild(createButton(cfg.label, state.currentDay === key, async () => {
      state.currentDay = key;
      state.currentLayer = cfg.layers[0].key;
      await ensureDataLoaded();
      buildControls();
      render();
    }));
  });

  DAY_CONFIG[state.currentDay].layers.forEach(layer => {
    els.layerRow.appendChild(createButton(layer.label, state.currentLayer === layer.key, () => {
      state.currentLayer = layer.key;
      buildControls();
      render();
    }));
  });

  if (state.currentDay === 'day4_8') {
    for (let day = 4; day <= 8; day += 1) {
      els.subdayRow.appendChild(createButton(`DAY ${day}`, state.currentSubday === day, () => {
        state.currentSubday = day;
        buildControls();
        render();
      }));
    }
  }
}

function projectAlbers(lon, lat) {
  const deg = Math.PI / 180;
  const phi1 = 29.5 * deg;
  const phi2 = 45.5 * deg;
  const phi0 = 37.5 * deg;
  const lambda0 = -96 * deg;
  const phi = lat * deg;
  const lambda = lon * deg;

  const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
  const c = Math.cos(phi1) ** 2 + 2 * n * Math.sin(phi1);
  const rho = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
  const rho0 = Math.sqrt(c - 2 * n * Math.sin(phi0)) / n;
  const theta = n * (lambda - lambda0);

  return {
    x: rho * Math.sin(theta),
    y: rho0 - rho * Math.cos(theta)
  };
}

function fitProjection(boundsSource) {
  const pts = [];
  boundsSource.forEach(ring => {
    ring.forEach(([lon, lat]) => pts.push(projectAlbers(lon, lat)));
  });
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const scale = Math.min(
    (MAP_WIDTH - PADDING * 2) / (maxX - minX),
    (MAP_HEIGHT - PADDING * 2) / (maxY - minY)
  );
  const offsetX = PADDING + (MAP_WIDTH - PADDING * 2 - (maxX - minX) * scale) / 2;
  const offsetY = PADDING + (MAP_HEIGHT - PADDING * 2 - (maxY - minY) * scale) / 2;

  return (lon, lat) => {
    const p = projectAlbers(lon, lat);
    return {
      x: offsetX + (p.x - minX) * scale,
      y: offsetY + (p.y - minY) * scale
    };
  };
}

function polygonToPath(polygons, project) {
  return polygons.map(ring => {
    const parts = ring.map(([lon, lat], index) => {
      const p = project(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    });
    return `${parts.join(' ')} Z`;
  }).join(' ');
}

function svgEl(name, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function drawDefs(svg) {
  const defs = svgEl('defs');

  defs.appendChild(buildPattern('cig1Pattern', 8, 'M0,8 L8,0', 1.2));
  defs.appendChild(buildPattern('cig2Pattern', 8, 'M0,0 L8,8', 1.2));
  defs.appendChild(buildPattern('cig3Pattern', 8, 'M0,0 L8,8 M0,8 L8,0', 1.2));

  svg.appendChild(defs);
}

function buildPattern(id, size, d, strokeWidth) {
  const pattern = svgEl('pattern', {
    id,
    patternUnits: 'userSpaceOnUse',
    width: String(size),
    height: String(size)
  });
  pattern.appendChild(svgEl('rect', {
    width: String(size),
    height: String(size),
    fill: 'rgba(0,0,0,0)'
  }));
  pattern.appendChild(svgEl('path', {
    d,
    stroke: '#111111',
    'stroke-width': String(strokeWidth),
    fill: 'none'
  }));
  return pattern;
}

async function ensureDataLoaded() {
  const cfg = DAY_CONFIG[state.currentDay];
  if (state.dataCache.has(cfg.apiDay)) return;
  if (!API_BASE || API_BASE.includes('replace-with-your-worker')) {
    els.statusText.innerHTML = '<span class="error">Set site/config.js to your Worker URL.</span>';
    return;
  }

  els.statusText.textContent = `Fetching ${cfg.label}...`;
  const url = `${API_BASE}/api/outlook?day=${encodeURIComponent(cfg.apiDay)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }
  const payload = await response.json();
  state.dataCache.set(cfg.apiDay, payload);
  els.statusText.textContent = `Updated ${new Date(payload.fetchedAt).toLocaleTimeString()}`;
}

async function loadBasemap() {
  const response = await fetch('./assets/conus-outline.json', { cache: 'force-cache' });
  state.basemap = await response.json();
}

function getCurrentData() {
  const cfg = DAY_CONFIG[state.currentDay];
  return state.dataCache.get(cfg.apiDay) || null;
}

function getCurrentFeatureSet(data) {
  if (!data) return [];

  if (state.currentDay === 'day4_8') {
    const dayKey = String(state.currentSubday);
    const block = data.days && data.days[dayKey];
    if (!block) return [];
    return (block.any_severe || []).filter(feature => feature.kind !== 'cig');
  }

  const list = (data.hazards && data.hazards[state.currentLayer]) || [];
  if (state.showCig) return list;
  return list.filter(feature => feature.kind !== 'cig');
}

function getColorSpec(layerKey, feature) {
  if (layerKey === 'categorical') {
    return COLOR_TABLE.categorical[feature.level] || { fill: '#999999', stroke: '#cccccc', label: feature.level };
  }

  if (state.currentDay === 'day4_8') {
    if (feature.level === '0.15') return COLOR_TABLE.any_severe.day48_15;
    if (feature.level === '0.30') return COLOR_TABLE.any_severe.day48_30;
  }

  return (COLOR_TABLE[layerKey] && COLOR_TABLE[layerKey][feature.level]) || { fill: '#999999', stroke: '#dddddd', label: feature.level };
}

function renderLegend(data) {
  clearElement(els.legend);
  const layerKey = state.currentLayer;
  const titleParts = [DAY_CONFIG[state.currentDay].label];
  if (state.currentDay === 'day4_8') {
    titleParts.push(`DAY ${state.currentSubday}`);
  }
  titleParts.push(layerKey === 'any_severe' ? 'SEVERE' : layerKey.toUpperCase());
  els.legendTitle.textContent = titleParts.join(' • ');

  const featureSet = getCurrentFeatureSet(data);
  const levels = [];
  featureSet.forEach(feature => {
    if (feature.kind === 'cig') return;
    if (!levels.includes(feature.level)) levels.push(feature.level);
  });

  levels.sort((a, b) => parseFloat(a) - parseFloat(b));
  if (layerKey === 'categorical') {
    const order = ['TSTM', 'MRGL', 'SLGT', 'ENH', 'MDT', 'HIGH'];
    levels.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  levels.forEach(level => {
    const spec = getColorSpec(layerKey, { level });
    const item = document.createElement('div');
    item.className = 'legend-item';
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = spec.fill;
    swatch.style.borderColor = spec.stroke;
    const label = document.createElement('div');
    label.textContent = spec.label;
    item.appendChild(swatch);
    item.appendChild(label);
    els.legend.appendChild(item);
  });

  if (state.showCig && state.currentDay !== 'day4_8' && layerKey !== 'categorical') {
    const cigLevels = featureSet.filter(feature => feature.kind === 'cig').map(feature => feature.level);
    if (cigLevels.length) {
      const seen = new Set();
      const heading = document.createElement('div');
      heading.className = 'legend-subhead';
      heading.textContent = 'Intensity';
      els.legend.appendChild(heading);
      ['CIG1', 'CIG2', 'CIG3'].forEach(level => {
        if (!cigLevels.includes(level) || seen.has(level)) return;
        seen.add(level);
        const item = document.createElement('div');
        item.className = 'legend-item';
        const swatch = document.createElement('div');
        swatch.className = 'pattern-swatch';
        swatch.style.background = `url(#${level.toLowerCase()}Pattern)`;
        swatch.style.backgroundColor = '#cfcfcf';
        swatch.style.borderColor = '#666';
        const label = document.createElement('div');
        label.textContent = level.replace('CIG', 'CIG ');
        item.appendChild(swatch);
        item.appendChild(label);
        els.legend.appendChild(item);
      });
    }
  }
}

function renderMeta(data) {
  els.metaIssued.textContent = `Issued: ${data?.issued || '--'}`;
  els.metaValid.textContent = `Valid: ${data?.valid || '--'}`;
  els.metaProduct.textContent = `Product: ${data?.product || '--'}`;
}

function renderMap(data) {
  clearElement(els.mapSvg);
  els.mapSvg.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
  drawDefs(els.mapSvg);

  const conusRings = state.basemap.coordinates;
  const featureSet = getCurrentFeatureSet(data);
  const project = fitProjection(conusRings.concat(...featureSet.map(f => f.polygons)));

  els.mapSvg.appendChild(svgEl('rect', {
    x: '0', y: '0', width: String(MAP_WIDTH), height: String(MAP_HEIGHT), fill: '#0f141a'
  }));

  drawGrid(els.mapSvg, project);

  els.mapSvg.appendChild(svgEl('path', {
    d: polygonToPath(conusRings, project),
    fill: '#181d23',
    stroke: '#7a848f',
    'stroke-width': '2.2'
  }));

  featureSet
    .filter(feature => feature.kind !== 'cig')
    .sort((a, b) => {
      const na = parseFloat(a.level) || 0;
      const nb = parseFloat(b.level) || 0;
      return na - nb;
    })
    .forEach(feature => {
      const spec = getColorSpec(state.currentLayer, feature);
      els.mapSvg.appendChild(svgEl('path', {
        d: polygonToPath(feature.polygons, project),
        fill: spec.fill,
        stroke: spec.stroke,
        'stroke-width': '2.4',
        'fill-opacity': '0.88'
      }));
    });

  if (state.showCig && state.currentDay !== 'day4_8' && state.currentLayer !== 'categorical') {
    featureSet
      .filter(feature => feature.kind === 'cig')
      .forEach(feature => {
        const spec = getColorSpec(state.currentLayer, feature.base || feature);
        const patternId = `${feature.level.toLowerCase()}Pattern`;
        els.mapSvg.appendChild(svgEl('path', {
          d: polygonToPath(feature.polygons, project),
          fill: `url(#${patternId})`,
          stroke: spec.stroke,
          'stroke-width': '1.2',
          'fill-opacity': '1'
        }));
      });
  }

  drawCornerText(els.mapSvg, data);
}

function drawGrid(svg, project) {
  const latLines = [25, 30, 35, 40, 45, 50];
  const lonLines = [-125, -115, -105, -95, -85, -75, -65];

  latLines.forEach(lat => {
    const points = [];
    for (let lon = -125; lon <= -66; lon += 1) {
      points.push(project(lon, lat));
    }
    svg.appendChild(svgEl('path', {
      d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
      fill: 'none',
      stroke: '#20262e',
      'stroke-width': '1'
    }));
  });

  lonLines.forEach(lon => {
    const points = [];
    for (let lat = 24; lat <= 50; lat += 1) {
      points.push(project(lon, lat));
    }
    svg.appendChild(svgEl('path', {
      d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
      fill: 'none',
      stroke: '#20262e',
      'stroke-width': '1'
    }));
  });
}

function drawCornerText(svg, data) {
  const top = svgEl('g', { transform: 'translate(28 34)' });
  const label = `${DAY_CONFIG[state.currentDay].label} ${state.currentDay === 'day4_8' ? `DAY ${state.currentSubday} ` : ''}${DAY_CONFIG[state.currentDay].layers.find(x => x.key === state.currentLayer).label}`;
  top.appendChild(svgText(label, 0, 0, 'map-label'));
  top.appendChild(svgText(`Issued ${data?.issued || '--'}`, 0, 28, 'map-subtext'));
  top.appendChild(svgText(`Valid ${data?.valid || '--'}`, 0, 50, 'map-subtext'));
  svg.appendChild(top);
}

function svgText(text, x, y, className) {
  const node = svgEl('text', { x: String(x), y: String(y), class: className });
  node.textContent = text;
  return node;
}

function render() {
  const data = getCurrentData();
  renderMeta(data);
  renderLegend(data);
  renderMap(data);
}

async function refreshCurrentDay() {
  const cfg = DAY_CONFIG[state.currentDay];
  state.dataCache.delete(cfg.apiDay);
  await ensureDataLoaded();
  render();
}

function startAutoRefresh() {
  setInterval(async () => {
    try {
      await refreshCurrentDay();
    } catch (error) {
      els.statusText.innerHTML = `<span class="error">Refresh failed: ${error.message}</span>`;
    }
  }, 15000);
}

async function init() {
  try {
    await loadBasemap();
    buildControls();
    state.showCig = els.showCig.checked;
    els.showCig.addEventListener('change', () => {
      state.showCig = els.showCig.checked;
      render();
    });
    await ensureDataLoaded();
    render();
    startAutoRefresh();
  } catch (error) {
    els.statusText.innerHTML = `<span class="error">${error.message}</span>`;
    console.error(error);
  }
}

init();
