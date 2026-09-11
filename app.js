// ═══════════════════════ DATA ═══════════════════════════

const TODAY = new Date().toISOString().slice(0, 10);

// Mock fallback data (used when data/tournaments.json is not available)
const MOCK_TOURNAMENTS = [
  // ── EUROPE ──
  { id:1,  name:'Zurich Chess Challenge 2026', city:'Zurich', country:'Switzerland', lat:47.3769, lon:8.5417, continent:'Europe', flag:'🇨🇭',
    startDate:'2026-07-12', endDate:'2026-07-20', durationDays:9, timeControl:'Classical',
    firstPrize:15000, totalPrize:45000, players:180, gms:12, ims:18, fms:6,
    rounds:9, source:'https://zurichchesschallenge.com' },

  { id:2,  name:'Wrocław Grand Prix Rapid', city:'Wrocław', country:'Poland', lat:51.1079, lon:17.0385, continent:'Europe', flag:'🇵🇱',
    startDate:'2026-07-18', endDate:'2026-07-19', durationDays:2, timeControl:'Rapid',
    firstPrize:2500, totalPrize:8000, players:340, gms:3, ims:11, fms:20,
    rounds:7, source:'#' },

  { id:3,  name:'Barcelona Summer Open 2026', city:'Barcelona', country:'Spain', lat:41.3851, lon:2.1734, continent:'Europe', flag:'🇪🇸',
    startDate:'2026-08-01', endDate:'2026-08-09', durationDays:9, timeControl:'Classical',
    firstPrize:8000, totalPrize:28000, players:520, gms:22, ims:34, fms:41,
    rounds:9, source:'#' },

  { id:4,  name:'Tata Steel Challengers', city:'Wijk aan Zee', country:'Netherlands', lat:52.4925, lon:4.5939, continent:'Europe', flag:'🇳🇱',
    startDate:'2026-08-15', endDate:'2026-08-30', durationDays:16, timeControl:'Classical',
    firstPrize:22000, totalPrize:75000, players:95, gms:35, ims:22, fms:8,
    rounds:13, source:'https://tatasteelchess.com' },

  { id:5,  name:'Prague Open Rapid & Blitz', city:'Prague', country:'Czech Republic', lat:50.0755, lon:14.4378, continent:'Europe', flag:'🇨🇿',
    startDate:'2026-07-04', endDate:'2026-07-07', durationDays:4, timeControl:'Rapid',
    firstPrize:1800, totalPrize:5500, players:195, gms:1, ims:6, fms:12,
    rounds:7, source:'#' },

  { id:6,  name:'Biel Grandmaster Tournament', city:'Biel', country:'Switzerland', lat:47.1368, lon:7.2468, continent:'Europe', flag:'🇨🇭',
    startDate:'2026-07-26', endDate:'2026-08-06', durationDays:12, timeControl:'Classical',
    firstPrize:12000, totalPrize:38000, players:120, gms:18, ims:14, fms:5,
    rounds:10, source:'#' },

  { id:7,  name:'Poznan Rapid Open', city:'Poznań', country:'Poland', lat:52.4064, lon:16.9252, continent:'Europe', flag:'🇵🇱',
    startDate:'2026-08-22', endDate:'2026-08-23', durationDays:2, timeControl:'Rapid',
    firstPrize:1200, totalPrize:4000, players:280, gms:2, ims:8, fms:14,
    rounds:7, source:'#' },

  { id:8,  name:'Vienna International Open', city:'Vienna', country:'Austria', lat:48.2082, lon:16.3738, continent:'Europe', flag:'🇦🇹',
    startDate:'2026-09-05', endDate:'2026-09-13', durationDays:9, timeControl:'Classical',
    firstPrize:5000, totalPrize:16000, players:310, gms:8, ims:20, fms:28,
    rounds:9, source:'#' },

  { id:9,  name:'Isle of Man International', city:'Douglas', country:'Isle of Man', lat:54.1452, lon:-4.4811, continent:'Europe', flag:'🇮🇲',
    startDate:'2026-09-19', endDate:'2026-09-27', durationDays:9, timeControl:'Classical',
    firstPrize:18000, totalPrize:55000, players:220, gms:42, ims:35, fms:12,
    rounds:9, source:'https://iomchess.com' },

  { id:10, name:'Warsaw Chess Festival — Blitz Night', city:'Warsaw', country:'Poland', lat:52.2297, lon:21.0122, continent:'Europe', flag:'🇵🇱',
    startDate:'2026-07-25', endDate:'2026-07-25', durationDays:1, timeControl:'Blitz',
    firstPrize:800, totalPrize:2500, players:150, gms:0, ims:4, fms:9,
    rounds:11, source:'#' },

  { id:11, name:'Olympiad A Open — Budapest', city:'Budapest', country:'Hungary', lat:47.4979, lon:19.0402, continent:'Europe', flag:'🇭🇺',
    startDate:'2026-10-10', endDate:'2026-10-20', durationDays:11, timeControl:'Classical',
    firstPrize:10000, totalPrize:32000, players:430, gms:28, ims:44, fms:60,
    rounds:11, source:'#' },

  { id:12, name:'Paris Blitz Grand Prix', city:'Paris', country:'France', lat:48.8566, lon:2.3522, continent:'Europe', flag:'🇫🇷',
    startDate:'2026-08-08', endDate:'2026-08-09', durationDays:2, timeControl:'Blitz',
    firstPrize:3000, totalPrize:9000, players:390, gms:5, ims:13, fms:22,
    rounds:11, source:'#' },

  // ── AMERICAS ──
  { id:13, name:'New York Open Championship', city:'New York', country:'United States', lat:40.7128, lon:-74.0060, continent:'Americas', flag:'🇺🇸',
    startDate:'2026-07-25', endDate:'2026-07-28', durationDays:4, timeControl:'Rapid',
    firstPrize:6000, totalPrize:20000, players:410, gms:8, ims:19, fms:27,
    rounds:6, source:'#' },

  { id:14, name:'Buenos Aires Memorial Classic', city:'Buenos Aires', country:'Argentina', lat:-34.6037, lon:-58.3816, continent:'Americas', flag:'🇦🇷',
    startDate:'2026-08-08', endDate:'2026-08-16', durationDays:9, timeControl:'Classical',
    firstPrize:5500, totalPrize:16000, players:230, gms:6, ims:14, fms:18,
    rounds:9, source:'#' },

  { id:15, name:'São Paulo Rapid Festival', city:'São Paulo', country:'Brazil', lat:-23.5505, lon:-46.6333, continent:'Americas', flag:'🇧🇷',
    startDate:'2026-09-12', endDate:'2026-09-14', durationDays:3, timeControl:'Rapid',
    firstPrize:2200, totalPrize:7000, players:260, gms:2, ims:7, fms:11,
    rounds:7, source:'#' },

  { id:16, name:'Capablanca Memorial Open — Havana', city:'Havana', country:'Cuba', lat:23.1136, lon:-82.3666, continent:'Americas', flag:'🇨🇺',
    startDate:'2026-11-01', endDate:'2026-11-10', durationDays:10, timeControl:'Classical',
    firstPrize:4500, totalPrize:13000, players:175, gms:4, ims:12, fms:16,
    rounds:9, source:'#' },

  // ── ASIA ──
  { id:17, name:'Dubai Open 2026', city:'Dubai', country:'UAE', lat:25.2048, lon:55.2708, continent:'Asia', flag:'🇦🇪',
    startDate:'2026-10-01', endDate:'2026-10-10', durationDays:10, timeControl:'Classical',
    firstPrize:18000, totalPrize:60000, players:650, gms:28, ims:41, fms:55,
    rounds:9, source:'https://dubaiopen.ae' },

  { id:18, name:'Tokyo Blitz & Rapid Festival', city:'Tokyo', country:'Japan', lat:35.6762, lon:139.6503, continent:'Asia', flag:'🇯🇵',
    startDate:'2026-09-05', endDate:'2026-09-06', durationDays:2, timeControl:'Blitz',
    firstPrize:3000, totalPrize:9500, players:280, gms:2, ims:7, fms:14,
    rounds:11, source:'#' },

  { id:19, name:'Kolkata Grand Masters Open', city:'Kolkata', country:'India', lat:22.5726, lon:88.3639, continent:'Asia', flag:'🇮🇳',
    startDate:'2026-08-20', endDate:'2026-08-29', durationDays:10, timeControl:'Classical',
    firstPrize:7000, totalPrize:22000, players:480, gms:15, ims:30, fms:45,
    rounds:10, source:'#' },

  { id:20, name:'Riyadh World Rapid & Blitz', city:'Riyadh', country:'Saudi Arabia', lat:24.6877, lon:46.7219, continent:'Asia', flag:'🇸🇦',
    startDate:'2026-12-26', endDate:'2027-01-03', durationDays:9, timeControl:'Rapid',
    firstPrize:50000, totalPrize:150000, players:200, gms:80, ims:40, fms:20,
    rounds:15, source:'https://worldrapidblitz.fide.com' },

  { id:21, name:'Seoul International Open', city:'Seoul', country:'South Korea', lat:37.5665, lon:126.9780, continent:'Asia', flag:'🇰🇷',
    startDate:'2026-10-15', endDate:'2026-10-23', durationDays:9, timeControl:'Classical',
    firstPrize:6500, totalPrize:19000, players:320, gms:10, ims:22, fms:30,
    rounds:9, source:'#' },

  // ── AFRICA ──
  { id:22, name:'Johannesburg Open 2026', city:'Johannesburg', country:'South Africa', lat:-26.2041, lon:28.0473, continent:'Africa', flag:'🇿🇦',
    startDate:'2026-09-18', endDate:'2026-09-26', durationDays:9, timeControl:'Classical',
    firstPrize:3500, totalPrize:10000, players:145, gms:2, ims:6, fms:10,
    rounds:9, source:'#' },

  { id:23, name:'Cairo Blitz Open', city:'Cairo', country:'Egypt', lat:30.0444, lon:31.2357, continent:'Africa', flag:'🇪🇬',
    startDate:'2026-11-14', endDate:'2026-11-14', durationDays:1, timeControl:'Blitz',
    firstPrize:1200, totalPrize:3500, players:120, gms:1, ims:3, fms:5,
    rounds:9, source:'#' },

  // ── OCEANIA ──
  { id:24, name:'Australian Open Championship', city:'Sydney', country:'Australia', lat:-33.8688, lon:151.2093, continent:'Oceania', flag:'🇦🇺',
    startDate:'2027-01-05', endDate:'2027-01-14', durationDays:10, timeControl:'Classical',
    firstPrize:8000, totalPrize:24000, players:210, gms:6, ims:15, fms:22,
    rounds:9, source:'#' },
];

// ═══════════════════════ LIVE DATA LOADER ═══════════════

let TOURNAMENTS = [...MOCK_TOURNAMENTS];
let filtered    = [...TOURNAMENTS];
let dataSource  = 'demo';

async function loadLiveData() {
  try {
    const res = await fetch('data/tournaments.json?v=' + Date.now());
    if (!res.ok) throw new Error('No data file');
    const json = await res.json();
    const list = json.tournaments || json;
    if (Array.isArray(list) && list.length > 0) {
      TOURNAMENTS = list;
      filtered    = [...TOURNAMENTS];
      dataSource  = 'live';
      const updated = json.updatedAt ? new Date(json.updatedAt).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : 'recently';
      document.getElementById('footer-status').textContent = `✅ Live data · ${list.length} tournaments · Updated ${updated}`;
      populateCountries();
      applyFilters();
      return;
    }
  } catch(e) {
    // Silently fall back to mock data
  }
  document.getElementById('footer-status').textContent = '⚠️ Demo mode — run the scraper to load real tournaments';
  populateCountries();
  applyFilters();
}

const countryNames = {
  'POL': 'Poland', 'ENG': 'England', 'GER': 'Germany', 'FRA': 'France', 'ESP': 'Spain', 'ITA': 'Italy', 'USA': 'USA', 'CAN': 'Canada',
  'COL': 'Colombia', 'IND': 'India', 'BRA': 'Brazil', 'AUS': 'Australia', 'NZL': 'New Zealand', 'ARG': 'Argentina', 'NED': 'Netherlands', 'BEL': 'Belgium',
  'TUR': 'Turkey', 'CAT': 'Catalonia', 'ECU': 'Ecuador', 'CRC': 'Costa Rica', 'BOL': 'Bolivia', 'URU': 'Uruguay', 'TUN': 'Tunisia', 'EGY': 'Egypt',
  'MAR': 'Morocco', 'UKR': 'Ukraine', 'UAE': 'United Arab Emirates', 'MEX': 'Mexico', 'IRI': 'Iran', 'GRE': 'Greece', 'BLR': 'Belarus', 'PAN': 'Panama',
  'AZE': 'Azerbaijan', 'PER': 'Peru', 'ARM': 'Armenia', 'ISL': 'Iceland', 'PHI': 'Philippines', 'ISR': 'Israel', 'CRO': 'Croatia', 'ROU': 'Romania',
  'RSA': 'South Africa', 'CHI': 'Chile', 'KAZ': 'Kazakhstan', 'UZB': 'Uzbekistan', 'SRB': 'Serbia', 'CZE': 'Czech Republic', 'SVK': 'Slovakia', 'SWE': 'Sweden',
  'NOR': 'Norway', 'DEN': 'Denmark', 'FIN': 'Finland', 'HUN': 'Hungary', 'SUI': 'Switzerland', 'AUT': 'Austria', 'IRL': 'Ireland', 'WLS': 'Wales',
  'SCO': 'Scotland', 'POR': 'Portugal', 'CUB': 'Cuba', 'VEN': 'Venezuela', 'PAR': 'Paraguay', 'INA': 'Indonesia', 'MAS': 'Malaysia', 'SGP': 'Singapore',
  'VIE': 'Vietnam', 'THA': 'Thailand', 'CHN': 'China', 'JPN': 'Japan', 'KOR': 'South Korea', 'ALG': 'Algeria', 'NGR': 'Nigeria', 'KEN': 'Kenya',
  'ZAM': 'Zambia', 'LAT': 'Latvia', 'LTU': 'Lithuania', 'EST': 'Estonia', 'GEO': 'Georgia', 'BUL': 'Bulgaria', 'MKD': 'North Macedonia', 'MNE': 'Montenegro',
  'BIH': 'Bosnia & Herzegovina', 'SLO': 'Slovenia', 'ALB': 'Albania', 'KOS': 'Kosovo', 'MDA': 'Moldova', 'AND': 'Andorra', 'SMR': 'San Marino',
  'LUX': 'Luxembourg', 'MON': 'Monaco', 'CYP': 'Cyprus', 'MLT': 'Malta', 'PUR': 'Puerto Rico', 'JAM': 'Jamaica'
};

function getCountryName(code) {
  return countryNames[code] || code;
}

function populateCountries() {
  const sel = document.getElementById('country-select');
  sel.innerHTML = '<option value="">All countries</option>';
  const countries = [...new Set(TOURNAMENTS.map(t => t.country))].sort((a,b) => getCountryName(a).localeCompare(getCountryName(b)));
  countries.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = getCountryName(c);
    sel.appendChild(o);
  });
}

// ═══════════════════════ STATE ═══════════════════════════

let userLat = null;
let userLon = null;
let activeCenterLat = null;
let activeCenterLon = null;
let currentView = 'list';
let currentTab  = 'upcoming';
let savedIds = JSON.parse(localStorage.getItem('chessTourSaved') || '[]');

// ═══════════════════════ LOCATION ════════════════════════

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function useMyLocation() {
  if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;
    document.getElementById('geo-btn').innerHTML = '✅ Location set';
    applyFilters();
  }, () => {
    alert('Could not get location. Please allow location access.');
  });
}

function updateDistanceLabel() {
  const val = +document.getElementById('distance-slider').value;
  document.getElementById('distance-value').textContent = val === 0 ? 'Any distance' : val + ' km';
}

// ═══════════════════════ BOOKMARKS ═══════════════════════

function toggleSave(id) {
  if (savedIds.includes(id)) {
    savedIds = savedIds.filter(x => x !== id);
  } else {
    savedIds.push(id);
  }
  localStorage.setItem('chessTourSaved', JSON.stringify(savedIds));
  renderAll();
}

// ═══════════════════════ HELPERS ═════════════════════════

function getBarClass(tc) {
  switch((tc||'').toLowerCase()) {
    case 'rapid':  return 'bar-rapid';
    case 'blitz':  return 'bar-blitz';
    default:       return 'bar-classical';
  }
}

function fmtDate(d) {
  if(!d) return '';
  const [y,m,day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${+day} ${months[+m-1]} ${y}`;
}

function fmtDateRange(s, e) {
  if(s === e) return fmtDate(s);
  return `${fmtDate(s)} – ${fmtDate(e)}`;
}

function fmtPrize(n) {
  if(!n) return '—';
  return n >= 1000 ? '$' + (n/1000).toFixed(0) + 'k' : '$' + n;
}

function getCalendarLink(t) {
  if (!t.startDate) return '#';
  const text = encodeURIComponent(t.name);
  const start = t.startDate.replace(/-/g, '');
  let end = start;
  try {
    if (t.endDate) {
      const endD = new Date(t.endDate);
      if (!isNaN(endD.getTime())) {
        endD.setDate(endD.getDate() + 1);
        end = endD.toISOString().slice(0,10).replace(/-/g, '');
      }
    }
  } catch(e) {}
  const loc = encodeURIComponent((t.city || '') + (t.country ? ', ' + t.country : ''));
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&location=${loc}`;
}

function distanceBadge(t) {
  if (!activeCenterLat || !t.lat) return '';
  const km = Math.round(getHaversineDistance(activeCenterLat, activeCenterLon, t.lat, t.lon));
  return `<span style="margin-left:8px;font-weight:700;color:#d97706;font-size:11px;background:#fef3c7;padding:2px 6px;border-radius:4px;">📍 ${km} km</span>`;
}

// ═══════════════════════ RENDER ══════════════════════════

function starBtn(id) {
  return `<span onclick="event.stopPropagation(); toggleSave('${id}')" style="cursor:pointer;font-size:1.2em;margin-right:6px;" title="Bookmark">${savedIds.includes(id) ? '⭐' : '☆'}</span>`;
}

function rowHTML(t) {
  const isFinished = t.endDate < TODAY;
  const totalRounds = t.rounds || '?';
  const gms = t.gms || 0, ims = t.ims || 0, fms = t.fms || 0;
  const titled = gms + ims + fms;
  const players = t.players || '?';
  const hasLink = t.source && t.source !== '#';

  return `
  <div class="tournament-row" ${hasLink ? `onclick="window.open('${t.source}','_blank')"` : 'style="cursor:default"'}>
    <div class="bar ${getBarClass(t.timeControl)}"></div>
    <div class="row-left">
      <a class="row-name${hasLink ? '' : ' no-link'}" ${hasLink ? `href="${t.source}" target="_blank" rel="noopener" onclick="event.stopPropagation()"` : ''}>
        ${starBtn(t.id)}${t.name}${hasLink ? ' <svg style="display:inline;vertical-align:middle;margin-left:3px" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' : ''}
      </a>
      <div class="row-meta">
        <div class="meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${fmtDateRange(t.startDate, t.endDate)}
        </div>
        <div class="meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ${players} players
        </div>
        <div class="meta-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${t.timeControl} · ${totalRounds} rounds
        </div>
        ${gms > 0 ? `<div class="meta-item">♟ ${gms} GMs, ${titled} titled</div>` : (titled > 0 ? `<div class="meta-item">♟ ${titled} titled</div>` : '')}
      </div>
    </div>
    <div class="row-right">
      <div class="location-line">
        <div class="loc-dash"></div>
        <span>${t.flag ? t.flag + ' ' : ''}${t.city}, ${t.country}</span>
        ${distanceBadge(t)}
      </div>
      <div class="prize-line">
        ${t.firstPrize > 0 ? `<span>Prize: <span class="prize-val">${fmtPrize(t.firstPrize)}</span></span>` : ''}
      </div>
      <div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap;justify-content:flex-end;">
        <a href="${getCalendarLink(t)}" target="_blank" rel="noopener" class="signup-btn" onclick="event.stopPropagation()" style="background:#f7fafc;color:#4a5568;border:1px solid #e2e8f0;">📅 Calendar</a>
        ${hasLink ? `<a href="${t.source}" target="_blank" rel="noopener" class="signup-btn" onclick="event.stopPropagation()">Sign Up / Details</a>` : ''}
      </div>
    </div>
  </div>`;
}

function cardHTML(t) {
  const gms = t.gms || 0, ims = t.ims || 0, fms = t.fms || 0;
  const titled = gms + ims + fms;
  const players = t.players || '?';
  const hasLink = t.source && t.source !== '#';

  return `
  <div class="tournament-card" ${hasLink ? `onclick="window.open('${t.source}','_blank')"` : 'style="cursor:default"'}>
    <div class="bar ${getBarClass(t.timeControl)}"></div>
    <a class="card-name${hasLink ? '' : ' no-link'}" ${hasLink ? `href="${t.source}" target="_blank" rel="noopener" onclick="event.stopPropagation()"` : ''}>
      ${starBtn(t.id)}${t.name}
    </a>
    <div class="card-meta">
      <div class="meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        ${fmtDateRange(t.startDate, t.endDate)}
      </div>
      <div class="meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        ${players} players · ${t.rounds || '?'} rounds
      </div>
      <div class="meta-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${t.timeControl}
      </div>
      ${gms > 0 ? `<div class="meta-item">♟ ${gms} GMs · ${titled} titled</div>` : (titled > 0 ? `<div class="meta-item">♟ ${titled} titled</div>` : '')}
    </div>
    <div class="card-footer">
      <div class="location-line">
        <div class="loc-dash"></div>
        <span>${t.flag ? t.flag + ' ' : ''}${t.country} · ${t.city}</span>
        ${distanceBadge(t)}
      </div>
      <div class="prize-line">
        ${t.firstPrize > 0 ? `<span class="prize-val">${fmtPrize(t.firstPrize)}</span>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <a href="${getCalendarLink(t)}" target="_blank" rel="noopener" class="signup-btn" onclick="event.stopPropagation()" style="background:#f7fafc;color:#4a5568;border:1px solid #e2e8f0;flex:1;text-align:center;">📅 Calendar</a>
      ${hasLink ? `<a href="${t.source}" target="_blank" rel="noopener" class="signup-btn" onclick="event.stopPropagation()" style="flex:1;text-align:center;">Sign Up</a>` : ''}
    </div>
  </div>`;
}

function renderList(items, container) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">♟</div><div class="empty-title">No tournaments match</div><div class="empty-sub">Try relaxing your filters</div></div>`;
    return;
  }
  if (currentView === 'list') {
    container.innerHTML = `<div class="tournaments-list">${items.map(rowHTML).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="tournaments-grid">${items.map(cardHTML).join('')}</div>`;
  }
}

function sortItems(items) {
  const s = document.getElementById('sort-select').value;
  return [...items].sort((a,b) => {
    switch(s) {
      case 'prize-desc':   return (b.firstPrize||0) - (a.firstPrize||0);
      case 'prize-asc':    return (a.firstPrize||0) - (b.firstPrize||0);
      case 'date-asc':     return a.startDate.localeCompare(b.startDate);
      case 'date-desc':    return b.startDate.localeCompare(a.startDate);
      case 'players-desc': return (b.players||0) - (a.players||0);
      case 'gms-desc':     return (b.gms||0) - (a.gms||0);
      case 'fee-asc':      return (a.entryFee||0) - (b.entryFee||0);
      default:             return 0;
    }
  });
}

function renderAll() {
  const sorted = sortItems(filtered);

  const isFinished = t => t.endDate < TODAY;
  const isUpcoming = t => t.startDate > TODAY;
  const isOngoing  = t => !isFinished(t) && !isUpcoming(t);

  const featuredWrap = document.getElementById('featured-wrap');
  const tabWrap = document.getElementById('tab-wrap');
  const tabsWrap = document.querySelector('.tabs-wrap');

  if (currentView === 'map') {
    // In map view: hide tabs/featured, show list below map sorted by distance
    featuredWrap.style.display = 'none';
    if (tabsWrap) tabsWrap.style.display = 'none';
    tabWrap.style.display = 'block';

    // Sort by distance if we have a center point, otherwise by date
    let mapSorted;
    if (activeCenterLat && activeCenterLon) {
      mapSorted = [...filtered]
        .filter(t => t.lat && t.lon)
        .sort((a, b) =>
          getHaversineDistance(activeCenterLat, activeCenterLon, a.lat, a.lon) -
          getHaversineDistance(activeCenterLat, activeCenterLon, b.lat, b.lon)
        );
      // Append items without coords at the end
      const noCoords = filtered.filter(t => !t.lat || !t.lon);
      mapSorted = [...mapSorted, ...noCoords];
    } else {
      mapSorted = sorted;
    }

    // Show all items (no tab filtering in map mode) with a label
    tabWrap.innerHTML = `
      <div style="font-size:12px;color:#718096;margin:10px 0 8px;font-style:italic;">
        ${activeCenterLat ? '📍 Sorted by distance from selected point' : '📅 Sorted by date'}
        · ${mapSorted.filter(t=>t.lat).length} pins on map · ${mapSorted.filter(t=>!t.lat).length} without coordinates
      </div>
      <div class="tournaments-list">${mapSorted.map(rowHTML).join('')}</div>`;

    updateMap(filtered);
  } else {
    // Normal list/grid view
    featuredWrap.style.display = 'flex';
    if (tabsWrap) tabsWrap.style.display = 'flex';
    tabWrap.style.display = 'block';

    const featured = currentTab === 'saved' ? [] : sorted.slice(0, 3);
    const rest = currentTab === 'saved' ? sorted : sorted.slice(3);

    let tabItems;
    if      (currentTab === 'saved')     tabItems = rest;
    else if (currentTab === 'completed') tabItems = rest.filter(isFinished);
    else if (currentTab === 'upcoming')  tabItems = rest.filter(isUpcoming);
    else                                 tabItems = rest.filter(isOngoing);

    renderList(featured, featuredWrap);
    renderList(tabItems, tabWrap);
  }

  document.getElementById('result-meta').innerHTML =
    `Showing <strong>${filtered.length}</strong> of <strong>${TOURNAMENTS.length}</strong> tournaments`;
}


// ═══════════════════════ FILTER LOGIC ════════════════════

const normalizeStr = str => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

// Cache for Nominatim geocoding results
const geocodeCache = {};

async function geocodeCity(cityName) {
  const key = cityName.toLowerCase().trim();
  if (geocodeCache[key]) return geocodeCache[key];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data && data[0]) {
      const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
      geocodeCache[key] = result;
      return result;
    }
  } catch(e) {}
  return null;
}

function runFilter(centerLat, centerLon) {
  const q         = normalizeStr(document.getElementById('q-input').value.trim());
  const continent = document.getElementById('continent-select').value;
  const country   = document.getElementById('country-select').value;
  const city      = normalizeStr(document.getElementById('city-input').value.trim());
  const prizeMin  = +document.getElementById('prize-min').value || 0;
  const prizeMax  = +document.getElementById('prize-max').value || Infinity;
  const gmMin     = +document.getElementById('gm-min').value || 0;
  const titledMin = +document.getElementById('titled-min').value || 0;
  const startMonth = document.getElementById('start-month').value;
  const maxDist   = +document.getElementById('distance-slider').value;
  const tcs  = [...document.querySelectorAll('.tc-check:checked')].map(el => el.value);
  const durs = [...document.querySelectorAll('.dur-check:checked')].map(el => el.value);
  const durMap = { weekend:[1,2], short:[3,5], week:[6,7], extended:[8,999] };

  activeCenterLat = centerLat;
  activeCenterLon = centerLon;

  filtered = TOURNAMENTS.filter(t => {
    if (currentTab === 'saved' && !savedIds.includes(t.id)) return false;

    if (maxDist > 0) {
      // Distance filter: only show tournaments within radius that have coordinates
      if (centerLat && centerLon) {
        if (!t.lat || !t.lon) return false; // no coords = exclude from distance filter
        if (getHaversineDistance(centerLat, centerLon, t.lat, t.lon) > maxDist) return false;
      }
      // If no center point set, distance slider is ignored (need a city or GPS)
    }

    const tName    = normalizeStr(t.name);
    const tCity    = normalizeStr(t.city);
    const tCountry = normalizeStr(t.country);

    if (q && !tName.includes(q) && !tCity.includes(q) && !tCountry.includes(q)) return false;
    if (continent && t.continent !== continent) return false;
    if (country && t.country !== country) return false;
    // City text filter only when distance slider is 0 (else city = search center only)
    if (city && maxDist === 0 && !tCity.includes(city)) return false;
    if (startMonth && !t.startDate.startsWith(startMonth)) return false;
    if (prizeMin > 0 && (t.firstPrize || 0) < prizeMin) return false;
    if (prizeMax < Infinity && (t.firstPrize || 0) > prizeMax) return false;
    if (tcs.length && !tcs.includes(t.timeControl)) return false;
    if (gmMin > 0 && (t.gms || 0) < gmMin) return false;
    if (titledMin > 0 && ((t.gms||0) + (t.ims||0) + (t.fms||0)) < titledMin) return false;
    if (durs.length) {
      let days = 1;
      if (t.startDate && t.endDate) {
        const ms = new Date(t.endDate) - new Date(t.startDate);
        days = Math.max(1, Math.round(ms / 86400000) + 1);
      }
      const ok = durs.some(d => { const [mn,mx] = durMap[d]; return days >= mn && days <= mx; });
      if (!ok) return false;
    }
    return true;
  });

  renderAll();
}

async function applyFilters() {
  const cityRaw = document.getElementById('city-input').value.trim();
  const maxDist = +document.getElementById('distance-slider').value;

  let centerLat = userLat, centerLon = userLon;

  if (maxDist > 0 && cityRaw && !centerLat) {
    // Show loading indicator
    const distVal = document.getElementById('distance-value');
    const prev = distVal.textContent;
    distVal.textContent = '⏳ Locating ' + cityRaw + '...';

    const geo = await geocodeCity(cityRaw);
    if (geo) {
      centerLat = geo.lat;
      centerLon = geo.lon;
      distVal.textContent = `📍 ${geo.name} · ≤ ${maxDist} km`;
    } else {
      distVal.textContent = '❌ City not found';
      setTimeout(() => distVal.textContent = prev, 2000);
    }
  }

  runFilter(centerLat, centerLon);
}

function clearFilters() {
  document.getElementById('q-input').value = '';
  document.getElementById('continent-select').value = '';
  document.getElementById('country-select').value = '';
  document.getElementById('city-input').value = '';
  document.getElementById('start-month').value = '';
  document.getElementById('prize-min').value = '';
  document.getElementById('prize-max').value = '';
  document.getElementById('gm-min').value = '';
  document.getElementById('titled-min').value = '';
  document.getElementById('distance-slider').value = '0';
  document.getElementById('distance-value').textContent = 'Any distance';
  document.getElementById('geo-btn').innerHTML = '📍 Use My Location';
  document.querySelectorAll('.tc-check, .dur-check').forEach(el => el.checked = false);
  userLat = userLon = activeCenterLat = activeCenterLon = null;
  filtered = [...TOURNAMENTS];
  renderAll();
}

// ═══════════════════════ TAB & VIEW ══════════════════════

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  applyFilters();
}

// ═══════════════════════ MAP ═════════════════════════════

let leafletMap = null;
let markers = [];

function initMap() {
  if (leafletMap) return;
  leafletMap = L.map('map-wrap').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(leafletMap);
  leafletMap.on('click', function(e) {
    userLat = e.latlng.lat;
    userLon = e.latlng.lng;
    document.getElementById('geo-btn').innerHTML = '📍 Custom Map Point';
    document.getElementById('city-input').value = '';
    applyFilters();
  });
}

function updateMap(items) {
  if (!leafletMap) return;
  markers.forEach(m => leafletMap.removeLayer(m));
  markers = [];
  items.forEach(t => {
    if (t.lat && t.lon) {
      const m = L.marker([t.lat, t.lon]).addTo(leafletMap);
      m.bindPopup(`<b>${t.name}</b><br>${t.city}, ${t.country}<br>${fmtDateRange(t.startDate, t.endDate)}${t.firstPrize ? '<br>Prize: ' + fmtPrize(t.firstPrize) : ''}`);
      markers.push(m);
    }
  });
  if (markers.length > 0) {
    try {
      leafletMap.fitBounds(L.featureGroup(markers).getBounds().pad(0.1));
    } catch(e) {}
  }
}

function setView(view) {
  currentView = view;
  document.getElementById('list-btn').classList.toggle('active', view === 'list');
  document.getElementById('grid-btn').classList.toggle('active', view === 'grid');
  document.getElementById('map-btn').classList.toggle('active', view === 'map');

  const mapWrap = document.getElementById('map-wrap');
  if (view === 'map') {
    mapWrap.style.display = 'block';
    initMap();
    setTimeout(() => leafletMap.invalidateSize(), 100);
  } else {
    mapWrap.style.display = 'none';
  }
  renderAll();
}

// ═══════════════════════ LIVE LISTENERS ══════════════════

['q-input', 'city-input', 'prize-min', 'prize-max', 'gm-min', 'titled-min', 'start-month'].forEach(id => {
  document.getElementById(id).addEventListener('input', applyFilters);
});

// ═══════════════════════ BOOT ════════════════════════════

loadLiveData();