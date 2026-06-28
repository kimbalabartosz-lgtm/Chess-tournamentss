const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

function detectTimeControl(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('blitz') || n.includes('błysk')) return 'Blitz';
  if (n.includes('rapid') || n.includes('szybki') || n.includes('p' + String.fromCharCode(243) + 'łaktywn')) return 'Rapid';
  if (n.includes('bullet')) return 'Bullet';
  return 'Classical';
}

function extractDates(htmlStr) {
  // e.g. "26-06<br>26-06" or "11-06<br>trwający"
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

    // Loop through all tables since there are multiple tables for different months
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

        // The city is usually the text right after the <a> tag
        let city = '';
        aTag[0].nextSibling && (city = aTag[0].nextSibling.nodeValue || '');
        city = city.replace(/\[.*\]/g, '').trim() || 'Polska';

        tournaments.push({
          id: idCounter++,
          name,
          city,
          country: 'Poland',
          continent: 'Europe',
          flag: '🇵🇱',
          startDate: start,
          endDate: end,
          durationDays: 1,
          timeControl: detectTimeControl(name),
          firstPrize: 0,
          totalPrize: 0,
          entryFee: 0,
          players: 0,
          gms: 0,
          ims: 0,
          fms: 0,
          rounds: 7,
          fideRated: name.toLowerCase().includes('fide'),
          source: sourceUrl.startsWith('http') ? sourceUrl : `https://www.chessarbiter.com/turnieje/${sourceUrl}`,
          scrapedFrom: 'chessarbiter'
        });
      });
    });

    console.log(`  ✅ ChessArbiter: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ ChessArbiter failed:', e.message);
  }
  return tournaments;
}

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');
  const all = await scrapeChessArbiter();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
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
     
 
  
