/**
 * chess:tour scraper (Powered by Lichess Official Broadcasts)
 * Writes to: ../data/tournaments.json
 */

const fetch = require('node-fetch');
const fs    = require('fs');
const path  = require('path');

function getContinent(country) {
  const c = (country || '').toLowerCase();
  if (c.includes('usa') || c.includes('canada') || c.includes('brazil') || c.includes('argentina') || c.includes('mexico')) return 'Americas';
  if (c.includes('india') || c.includes('china') || c.includes('japan') || c.includes('uae') || c.includes('uzbekistan')) return 'Asia';
  if (c.includes('egypt') || c.includes('south africa') || c.includes('morocco')) return 'Africa';
  if (c.includes('australia') || c.includes('new zealand')) return 'Oceania';
  return 'Europe'; // Default fallback
}

function detectTimeControl(tcString) {
  const s = (tcString || '').toLowerCase();
  if (s.includes('blitz')) return 'Blitz';
  if (s.includes('rapid') || s.includes('szybk')) return 'Rapid';
  if (s.includes('bullet')) return 'Bullet';
  return 'Classical';
}

function parseLichessDates(datesArr) {
  if (!datesArr || datesArr.length === 0) return { start: '', end: '', days: 1 };
  const d1 = new Date(datesArr[0]);
  const d2 = new Date(datesArr[datesArr.length - 1]);
  return {
    start: d1.toISOString().slice(0, 10),
    end: d2.toISOString().slice(0, 10),
    days: Math.max(1, Math.round((d2 - d1) / 86400000) + 1)
  };
}

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');
  const tournaments = [];
  
  try {
    // Fetch top 300 official broadcasts from Lichess
    const res = await fetch('https://lichess.org/api/broadcast?nb=300');
    const text = await res.text();
    const lines = text.trim().split('\n');

    let idCounter = 1;

    for (const line of lines) {
      if (!line) continue;
      try {
        const ev = JSON.parse(line);
        if (!ev.tour || !ev.tour.name) continue;

        const info = ev.tour.info || {};
        const location = info.location || 'Online / Unknown';
        const [city, country] = location.split(',').map(s => s.trim());

        const d = parseLichessDates(ev.tour.dates);
        if (!d.start) continue;

        tournaments.push({
          id: idCounter++,
          name: ev.tour.name,
          city: city || 'Global',
          country: country || 'International',
          continent: getContinent(country),
          flag: '🌍',
          startDate: d.start,
          endDate: d.end,
          durationDays: d.days,
          timeControl: detectTimeControl(info.tc),
          firstPrize: 0,
          totalPrize: 0,
          entryFee: 0,
          players: ev.rounds ? ev.rounds.length * 2 : 0, 
          gms: ev.tour.tier === 1 ? 10 : (ev.tour.tier === 2 ? 5 : 0),
          ims: 0,
          fms: 0,
          rounds: ev.rounds ? ev.rounds.length : 9,
          fideRated: info.fideTC === 'standard',
          source: ev.tour.url || info.website || `https://lichess.org/broadcast/-/${ev.tour.id}`,
          scrapedFrom: 'lichess'
        });
      } catch (e) {
        // Skip invalid lines
      }
    }
  } catch (err) {
    console.error('Error fetching Lichess data:', err.message);
  }

  // Filter only future or recently finished tournaments (last 30 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const upcoming = tournaments
    .filter(t => t.endDate >= cutoffStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  console.log(`📦 Total scraped: ${upcoming.length} tournaments`);

  const outDir = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'tournaments.json');

  if (!require('fs').existsSync(outDir)) require('fs').mkdirSync(outDir, { recursive: true });

  const output = {
    updatedAt: new Date().toISOString(),
    count: upcoming.length,
    tournaments: upcoming,
  };

  require('fs').writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Saved ${upcoming.length} tournaments to ${outFile}\n`);
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
