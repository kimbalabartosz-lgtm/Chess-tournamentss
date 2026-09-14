const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

function detectTimeControl(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('blitz') || n.includes('błysk')) return 'Blitz';
  if (n.includes('rapid') || n.includes('szybki') || n.includes('p' + String.fromCharCode(243) + 'łaktywn')) return 'Rapid';
  if (n.includes('bullet')) return 'Bullet';
  return 'Classical';
}

function detectRounds(name) {
  if (!name) return null;
  const m = name.match(/(\d+)\s*[- ]*(rund[a-z]*|rapid|blitz|kołow[a-z]*|szwajcar)/i) ||
            name.match(/(\d+)\s*[- ]*r\b/i);
  if (m) {
    const val = parseInt(m[1], 10);
    if (val >= 3 && val <= 25) return val;
  }
  return null;
}

function parseCADates(td) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const rawText = td.text().trim();
  const matches = rawText.match(/(\d{2})-(\d{2})/g);
  if (!matches || matches.length === 0) return null;

  const [d1, m1] = matches[0].split('-').map(Number);
  const year1 = m1 < currentMonth ? currentYear + 1 : currentYear;
  const start = `${year1}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;

  let end = start;
  if (matches.length > 1) {
    const [d2, m2] = matches[1].split('-').map(Number);
    const year2 = m2 < currentMonth ? currentYear + 1 : currentYear;
    end = `${year2}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
  }

  return { start, end };
}

async function scrapeChessArbiter() {
  console.log('📡 Scraping ChessArbiter.com...');
  const tournaments = [];
  try {
    const html = await fetch('http://www.chessarbiter.com/turnieje.php', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 20000
    }).then(r => r.text());

    const $ = cheerio.load(html);
    let idCounter = 1;

    $('table').each((i, tbl) => {
      $(tbl).find('tr').each((j, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;
        
        const aTag = cells.eq(1).find('a');
        if (!aTag.length) return;
        
        const name = aTag.text().trim();
        const sourceUrl = aTag.attr('href');
        if (!name || name.includes('SZUKAJ')) return;

        const dates = parseCADates(cells.eq(0));
        if (!dates) return;

        const fullTd = cells.eq(1).text();
        const remainder = fullTd.replace(aTag.text(), '').trim();
        let city = remainder.replace(/\[.*\]/g, '').trim();
        if (!city || city.length < 2) city = 'Polska';

        const ms = new Date(dates.end) - new Date(dates.start);
        const durationDays = isNaN(ms) || ms < 0 ? 1 : Math.max(1, Math.round(ms / 86400000) + 1);

        tournaments.push({
          id: `ca-${idCounter++}`,
          name,
          city,
          country: 'Poland',
          continent: 'Europe',
          flag: '🇵🇱',
          startDate: dates.start,
          endDate: dates.end,
          durationDays,
          timeControl: detectTimeControl(name),
          rounds: detectRounds(name),
          source: sourceUrl.startsWith('http') ? sourceUrl : `https://www.chessarbiter.com/turnieje/${sourceUrl}`,
          scrapedFrom: 'ChessArbiter'
        });
      });
    });
    console.log(`  ✅ ChessArbiter: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ ChessArbiter failed:', e.message);
  }
  return tournaments;
}

const countryFlags = {
  'POL': '🇵🇱', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'GER': '🇩🇪', 'FRA': '🇫🇷', 'ESP': '🇪🇸', 'ITA': '🇮🇹', 'USA': '🇺🇸', 'CAN': '🇨🇦',
  'COL': '🇨🇴', 'IND': '🇮🇳', 'BRA': '🇧🇷', 'AUS': '🇦🇺', 'NZL': '🇳🇿', 'ARG': '🇦🇷', 'NED': '🇳🇱', 'BEL': '🇧🇪',
  'TUR': '🇹🇷', 'CAT': '🇪🇸', 'ECU': '🇪🇨', 'CRC': '🇨🇷', 'BOL': '🇧🇴', 'URU': '🇺🇾', 'TUN': '🇹🇳', 'EGY': '🇪🇬',
  'MAR': '🇲🇦', 'UKR': '🇺🇦', 'UAE': '🇦🇪', 'MEX': '🇲🇽', 'IRI': '🇮🇷', 'GRE': '🇬🇷', 'BLR': '⬜', 'PAN': '🇵🇦',
  'AZE': '🇦🇿', 'PER': '🇵🇪', 'ARM': '🇦🇲', 'ISL': 'ISL', 'PHI': '🇵🇭', 'ISR': '🇮🇱', 'CRO': '🇭🇷', 'ROU': '🇷🇴',
  'RSA': '🇿🇦', 'CHI': '🇨🇱', 'KAZ': '🇰🇿', 'UZB': '🇺🇿', 'SRB': '🇷🇸', 'CZE': '🇨🇿', 'SVK': '🇸🇰', 'SWE': '🇸🇪',
  'NOR': '🇳🇴', 'DEN': '🇩🇰', 'FIN': '🇫🇮', 'HUN': '🇭🇺', 'SUI': '🇨🇭', 'AUT': '🇦🇹', 'IRL': '🇮🇪', 'WLS': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'POR': '🇵🇹', 'CUB': '🇨🇺', 'VEN': '🇻🇪', 'PAR': '🇵🇾', 'INA': '🇮🇩', 'MAS': '🇲🇾', 'SGP': '🇸🇬',
  'VIE': '🇻🇳', 'THA': '🇹🇭', 'CHN': '🇨🇳', 'JPN': '🇯🇵', 'KOR': '🇰🇷', 'ALG': '🇩🇿', 'NGR': '🇳🇬', 'KEN': '🇰🇪'
};

const countryToCode = {
  'poland': 'POL', 'united states': 'USA', 'usa': 'USA', 'germany': 'GER', 'france': 'FRA',
  'spain': 'ESP', 'italy': 'ITA', 'england': 'ENG', 'united kingdom': 'ENG', 'great britain': 'ENG',
  'canada': 'CAN', 'india': 'IND', 'brazil': 'BRA', 'australia': 'AUS', 'new zealand': 'NZL',
  'argentina': 'ARG', 'netherlands': 'NED', 'belgium': 'BEL', 'turkey': 'TUR', 'ukraine': 'UKR',
  'united arab emirates': 'UAE', 'mexico': 'MEX', 'iran': 'IRI', 'greece': 'GRE', 'azerbaijan': 'AZE',
  'armenia': 'ARM', 'iceland': 'ISL', 'philippines': 'PHI', 'israel': 'ISR', 'croatia': 'CRO',
  'romania': 'ROU', 'south africa': 'RSA', 'chile': 'CHI', 'kazakhstan': 'KAZ', 'uzbekistan': 'UZB',
  'serbia': 'SRB', 'czech republic': 'CZE', 'czechia': 'CZE', 'slovakia': 'SVK', 'sweden': 'SWE',
  'norway': 'NOR', 'denmark': 'DEN', 'finland': 'FIN', 'hungary': 'HUN', 'switzerland': 'SUI',
  'austria': 'AUT', 'ireland': 'IRL', 'portugal': 'POR', 'singapore': 'SGP', 'malaysia': 'MAS',
  'indonesia': 'INA', 'vietnam': 'VIE', 'thailand': 'THA', 'china': 'CHN', 'japan': 'JPN',
  'south korea': 'KOR', 'korea': 'KOR', 'colombia': 'COL', 'ecuador': 'ECU', 'peru': 'PER'
};

function getContinent(fedCode) {
  const americas = ['USA', 'CAN', 'COL', 'BRA', 'ARG', 'ECU', 'CRC', 'BOL', 'URU', 'MEX', 'PAN', 'PER', 'CUB', 'VEN', 'PAR', 'CHI'];
  const asia =     ['IND', 'UAE', 'IRI', 'PHI', 'ISR', 'KAZ', 'UZB', 'INA', 'MAS', 'SGP', 'VIE', 'THA', 'CHN', 'JPN', 'KOR'];
  const africa =   ['TUN', 'EGY', 'MAR', 'RSA', 'ALG', 'NGR', 'KEN'];
  const oceania =  ['AUS', 'NZL'];
  
  if (americas.includes(fedCode)) return 'Americas';
  if (asia.includes(fedCode)) return 'Asia';
  if (africa.includes(fedCode)) return 'Africa';
  if (oceania.includes(fedCode)) return 'Oceania';
  return 'Europe';
}

function resolveCountry(countryStr) {
  const norm = (countryStr || '').toLowerCase().trim();
  const code = countryToCode[norm] || (countryStr.length === 3 ? countryStr.toUpperCase() : countryStr);
  return {
    code,
    flag: countryFlags[code] || '🏳️',
    continent: getContinent(code)
  };
}

async function scrapeChessResults(browser) {
  console.log('📡 Scraping Chess-Results.com (via Puppeteer)...');
  const tournaments = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    await page.goto('https://chess-results.com/TurnierSuche.aspx?lan=1', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('  Selecting max results...');
    await page.evaluate(() => {
      const select = document.querySelector('select[name="ctl00$P1$combo_anzahl_zeilen"]');
      if (select) {
        const lastOption = select.options[select.options.length - 1];
        select.value = lastOption.value;
      }
      document.querySelector('input[name="ctl00$P1$cb_suchen"]').click();
    });
    
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    
    const content = await page.content();
    const $ = cheerio.load(content);
    
    let crCounter = 1;
    $('table.CRs2 tr').slice(1).each((i, row) => {
      const tds = $(row).find('td');
      if (tds.length < 15) return;
      
      const name = tds.eq(1).text().trim();
      const aTag = tds.eq(1).find('a');
      if (!aTag.length) return;
      
      const sourceUrl = aTag.attr('href');
      let start = tds.eq(5).text().trim().replace(/\//g, '-');
      let end = tds.eq(6).text().trim().replace(/\//g, '-');
      const city = tds.eq(12).text().trim();
      const tcRaw = tds.eq(13).text().trim();
      const fedCode = tds.eq(14).text().trim();
      
      if (!start || start.length < 8) return;
      
      const rounds = parseInt(tds.eq(16).text().trim()) || null;
      const players = parseInt(tds.eq(17).text().trim()) || null;

      const ms = new Date(end || start) - new Date(start);
      const durationDays = isNaN(ms) || ms < 0 ? 1 : Math.max(1, Math.round(ms / 86400000) + 1);
      
      tournaments.push({
        id: `cr-${crCounter++}`,
        name,
        city: city || fedCode,
        country: fedCode,
        continent: getContinent(fedCode),
        flag: countryFlags[fedCode] || '🏳️',
        startDate: start,
        endDate: end || start,
        durationDays,
        timeControl: detectTimeControl(tcRaw || name),
        rounds: rounds,
        players: players,
        source: `https://chess-results.com/${sourceUrl}`,
        scrapedFrom: 'Chess-Results'
      });
    });
    
    await page.close();
    console.log(`  ✅ Chess-Results: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ Chess-Results failed:', e.message);
  }
  return tournaments;
}

function parseDateMDY(str) {
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const m = String(parts[0]).padStart(2, '0');
  const d = String(parts[1]).padStart(2, '0');
  let y = String(parts[2]);
  if (y.length === 2) y = '20' + y;
  return `${y}-${m}-${d}`;
}

function parseChessManagerCard(raw, id) {
  const lines = raw.text.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const name = lines[0];
  const locParts = lines[1].split(',').map(s => s.trim());
  let city = 'Unknown';
  let countryRaw = 'Unknown';
  if (locParts.length >= 2) {
    city = locParts[0];
    countryRaw = locParts[locParts.length - 1];
  } else if (locParts.length === 1) {
    countryRaw = locParts[0];
    city = countryRaw;
  }

  const countryInfo = resolveCountry(countryRaw);

  const detailLine = lines[2] || '';
  let startDate = '';
  let endDate = '';
  const dateRangeMatch = detailLine.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);
  if (dateRangeMatch) {
    startDate = parseDateMDY(dateRangeMatch[1]);
    endDate = parseDateMDY(dateRangeMatch[2]);
  } else {
    const singleDateMatch = detailLine.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (singleDateMatch) {
      startDate = parseDateMDY(singleDateMatch[1]);
      endDate = startDate;
    }
  }

  if (!startDate) return null;

  let tc = 'Classical';
  const lower = detailLine.toLowerCase();
  if (lower.includes('blitz')) tc = 'Blitz';
  else if (lower.includes('rapid')) tc = 'Rapid';
  else if (lower.includes('bullet')) tc = 'Bullet';

  let players = null;
  const pMatch = detailLine.match(/(\d+)\s*players?/);
  if (pMatch) players = parseInt(pMatch[1], 10);

  let rounds = null;
  const rMatch = detailLine.match(/(\d+)\/(\d+)\s*rounds/);
  if (rMatch) rounds = parseInt(rMatch[2], 10);

  const ms = new Date(endDate) - new Date(startDate);
  const durationDays = isNaN(ms) || ms < 0 ? 1 : Math.max(1, Math.round(ms / 86400000) + 1);

  return {
    id: `cm-${id}`,
    name,
    city,
    country: countryInfo.code,
    continent: countryInfo.continent,
    flag: countryInfo.flag,
    startDate,
    endDate,
    durationDays,
    timeControl: tc,
    rounds,
    players,
    source: raw.href,
    scrapedFrom: 'ChessManager'
  };
}

async function scrapeChessManager(browser) {
  console.log('📡 Scraping ChessManager.com (upcoming tournaments)...');
  const tournaments = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    const offsets = [0, 50, 100];
    let cmCounter = 1;

    for (const offset of offsets) {
      try {
        const url = `https://www.chessmanager.com/en-us/tournaments/upcoming?offset=${offset}`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const cards = await page.evaluate(() => {
          const list = [];
          document.querySelectorAll('a[href*="/tournaments/"]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && href.match(/\/tournaments\/\d+$/)) {
              list.push({ href: a.href, text: a.innerText });
            }
          });
          return list;
        });

        if (!cards || !cards.length) break;

        for (const card of cards) {
          const parsed = parseChessManagerCard(card, cmCounter++);
          if (parsed) tournaments.push(parsed);
        }
      } catch (err) {
        console.warn(`  ⚠️ ChessManager offset ${offset} failed:`, err.message);
      }
    }

    await page.close();
    console.log(`  ✅ ChessManager: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ ChessManager failed:', e.message);
  }
  return tournaments;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchTournamentDetails(tournaments, cache) {
  // 1. Re-use existing cached details (GMs, IMs, prizes, isOpen)
  let reused = 0;
  tournaments.forEach(t => {
    const key = t.source || `${t.name}_${t.startDate}`;
    const old = cache.get(key);
    if (old && (old.gms > 0 || old.firstPrize > 0 || old.isOpen !== undefined)) {
      if (old.gms !== undefined) t.gms = old.gms;
      if (old.ims !== undefined) t.ims = old.ims;
      if (old.fms !== undefined) t.fms = old.fms;
      if (old.firstPrize !== undefined) t.firstPrize = old.firstPrize;
      if (old.isOpen !== undefined) t.isOpen = old.isOpen;
      reused++;
    }
  });
  console.log(`  ⚡ Reused details from cache for ${reused} tournaments`);

  // 2. Identify priority tournaments needing detail extraction
  const isPriority = t => {
    const n = (t.name || '').toLowerCase();
    return n.includes('open') || n.includes('festiwal') || n.includes('memoriał') ||
           n.includes('memorial') || n.includes('mistrzostw') || n.includes('championship') ||
           n.includes('grand prix') || n.includes('puchar') || n.includes('cup') ||
           (t.players && t.players >= 20);
  };

  const pending = tournaments.filter(t => t.gms === undefined);
  pending.sort((a, b) => {
    const pA = isPriority(a) ? 1 : 0;
    const pB = isPriority(b) ? 1 : 0;
    if (pA !== pB) return pB - pA;
    return (a.startDate || '').localeCompare(b.startDate || '');
  });

  // Safe batch of up to 60 per run to prevent server strain and rate limits
  const batch = pending.slice(0, 60);
  console.log(`\n🔍 Scraping batch of ${batch.length} tournaments for details (pacing 250ms, concurrency 2)...`);

  const concurrency = 2;
  for (let i = 0; i < batch.length; i += concurrency) {
    const chunk = batch.slice(i, i + concurrency);

    await Promise.all(chunk.map(async (t) => {
      try {
        let fetchUrl = t.source;
        if (t.scrapedFrom === 'Chess-Results' && fetchUrl.includes('.aspx')) {
          fetchUrl = fetchUrl.replace('.aspx', '.aspx?art=0&zeilen=99999');
        } else if (t.scrapedFrom === 'ChessArbiter' && fetchUrl.includes('turnieje/')) {
          const match = fetchUrl.match(/turnieje\/([^\/]+)/) || fetchUrl.match(/turn=([^&]+)/);
          if (match) {
            fetchUrl = `http://www.chessarbiter.com/turnieje/${match[1]}/results.html?l=pl&tb=2_`;
          }
        }

        if (!fetchUrl || fetchUrl === '#' || !fetchUrl.startsWith('http')) {
          t.gms = t.gms || 0;
          t.ims = t.ims || 0;
          t.fms = t.fms || 0;
          return;
        }

        const res = await fetch(fetchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          timeout: 10000
        });

        if (res.status === 429) {
          console.warn(`  ⚠️ Rate limit reached for ${t.scrapedFrom}, sleeping 3s...`);
          await sleep(3000);
          return;
        }

        if (!res.ok) return;
        const html = await res.text();

        t.gms = (html.match(/\bW?GM\b/g) || []).length;
        t.ims = (html.match(/\bW?IM\b/g) || []).length;
        t.fms = (html.match(/\bW?FM\b/g) || []).length;

        const prizeMatch = html.match(/(€|PLN|EUR|USD|\$|£|GBP|CHF|AUD|CAD)\s*([\d,\.]+)/i);
        if (prizeMatch) {
          const currency = prizeMatch[1].toUpperCase();
          const val = parseInt(prizeMatch[2].replace(/[^\d]/g, ''), 10);
          if (val > 0 && val < 1000000) {
            let multiplier = 1.0;
            switch(currency) {
              case '€': case 'EUR': multiplier = 1.10; break;
              case 'PLN': multiplier = 0.25; break;
              case '£': case 'GBP': multiplier = 1.25; break;
              case 'CHF': multiplier = 1.15; break;
              case 'AUD': multiplier = 0.65; break;
              case 'CAD': multiplier = 0.74; break;
            }
            t.firstPrize = Math.round(val * multiplier);
          }
        }

        t.isOpen = !(html.toLowerCase().includes('closed') || (t.name && t.name.toLowerCase().includes('zamknięt')));
      } catch (e) {
        // Ignore timeouts
      }
    }));

    await sleep(250);
    process.stdout.write(`\r  Progress: ${Math.min(i + concurrency, batch.length)} / ${batch.length}`);
  }

  // Set clean default 0 for unscraped so frontend filters work seamlessly
  tournaments.forEach(t => {
    if (t.gms === undefined) t.gms = 0;
    if (t.ims === undefined) t.ims = 0;
    if (t.fms === undefined) t.fms = 0;
    if (t.firstPrize === undefined) t.firstPrize = 0;
    if (t.isOpen === undefined) t.isOpen = true;
  });

  console.log('\n  ✅ Batched details scraping complete!');
  return tournaments;
}

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');

  // Load cache of previously scraped details
  const cacheFile = path.join(__dirname, '..', 'data', 'tournaments.json');
  const cache = new Map();
  if (fs.existsSync(cacheFile)) {
    try {
      const oldJson = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (oldJson && Array.isArray(oldJson.tournaments)) {
        oldJson.tournaments.forEach(t => {
          const key = t.source || `${t.name}_${t.startDate}`;
          cache.set(key, t);
        });
        console.log(`💾 Cache loaded: ${cache.size} known tournaments`);
      }
    } catch (e) {
      console.warn('Could not read existing cache:', e.message);
    }
  }
  
  // Launch shared Puppeteer browser for Chess-Results and ChessManager
  let browser;
  let resultsData = [];
  let managerData = [];
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    resultsData = await scrapeChessResults(browser);
    managerData = await scrapeChessManager(browser);
  } catch (err) {
    console.error('Puppeteer scraper error:', err.message);
  } finally {
    if (browser) await browser.close();
  }

  // Scrape ChessArbiter in parallel / separately via HTTP fetch
  const arbiterData = await scrapeChessArbiter();
  
  let all = [...arbiterData, ...resultsData, ...managerData];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let upcoming = all
    .filter(t => t.endDate >= cutoffStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // DEEP SCRAPE with cache and safe batching
  upcoming = await fetchTournamentDetails(upcoming, cache);

  // Geocoding — build TWO maps: exact + accent-normalized
  console.log('🌍 Geocoding cities...');
  const cities = require('cities.json');

  // FIDE country code → ISO 2-letter mapping (for preferring correct country)
  const fideToIso2 = {
    'POL':'PL','ENG':'GB','GER':'DE','FRA':'FR','ESP':'ES','ITA':'IT','USA':'US','CAN':'CA',
    'IND':'IN','BRA':'BR','AUS':'AU','ARG':'AR','NED':'NL','BEL':'BE','TUR':'TR','UKR':'UA',
    'UAE':'AE','MEX':'MX','IRI':'IR','GRE':'GR','BLR':'BY','AZE':'AZ','ARM':'AM','ISL':'IS',
    'PHI':'PH','ISR':'IL','CRO':'HR','ROU':'RO','RSA':'ZA','CHI':'CL','KAZ':'KZ','UZB':'UZ',
    'SRB':'RS','CZE':'CZ','SVK':'SK','SWE':'SE','NOR':'NO','DEN':'DK','FIN':'FI','HUN':'HU',
    'SUI':'CH','AUT':'AT','IRL':'IE','POR':'PT','CUB':'CU','VEN':'VE','INA':'ID','MAS':'MY',
    'VIE':'VN','THA':'TH','CHN':'CN','JPN':'JP','KOR':'KR','ALG':'DZ','NGR':'NG','KEN':'KE',
    'LAT':'LV','LTU':'LT','EST':'EE','GEO':'GE','BUL':'BG','SLO':'SI','COL':'CO','ECU':'EC',
    'PER':'PE','URU':'UY','TUN':'TN','EGY':'EG','MAR':'MA','ZAM':'ZM','SRB':'RS',
  };

  // Manual aliases for city name mismatches (normalized form → canonical)
  const cityAliases = {
    'geneve':'geneva','genf':'geneva','warszawa':'warsaw','krakow':'krakow',
    'wien':'vienna','munchen':'munich','koln':'cologne','dusseldorf':'dusseldorf',
    'moskva':'moscow','moskwa':'moscow','bucuresti':'bucharest','bratislava':'bratislava',
    'beograd':'belgrade','zagreb':'zagreb','sofia':'sofia','tallinn':'tallinn',
    'riga':'riga','vilnius':'vilnius','kyiv':'kyiv','kiev':'kyiv',
    'sankt peterburg':'saint petersburg','st petersburg':'saint petersburg',
  };


  const normalize = s => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';

  // Build map: normalized_name → list of {lat, lon, country}
  const cityIndex = new Map();
  for (const c of cities) {
    const key = normalize(c.name);
    if (!cityIndex.has(key)) cityIndex.set(key, []);
    cityIndex.get(key).push({ lat: parseFloat(c.lat), lon: parseFloat(c.lng), iso2: c.country });
  }

  function findCoords(cityStr, countryCode) {
    if (!cityStr) return null;
    const preferIso2 = fideToIso2[countryCode] || null;

    function bestMatch(key) {
      const aliasedKey = cityAliases[key] || key;
      const hits = cityIndex.get(aliasedKey);
      if (!hits || hits.length === 0) return null;
      if (preferIso2) {
        const preferred = hits.find(h => h.iso2 === preferIso2);
        if (preferred) return preferred;
      }
      return hits[0];
    }

    // 1. Exact normalized match
    let m = bestMatch(normalize(cityStr));
    if (m) return m;

    // 2. Try each comma/slash-separated token
    const parts = cityStr.split(/[,\/]/);
    for (const part of parts) {
      const token = part.trim();
      m = bestMatch(normalize(token));
      if (m) return m;
      // 3. First two words
      const words = token.split(/\s+/);
      if (words.length >= 2) {
        m = bestMatch(normalize(words.slice(0, 2).join(' ')));
        if (m) return m;
      }
      // 4. First word (only if meaningful length)
      if (words[0] && words[0].length > 3) {
        m = bestMatch(normalize(words[0]));
        if (m) return m;
      }
    }
    return null;
  }

  let geocoded = 0;
  upcoming.forEach(t => {
    const coords = findCoords(t.city, t.country);
    if (coords) {
      t.lat = coords.lat;
      t.lon = coords.lon;
      geocoded++;
    }
  });
  console.log(`  ✅ Geocoded ${geocoded} / ${upcoming.length} tournaments (${Math.round(geocoded/upcoming.length*100)}%)`);


  console.log(`📦 Total playable upcoming: ${upcoming.length}`);

  const outDir = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'tournaments.json');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const output = {
    updatedAt: new Date().toISOString(),
    count: upcoming.length,
    tournaments: upcoming,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Saved to ${outFile}\n`);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
