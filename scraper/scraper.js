const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function detectTimeControl(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('blitz') || n.includes('błysk')) return 'Blitz';
  if (n.includes('rapid') || n.includes('szybki') || n.includes('p' + String.fromCharCode(243) + 'łaktywn')) return 'Rapid';
  if (n.includes('bullet')) return 'Bullet';
  return 'Classical';
}

function extractDates(htmlStr) {
  const parts = htmlStr.split('<br>').map(s => s.replace(/<[^>]+>/g, '').trim());
  const year = new Date().getFullYear();
  let start = '';
  let end = '';
  if (parts.length > 0 && parts[0].match(/\d{2}-\d{2}/)) {
    const [d, m] = parts[0].split('-');
    start = `${year}-${m}-${d}`;
  }
  if (parts.length > 1 && parts[1].match(/\d{2}-\d{2}/)) {
    const [d, m] = parts[1].split('-');
    end = `${year}-${m}-${d}`;
  } else {
    end = start;
  }
  return { start, end };
}

async function scrapeChessArbiter() {
  console.log('📡 Scraping ChessArbiter.com...');
  const tournaments = [];
  try {
    const html = await fetch('http://www.chessarbiter.com/turnieje.php', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
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

        const dateHtml = cells.eq(0).html() || '';
        const { start, end } = extractDates(dateHtml);
        if (!start) return;

        let city = '';
        aTag[0].nextSibling && (city = aTag[0].nextSibling.nodeValue || '');
        city = city.replace(/\[.*\]/g, '').trim() || 'Polska';

        tournaments.push({
          id: `ca-${idCounter++}`,
          name,
          city,
          country: 'Poland',
          continent: 'Europe',
          flag: '🇵🇱',
          startDate: start,
          endDate: end,
          durationDays: 1,
          timeControl: detectTimeControl(name),
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
  'AZE': '🇦🇿', 'PER': '🇵🇪', 'ARM': '🇦🇲', 'ISL': '🇮🇸', 'PHI': '🇵🇭', 'ISR': '🇮🇱', 'CRO': '🇭🇷', 'ROU': '🇷🇴',
  'RSA': '🇿🇦', 'CHI': '🇨🇱', 'KAZ': '🇰🇿', 'UZB': '🇺🇿', 'SRB': '🇷🇸', 'CZE': '🇨🇿', 'SVK': '🇸🇰', 'SWE': '🇸🇪',
  'NOR': '🇳🇴', 'DEN': '🇩🇰', 'FIN': '🇫🇮', 'HUN': '🇭🇺', 'SUI': '🇨🇭', 'AUT': '🇦🇹', 'IRL': '🇮🇪', 'WLS': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'SCO': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'POR': '🇵🇹', 'CUB': '🇨🇺', 'VEN': '🇻🇪', 'PAR': '🇵🇾', 'INA': '🇮🇩', 'MAS': '🇲🇾', 'SGP': '🇸🇬',
  'VIE': '🇻🇳', 'THA': '🇹🇭', 'CHN': '🇨🇳', 'JPN': '🇯🇵', 'KOR': '🇰🇷', 'ALG': '🇩🇿', 'NGR': '🇳🇬', 'KEN': '🇰🇪'
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
  return 'Europe'; // Default fallback
}

async function scrapeChessResults() {
  console.log('📡 Scraping Chess-Results.com (via Puppeteer)...');
  const tournaments = [];
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Increase navigation timeout for GitHub Actions
    await page.goto('https://chess-results.com/TurnierSuche.aspx?lan=1', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('  Selecting max results...');
    await page.evaluate(() => {
      // Set to max rows (value '10' usually means max/all depending on the form, or we can just try to click)
      const select = document.querySelector('select[name="ctl00$P1$combo_anzahl_zeilen"]');
      if (select) {
        const lastOption = select.options[select.options.length - 1];
        select.value = lastOption.value; // Select the maximum value available in the dropdown
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
      
      tournaments.push({
        id: `cr-${crCounter++}`,
        name,
        city: city || fedCode,
        country: fedCode,
        continent: getContinent(fedCode),
        flag: countryFlags[fedCode] || '🏳️',
        startDate: start,
        endDate: end || start,
        durationDays: 1,
        timeControl: detectTimeControl(tcRaw || name),
        rounds: rounds,
        players: players,
        source: `https://chess-results.com/${sourceUrl}`,
        scrapedFrom: 'Chess-Results'
      });
    });
    
    console.log(`  ✅ Chess-Results: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ Chess-Results failed:', e.message);
  } finally {
    if (browser) await browser.close();
  }
  return tournaments;
}

async function fetchTournamentDetails(tournaments) {
  console.log(`\n🔍 Deep scraping details for ${tournaments.length} tournaments (this takes a minute)...`);
  
  const concurrency = 15;
  for (let i = 0; i < tournaments.length; i += concurrency) {
    const chunk = tournaments.slice(i, i + concurrency);
    
    await Promise.all(chunk.map(async (t) => {
      try {
        let fetchUrl = t.source;
        if (t.scrapedFrom === 'Chess-Results' && fetchUrl.includes('.aspx')) {
          fetchUrl = fetchUrl.replace('.aspx', '.aspx?art=0&zeilen=99999'); // Starting rank all players
        } else if (t.scrapedFrom === 'ChessArbiter' && fetchUrl.includes('turnieje/')) {
          const match = fetchUrl.match(/turn=([^&]+)/);
          if (match) {
            fetchUrl = `http://www.chessarbiter.com/turnieje/${match[1]}/results.html?l=pl&tb=2_`;
          } else {
            fetchUrl = fetchUrl + (fetchUrl.endsWith('/') ? '?' : '&') + 'str=2'; // Fallback
          }
        }
        
        if (fetchUrl === '#' || !fetchUrl.startsWith('http')) return;

        const res = await fetch(fetchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        if (!res.ok) return;
        const html = await res.text();
        
        // Count Titled Players
        t.gms = (html.match(/\bW?GM\b/g) || []).length;
        t.ims = (html.match(/\bW?IM\b/g) || []).length;
        t.fms = (html.match(/\bW?FM\b/g) || []).length;
        
        // Extract Prize Money (rough regex for € and PLN)
        const prizeMatch = html.match(/(?:€|PLN|EUR|USD|\$|£)\s*([\d,\.]+)/i);
        if (prizeMatch) {
          const val = parseInt(prizeMatch[1].replace(/[^\d]/g, ''), 10);
          if (val > 0 && val < 1000000) t.firstPrize = val;
        }

        // Open/Closed Check
        if (html.toLowerCase().includes('closed') || t.name.toLowerCase().includes('zamknięt')) {
          t.isOpen = false;
        } else {
          t.isOpen = true;
        }

      } catch (e) {
        // Ignore timeouts
      }
    }));
    
    process.stdout.write(`\r  Progress: ${Math.min(i + concurrency, tournaments.length)} / ${tournaments.length}`);
  }
  console.log('\n  ✅ Deep scraping complete!');
  return tournaments;
}

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');
  
  const [arbiterData, resultsData] = await Promise.all([
    scrapeChessArbiter(),
    scrapeChessResults()
  ]);
  
  let all = [...arbiterData, ...resultsData];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  let upcoming = all
    .filter(t => t.endDate >= cutoffStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // DEEP SCRAPE!
  upcoming = await fetchTournamentDetails(upcoming);

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
