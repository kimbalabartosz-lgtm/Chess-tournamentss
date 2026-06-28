/**
 * chess:tour scraper
 * Sources: Chess-Results.com, ChessArbiter.com, FIDE calendar
 * Writes to: ../data/tournaments.json
 * Run with: node scraper.js
 */

const fetch   = require('node-fetch');
const cheerio = require('cheerio');
const fs      = require('fs');
const path    = require('path');

// ── Helpers ────────────────────────────────────────────────

const CONTINENT_MAP = {
  'Poland':'Europe','Germany':'Europe','France':'Europe','Spain':'Europe',
  'Italy':'Europe','Netherlands':'Europe','England':'Europe','Russia':'Europe',
  'Norway':'Europe','Czech Republic':'Europe','Slovakia':'Europe','Hungary':'Europe',
  'Austria':'Europe','Switzerland':'Europe','Sweden':'Europe','Denmark':'Europe',
  'Belgium':'Europe','Portugal':'Europe','Romania':'Europe','Greece':'Europe',
  'Bulgaria':'Europe','Croatia':'Europe','Serbia':'Europe','Ukraine':'Europe',
  'Turkey':'Europe','Isle of Man':'Europe','Scotland':'Europe','Ireland':'Europe',
  'Georgia':'Europe','Armenia':'Europe','Azerbaijan':'Europe','Latvia':'Europe',
  'Lithuania':'Europe','Estonia':'Europe','Belarus':'Europe','Moldova':'Europe',
  'United States':'Americas','Canada':'Americas','Brazil':'Americas',
  'Argentina':'Americas','Mexico':'Americas','Cuba':'Americas','Peru':'Americas',
  'Colombia':'Americas','Chile':'Americas','Venezuela':'Americas','Uruguay':'Americas',
  'China':'Asia','India':'Asia','Japan':'Asia','South Korea':'Asia',
  'UAE':'Asia','Saudi Arabia':'Asia','Iran':'Asia','Indonesia':'Asia',
  'Vietnam':'Asia','Philippines':'Asia','Singapore':'Asia','Thailand':'Asia',
  'Israel':'Asia','Uzbekistan':'Asia','Kazakhstan':'Asia','Mongolia':'Asia',
  'Egypt':'Africa','South Africa':'Africa','Nigeria':'Africa','Morocco':'Africa',
  'Kenya':'Africa','Tunisia':'Africa','Algeria':'Africa','Zimbabwe':'Africa',
  'Australia':'Oceania','New Zealand':'Oceania',
};

const FLAG_MAP = {
  'Poland':'🇵🇱','Germany':'🇩🇪','France':'🇫🇷','Spain':'🇪🇸','Italy':'🇮🇹',
  'Netherlands':'🇳🇱','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Russia':'🇷🇺','Norway':'🇳🇴',
  'Czech Republic':'🇨🇿','Slovakia':'🇸🇰','Hungary':'🇭🇺','Austria':'🇦🇹',
  'Switzerland':'🇨🇭','Sweden':'🇸🇪','Denmark':'🇩🇰','Belgium':'🇧🇪',
  'Portugal':'🇵🇹','Romania':'🇷🇴','Greece':'🇬🇷','Bulgaria':'🇧🇬',
  'Croatia':'🇭🇷','Serbia':'🇷🇸','Ukraine':'🇺🇦','Turkey':'🇹🇷',
  'Isle of Man':'🇮🇲','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Ireland':'🇮🇪','Georgia':'🇬🇪',
  'Armenia':'🇦🇲','Azerbaijan':'🇦🇿','Latvia':'🇱🇻','Lithuania':'🇱🇹',
  'Estonia':'🇪🇪','Belarus':'🇧🇾','Moldova':'🇲🇩',
  'United States':'🇺🇸','Canada':'🇨🇦','Brazil':'🇧🇷','Argentina':'🇦🇷',
  'Mexico':'🇲🇽','Cuba':'🇨🇺','Peru':'🇵🇪','Colombia':'🇨🇴','Chile':'🇨🇱',
  'China':'🇨🇳','India':'🇮🇳','Japan':'🇯🇵','South Korea':'🇰🇷',
  'UAE':'🇦🇪','Saudi Arabia':'🇸🇦','Iran':'🇮🇷','Indonesia':'🇮🇩',
  'Vietnam':'🇻🇳','Philippines':'🇵🇭','Singapore':'🇸🇬','Thailand':'🇹🇭',
  'Israel':'🇮🇱','Uzbekistan':'🇺🇿','Kazakhstan':'🇰🇿','Mongolia':'🇲🇳',
  'Egypt':'🇪🇬','South Africa':'🇿🇦','Nigeria':'🇳🇬','Morocco':'🇲🇦',
  'Kenya':'🇰🇪','Tunisia':'🇹🇳','Algeria':'🇩🇿','Zimbabwe':'🇿🇼',
  'Australia':'🇦🇺','New Zealand':'🇳🇿',
};

function getContinent(country) { return CONTINENT_MAP[country] || 'Europe'; }
function getFlag(country)      { return FLAG_MAP[country] || '🏳️'; }

function parseDate(str) {
  if (!str) return '';
  // Handles formats like "2026-07-12", "12.07.2026", "Jul 12, 2026"
  const iso = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return str.slice(0, 10);
  const dot = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;
  return '';
}

function daysBetween(s, e) {
  const a = new Date(s), b = new Date(e);
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

function detectTimeControl(name = '') {
  const n = name.toLowerCase();
  if (n.includes('blitz') || n.includes('błysk')) return 'Blitz';
  if (n.includes('rapid') || n.includes('szybk')) return 'Rapid';
  if (n.includes('bullet'))                         return 'Bullet';
  return 'Classical';
}

let _id = 1;
function makeId() { return _id++; }

// ── Source 1: Chess-Results.com ────────────────────────────

async function scrapeChessResults() {
  console.log('📡 Scraping Chess-Results.com...');
  const tournaments = [];

  try {
    const html = await fetch(
      'https://chess-results.com/tur.aspx?lan=1',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChessTourBot/1.0)' }, timeout: 20000 }
    ).then(r => r.text());

    const $ = cheerio.load(html);

    // Chess-Results tournament table has rows with class "CRg1" or "CRg2"
    $('table.CRs1 tr, table tr.CRg1, table tr.CRg2').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 5) return;

      const nameCell   = cells.eq(1);
      const dateCell   = cells.eq(2);
      const cityCell   = cells.eq(3);
      const countryCell = cells.eq(4);
      const playersCell = cells.eq(5);

      const name      = nameCell.text().trim();
      const rawDate   = dateCell.text().trim();
      const city      = cityCell.text().trim();
      const country   = countryCell.text().trim() || 'Unknown';
      const players   = parseInt(playersCell.text().trim()) || 0;
      const sourceUrl = nameCell.find('a').attr('href');

      if (!name || name.length < 3) return;

      // Parse date range like "12.07.2026 - 20.07.2026"
      const dateParts = rawDate.split('-').map(s => s.trim());
      const startDate = parseDate(dateParts[0]);
      const endDate   = parseDate(dateParts[1] || dateParts[0]);
      if (!startDate) return;

      const timeControl   = detectTimeControl(name);
      const durationDays  = daysBetween(startDate, endDate);

      tournaments.push({
        id:          makeId(),
        name,
        city:        city || 'Unknown',
        country,
        continent:   getContinent(country),
        flag:        getFlag(country),
        startDate,
        endDate,
        durationDays,
        timeControl,
        firstPrize:  0,  // not available in list view
        totalPrize:  0,
        entryFee:    0,
        players,
        gms:         0,
        ims:         0,
        fms:         0,
        rounds:      9,
        fideRated:   true,
        source:      sourceUrl ? `https://chess-results.com/${sourceUrl}` : '#',
        scrapedFrom: 'chess-results',
      });
    });

    console.log(`  ✅ Chess-Results: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ Chess-Results failed:', e.message);
  }

  return tournaments;
}

// ── Source 2: ChessArbiter.com ─────────────────────────────

async function scrapeChessArbiter() {
  console.log('📡 Scraping ChessArbiter.com...');
  const tournaments = [];

  try {
    const html = await fetch(
      'https://www.chessarbiter.com/turnieje/',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChessTourBot/1.0)' }, timeout: 20000 }
    ).then(r => r.text());

    const $ = cheerio.load(html);

    $('table tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      if (cells.length < 4) return;

      const name      = cells.eq(0).text().trim();
      const rawDate   = cells.eq(1).text().trim();
      const city      = cells.eq(2).text().trim();
      const country   = 'Poland'; // ChessArbiter is Polish
      const sourceUrl = cells.eq(0).find('a').attr('href');

      if (!name || name.length < 3) return;

      const dateParts = rawDate.split(/[-–]/).map(s => s.trim());
      const startDate = parseDate(dateParts[0]);
      const endDate   = parseDate(dateParts[1] || dateParts[0]);
      if (!startDate) return;

      tournaments.push({
        id:          makeId(),
        name,
        city:        city || 'Poland',
        country,
        continent:   'Europe',
        flag:        '🇵🇱',
        startDate,
        endDate,
        durationDays: daysBetween(startDate, endDate),
        timeControl:  detectTimeControl(name),
        firstPrize:   0,
        totalPrize:   0,
        entryFee:     0,
        players:      0,
        gms:          0,
        ims:          0,
        fms:          0,
        rounds:       7,
        fideRated:    false,
        source:       sourceUrl ? `https://www.chessarbiter.com${sourceUrl}` : '#',
        scrapedFrom:  'chessarbiter',
      });
    });

    console.log(`  ✅ ChessArbiter: ${tournaments.length} tournaments found`);
  } catch (e) {
    console.error('  ❌ ChessArbiter failed:', e.message);
  }

  return tournaments;
}

// ── Source 3: FIDE Calendar ────────────────────────────────

async function scrapeFide() {
  console.log('📡 Scraping FIDE calendar...');
  const tournaments = [];

  try {
    // FIDE has a calendar JSON endpoint
    const data = await fetch(
      'https://www.fide.com/api/calendar',
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChessTourBot/1.0)', 'Accept': 'application/json' }, timeout: 20000 }
    ).then(r => r.json());

    const items = data?.data || data?.events || data || [];
    items.slice(0, 100).forEach(ev => {
      const name      = ev.name || ev.title || '';
      const city      = ev.city || ev.venue || '';
      const country   = ev.country || '';
      const startDate = parseDate(ev.start_date || ev.startDate || ev.date_start || '');
      const endDate   = parseDate(ev.end_date   || ev.endDate   || ev.date_end   || startDate);
      if (!name || !startDate) return;

      tournaments.push({
        id:          makeId(),
        name,
        city,
        country,
        continent:   getContinent(country),
        flag:        getFlag(country),
        startDate,
        endDate,
        durationDays: daysBetween(startDate, endDate),
        timeControl:  detectTimeControl(name),
        firstPrize:   ev.prize_fund ? parseInt(ev.prize_fund) : 0,
        totalPrize:   0,
        entryFee:     0,
        players:      ev.players_count || 0,
        gms:          0,
        ims:          0,
        fms:          0,
        rounds:       ev.rounds || 9,
        fideRated:    true,
        source:       ev.url || ev.link || '#',
        scrapedFrom:  'fide',
      });
    });

    console.log(`  ✅ FIDE: ${tournaments.length} events found`);
  } catch (e) {
    console.error('  ❌ FIDE failed:', e.message);
  }

  return tournaments;
}

// ── Deduplicate ────────────────────────────────────────────

function deduplicate(all) {
  const seen = new Set();
  return all.filter(t => {
    // Key: normalized name + start date
    const key = t.name.toLowerCase().replace(/\s+/g, ' ').trim() + '|' + t.startDate;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');

  const [cr, ca, fide] = await Promise.all([
    scrapeChessResults(),
    scrapeChessArbiter(),
    scrapeFide(),
  ]);

  const all = deduplicate([...cr, ...ca, ...fide]);

  // Filter: only future or recent (within 30 days past)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const upcoming = all
    .filter(t => t.endDate >= cutoffStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  console.log(`\n📦 Total after dedup + filter: ${upcoming.length} tournaments`);

  // Write output
  const outDir  = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'tournaments.json');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const output = {
    updatedAt:   new Date().toISOString(),
    count:       upcoming.length,
    tournaments: upcoming,
  };

  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Saved to ${outFile}`);
  console.log(`   ${upcoming.length} tournaments written\n`);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
