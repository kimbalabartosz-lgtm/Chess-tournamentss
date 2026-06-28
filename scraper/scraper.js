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
  'COL': '🇨🇴', 'IND': '🇮🇳', 'BRA': '🇧🇷', 'AUS': '🇦🇺', 'NZL': '🇳🇿', 'ARG': '🇦🇷', 'NED': '🇳🇱', 'BEL': '🇧🇪'
};

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
    
    await page.evaluate(() => {
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
      
      tournaments.push({
        id: `cr-${crCounter++}`,
        name,
        city: city || fedCode,
        country: fedCode,
        continent: 'Global',
        flag: countryFlags[fedCode] || '🏳️',
        startDate: start,
        endDate: end || start,
        durationDays: 1,
        timeControl: detectTimeControl(tcRaw || name),
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

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');
  
  const [arbiterData, resultsData] = await Promise.all([
    scrapeChessArbiter(),
    scrapeChessResults()
  ]);
  
  const all = [...arbiterData, ...resultsData];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 2);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const upcoming = all
    .filter(t => t.endDate >= cutoffStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

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

  
  
       
  
