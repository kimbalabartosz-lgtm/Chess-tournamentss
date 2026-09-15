const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const BOT_USER_AGENT = 'ChessTourBot/1.0 (+https://chess-tournamentss.vercel.app/; contact@chess-tour.app)';

function isFischerRandom(name) {
  const n = (name || '').toLowerCase();
  if (/\b960\b/.test(n) || n.includes('chess960')) return true;
  if (n.includes('fischer') || n.includes('fisher')) return true;
  return false;
}

function detectTimeControl(name, extraText = '') {
  const n = `${name || ''} ${extraText || ''}`.toLowerCase();

  // 1. Explicit Blitz keywords and time controls (<= 5 min)
  if (/\b(?:blitz|błysk|blysk|blitzschach|relampago|lampo|blitzu|blitzem)\b/i.test(n)) return 'Blitz';
  if (/\b(?:bullet)\b/i.test(n)) return 'Blitz';
  if (/\b(?:1|2|3|4|5)\s*(?:min|'|\+|m\b)/i.test(n) || /\bp['`’]?(?:1|2|3|4|5)\b/i.test(n)) {
    if (!/\b(?:1|2|3|4|5)\s*rund/i.test(n)) return 'Blitz';
  }

  // 2. Explicit Rapid keywords and time controls (10-45 min, 10'+5'', P'15, etc.)
  if (/\b(?:rapid|szybki|szybkie|szybkich|szybkim|rapide|rapido|schnellschach|semilampo|aktivschach|półaktywn|polaktywn)\b/i.test(n)) return 'Rapid';
  if (/\b(?:10|12|15|20|25|30|45)\s*(?:min|'|\+|m\b)/i.test(n) || /\bp['`’]?(?:10|12|15|20|25|30|45)\b/i.test(n)) {
    if (!/\b(?:10|12|15|20|25|30|45)\s*rund/i.test(n)) return 'Rapid';
  }

  // 3. Classical keywords
  if (/\b(?:klasyczn|classical|standard|turniej kołowy|kołowy|kolowy)\b/i.test(n)) return 'Classical';

  return 'Classical';
}

function detectFide(text) {
  if (!text) return false;
  return /\bFIDE\b/i.test(text);
}

// ── CURRENCY & PRIZE PARSER ───────────────────────────
const COUNTRY_CURRENCIES = {
  'POL': 'PLN', 'Poland': 'PLN',
  'GER': 'EUR', 'FRA': 'EUR', 'ESP': 'EUR', 'ITA': 'EUR', 'NED': 'EUR', 'BEL': 'EUR',
  'AUT': 'EUR', 'IRL': 'EUR', 'POR': 'EUR', 'FIN': 'EUR', 'GRE': 'EUR', 'CYP': 'EUR',
  'MLT': 'EUR', 'SVK': 'EUR', 'SLO': 'EUR', 'EST': 'EUR', 'LAT': 'EUR', 'LTU': 'EUR',
  'CRO': 'EUR', 'CAT': 'EUR', 'LUX': 'EUR',
  'USA': 'USD', 'ECU': 'USD', 'PAN': 'USD', 'PUR': 'USD',
  'ENG': 'GBP', 'SCO': 'GBP', 'WLS': 'GBP',
  'CAN': 'CAD', 'AUS': 'AUD', 'NZL': 'NZD', 'SUI': 'CHF',
  'CZE': 'CZK', 'HUN': 'HUF', 'SWE': 'SEK', 'NOR': 'NOK', 'DEN': 'DKK', 'ISL': 'ISK',
  'ROU': 'RON', 'BUL': 'BGN', 'SRB': 'RSD', 'BIH': 'BAM', 'MKD': 'MKD', 'ALB': 'ALL',
  'UKR': 'UAH', 'BLR': 'BYN', 'TUR': 'TRY', 'RUS': 'RUB', 'GEO': 'GEL', 'ARM': 'AMD', 'AZE': 'AZN',
  'IND': 'INR', 'CHN': 'CNY', 'JPN': 'JPY', 'KOR': 'KRW', 'VIE': 'VND', 'THA': 'THB',
  'MAS': 'MYR', 'SGP': 'SGD', 'INA': 'IDR', 'PHI': 'PHP', 'KAZ': 'KZT', 'UZB': 'UZS', 'KGZ': 'KGS',
  'UAE': 'AED', 'KSA': 'SAR', 'IRI': 'IRR', 'IRQ': 'IQD', 'ISR': 'ILS', 'Jordan': 'JOD', 'Lebanon': 'LBP',
  'BRA': 'BRL', 'ARG': 'ARS', 'COL': 'COP', 'CHI': 'CLP', 'PER': 'PEN', 'MEX': 'MXN',
  'URU': 'UYU', 'PAR': 'PYG', 'BOL': 'BOB', 'Bolivia': 'BOB', 'VEN': 'VES', 'CRC': 'CRC', 'CUB': 'CUP', 'DOM': 'DOP', 'GUA': 'GTQ',
  'EGY': 'EGP', 'RSA': 'ZAR', 'MAR': 'MAD', 'ALG': 'DZD', 'TUN': 'TND', 'NGR': 'NGN', 'KEN': 'KES', 'ZAM': 'ZMW', 'ZIM': 'USD', 'NAM': 'NAD', 'Botswana': 'BWP',
  'BAN': 'BDT', 'SRI': 'LKR', 'NEP': 'NPR', 'HKG': 'HKD', 'Mongolia': 'MNT'
};

const SYMBOL_CURRENCIES = [
  { regex: /\b(?:zł|zl|pln)\b/i, code: 'PLN' },
  { regex: /€|\b(?:eur|euro)\b/i, code: 'EUR' },
  { regex: /£|\b(?:gbp)\b/i, code: 'GBP' },
  { regex: /\b(?:chf)\b/i, code: 'CHF' },
  { regex: /\b(?:czk|kč|kc)\b/i, code: 'CZK' },
  { regex: /\b(?:huf|ft)\b/i, code: 'HUF' },
  { regex: /\b(?:ron|lei)\b/i, code: 'RON' },
  { regex: /\b(?:bgn|лв)\b/i, code: 'BGN' },
  { regex: /\b(?:rs\.?|inr|rupee|rupees)\b/i, code: 'INR' },
  { regex: /r\$|\b(?:brl|reais|real)\b/i, code: 'BRL' },
  { regex: /\b(?:usd|dollars?|dolar[yów]*)\b/i, code: 'USD' }
];

let cachedExchangeRates = null;
async function fetchDailyExchangeRates() {
  const ratesFile = path.join(__dirname, '..', 'data', 'exchange_rates.json');
  try {
    if (fs.existsSync(ratesFile)) {
      const j = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
      const today = new Date().toISOString().slice(0, 10);
      if (j && j.date === today && j.rates) {
        cachedExchangeRates = j.rates;
        return j.rates;
      }
    }
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { timeout: 8000 });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        cachedExchangeRates = data.rates;
        fs.writeFileSync(ratesFile, JSON.stringify({
          date: new Date().toISOString().slice(0, 10),
          base: 'USD',
          rates: data.rates
        }, null, 2), 'utf8');
        console.log('  💱 Updated daily exchange rates successfully');
        return data.rates;
      }
    }
  } catch (err) {
    console.warn('  ⚠️ Could not update exchange rates:', err.message);
  }
  if (!cachedExchangeRates && fs.existsSync(ratesFile)) {
    try {
      const j = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
      if (j && j.rates) cachedExchangeRates = j.rates;
    } catch(e) {}
  }
  return cachedExchangeRates || { USD: 1, PLN: 3.75, EUR: 0.86, GBP: 0.74 };
}

function cleanNumber(str) {
  if (!str) return 0;
  let s = str.trim().replace(/[,.]00\s*$/, '');
  return parseInt(s.replace(/[^\d]/g, ''), 10);
}

function parseTournamentPrize(text, country = '') {
  if (!text) return null;
  const str = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

  let rawVal = 0;
  let detectedCurrency = null;
  let isFirstPlace = false;

  const NUM_REGEX_STR = '\\d+(?:[ .]\\d{3})*(?:[.,]\\d{2})?';

  // 1. Check for specific first place prize patterns
  const firstPlacePatterns = [
    new RegExp(`(?:1\\s*[-.]?\\s*miejsc[ea]|i\\s*miejsc[ea]|1st\\s*(?:place|prize)|1er\\s*(?:premio|prix)|1\\s*nagrod[a-z]*|i\\s*nagrod[a-z]*|1\\s*preis|1\\s*premio|\\bwinner\\b)\\s*[:=-]?\\s*([€$£złA-Z]{1,4})?\\s*(${NUM_REGEX_STR})\\s*([€$£złA-Za-z]{1,6})?`, 'i'),
    new RegExp(`([€$£złA-Z]{1,4})?\\s*(${NUM_REGEX_STR})\\s*([€$£złA-Za-z]{1,6})?\\s*(?:za\\s*)?(?:1\\s*[-.]?\\s*miejsc[ea]|i\\s*miejsc[ea]|1st\\s*(?:place|prize)|1er\\s*(?:premio|prix)|dla\\s*zwyci[eę]zc[ay])`, 'i')
  ];

  for (const pat of firstPlacePatterns) {
    const m = str.match(pat);
    if (m) {
      const currPrefix = m[1] || '';
      const numPart = m[2];
      const currSuffix = m[3] || '';
      const parsed = cleanNumber(numPart);
      if (parsed >= 50 && parsed <= 50000000) {
        const testArea = `${currPrefix} ${currSuffix} ${m[0]}`;
        let foundCurr = null;
        for (const sc of SYMBOL_CURRENCIES) {
          if (sc.regex.test(testArea)) {
            foundCurr = sc.code;
            break;
          }
        }
        if (!foundCurr && parsed >= 2020 && parsed <= 2035) {
          continue;
        }
        rawVal = parsed;
        isFirstPlace = true;
        detectedCurrency = foundCurr;
        break;
      }
    }
  }

  // 2. Check for total prize fund / pool patterns
  if (!rawVal) {
    const poolPatterns = [
      new RegExp(`(?:pula\\s*nagr[oó]d|prize\\s*fund|total\\s*prize|pula|premios|bolsa\\s*de\\s*premios|preisfonds)\\s*[:=-]?\\s*([€$£złA-Z]{1,4}|rs\\.?)?\\s*(${NUM_REGEX_STR})\\s*([€$£złA-Za-z]{1,6})?`, 'i'),
      new RegExp(`(?:nagrod[ay]\\s*o\\s*warto[śs]ci|nagrod[ay]\\s*finansowe\\s*do)\\s*[:=-]?\\s*([€$£złA-Z]{1,4})?\\s*(${NUM_REGEX_STR})\\s*([€$£złA-Za-z]{1,6})?`, 'i')
    ];
    for (const pat of poolPatterns) {
      const m = str.match(pat);
      if (m) {
        const currPrefix = m[1] || '';
        const numPart = m[2];
        const currSuffix = m[3] || '';
        const parsed = cleanNumber(numPart);
        if (parsed >= 50 && parsed <= 50000000) {
          const testArea = `${currPrefix} ${currSuffix} ${m[0]}`;
          let foundCurr = null;
          for (const sc of SYMBOL_CURRENCIES) {
            if (sc.regex.test(testArea)) {
              foundCurr = sc.code;
              break;
            }
          }
          if (!foundCurr && parsed >= 2020 && parsed <= 2035) {
            continue;
          }
          rawVal = Math.round(parsed * 0.35);
          detectedCurrency = foundCurr;
          break;
        }
      }
    }
  }

  // 3. Special case: "Turniej o Tysiaka"
  if (!rawVal) {
    if (/turniej\s*o\s*tysiak[a-z]*/i.test(str)) {
      rawVal = 1000;
      detectedCurrency = 'PLN';
      isFirstPlace = true;
    }
  }

  if (!rawVal) return null;

  // 4. Currency resolution: if not explicitly detected, fall back to country national currency
  if (!detectedCurrency) {
    const cUpper = (country || '').toUpperCase().trim();
    detectedCurrency = COUNTRY_CURRENCIES[cUpper] || 'USD';
  }

  // 5. Currency conversion
  const rates = cachedExchangeRates || { USD: 1, PLN: 3.75, EUR: 0.86, GBP: 0.74 };
  const rateToUsd = rates[detectedCurrency] || 1.0;
  const valueInUsd = Math.round(rawVal / rateToUsd);

  const isPoland = (country === 'POL' || country === 'Poland');
  let finalPrize = 0;
  let finalCurrency = 'USD';

  if (isPoland) {
    if (detectedCurrency === 'PLN') {
      finalPrize = rawVal;
    } else {
      const plnRate = rates['PLN'] || 3.75;
      finalPrize = Math.round(valueInUsd * plnRate);
    }
    finalCurrency = 'PLN';
  } else {
    finalPrize = valueInUsd;
    finalCurrency = 'USD';
  }

  if (finalPrize < 10) return null;

  return {
    firstPrize: finalPrize,
    prizeCurrency: finalCurrency,
    originalPrize: rawVal,
    originalCurrency: detectedCurrency,
    isFirstPlace
  };
}

const PZSZACH_RANKINGS = {
  'BK': 1000, 'BRAK': 1000, '': 1000,
  'V': 1200,
  'IV': 1400,
  'III': 1600,
  'II': 1800, 'II+': 1800,
  'I': 2000, 'I+': 2000, 'I++': 2000,
  'K': 2200, 'K+': 2200, 'K++': 2200,
  'M': 2400, 'FM': 2300, 'IM': 2400, 'GM': 2500,
  'WFM': 2100, 'WIM': 2250, 'WGM': 2350
};

function normalizePzszachCat(catStr) {
  if (!catStr) return 'BK';
  const c = catStr.trim().toUpperCase();
  if (c === 'V') return 'V';
  if (c === 'IV') return 'IV';
  if (c === 'III') return 'III';
  if (c.startsWith('II')) return 'II';
  if (c.startsWith('I')) return 'I';
  if (c.startsWith('K')) return 'K';
  if (['M', 'FM', 'IM', 'GM', 'WFM', 'WIM', 'WGM'].includes(c)) return c;
  return 'BK';
}

function computePzszachNorms({ timeControl, rounds, durationDays, players, playerCategories = [], text = '' }) {
  const norms = new Set();
  const tc = (timeControl || 'Classical').toLowerCase();
  const r = rounds || null;
  const n = players || playerCategories.length || 0;
  const dur = durationDays || 1;

  // STRICT RULE 1: Blitz / Bullet never grant any PZSzach norms
  if (tc === 'blitz' || tc === 'bullet') {
    return [];
  }

  // Check explicit mentions in tournament title / text
  const t = text.toLowerCase();

  // Exclude trainings, arbiter courses, instructor courses, seminars
  if (/kurs instruktor|kurs s[eę]dziow|seminarium|szkolenie/i.test(t)) {
    return [];
  }

  // Rapid/szybkie tournaments: only V, IV, and in special cases III (min 30 min)
  if (tc === 'rapid') {
    if (t.includes('v kat') || t.includes('iv kat') || t.includes('v-iv') || t.includes('v i iv') || t.includes('iv i v') || /(?:na|o|do)\s*iv\s*kat/i.test(t)) {
      norms.add('V'); norms.add('IV');
    }
    if (t.includes('iii kat') || t.includes('do iii') || t.includes('v-iii') || /(?:na|o|do)\s*iii\s*kat/i.test(t)) {
      norms.add('V'); norms.add('IV'); norms.add('III');
    }
    if (!norms.size && ((r && r >= 5) || dur >= 1) && n >= 6) {
      norms.add('V'); norms.add('IV');
    }
    // NEVER allow II, I, k, m in rapid!
    const orderRapid = ['V', 'IV', 'III'];
    return orderRapid.filter(x => norms.has(x));
  }

  // STRICT RULE 2: Classical chess (szachy klasyczne)
  const isMultiDayOrLong = dur >= 2 || (r && r >= 7);

  // Check explicit category declarations from organizers in titles
  if (/norm[ay]\s+na\s+k\b/i.test(t) || /na\s+i\s+i\s+k\b/i.test(t) || /kandydat/i.test(t) || /\bk\+\+/i.test(t) || /\bk\+/i.test(t) || /\bkm\b/i.test(t) || /tytu[łl]\s*km/i.test(t) || /na\s*tytu[łl]\s*km/i.test(t) || /o\s*tytu[łl]\s*km/i.test(t) || /normy\s+centralne/i.test(t) || /norm[aę]\s+k\b/i.test(t) || /norm[aę]\s+na\s+k/i.test(t)) {
    norms.add('k'); norms.add('I'); norms.add('II'); norms.add('III'); norms.add('IV'); norms.add('V');
  }
  if (/norm[ay]\s+na\s+m\b/i.test(t) || (/\bmistrz\b/i.test(t) && !t.includes('mistrzostwa')) || /mistrz\s+krajowy/i.test(t) || /tytu[łl]\s*m\b/i.test(t) || /norm[aę]\s+na\s+m/i.test(t)) {
    norms.add('m'); norms.add('k'); norms.add('I'); norms.add('II'); norms.add('III'); norms.add('IV'); norms.add('V');
  }
  if (/(?:na|o|do|\b)\s*i\s*(?:lub|i|\/)?\s*(?:kategori|kat\b)/i.test(t) || /norm[ay]\s+na\s+i\b/i.test(t) || /mała norma na i/i.test(t) || /o\s+iii\s+ii\s+i/i.test(t) || /norm[aę]\s+na\s+i\b/i.test(t)) {
    norms.add('I'); norms.add('II'); norms.add('III'); norms.add('IV'); norms.add('V');
  }
  if (/(?:na|o|do|\b)\s*ii\s*(?:lub|i|\/)?\s*(?:kategori|kat\b)/i.test(t) || /norm[ay]\s+na\s+ii\b/i.test(t) || /o\s+iii\s+ii/i.test(t) || /ii\s+lub\s+i/i.test(t) || /norm[aę]\s+na\s+ii\b/i.test(t)) {
    norms.add('II'); norms.add('III'); norms.add('IV'); norms.add('V');
  }
  if (/(?:na|o|do|\b)\s*iii\s*(?:lub|i|\/)?\s*(?:kategori|kat\b)/i.test(t) || /norm[ay]\s+na\s+iii\b/i.test(t) || /do\s+iii\b/i.test(t) || /norm[aę]\s+na\s+iii\b/i.test(t)) {
    norms.add('III'); norms.add('IV'); norms.add('V');
  }
  if (/(?:na|o|do|\b)\s*iv\s*(?:lub|i|\/)?\s*(?:kategori|kat\b)/i.test(t) || /norm[ay]\s+na\s+iv\b/i.test(t) || /v-iv/i.test(t) || /iv i v/i.test(t) || /v i iv/i.test(t) || /norm[aę]\s+na\s+iv\b/i.test(t)) {
    norms.add('IV'); norms.add('V');
  }
  if (/(?:na|o|do|\b)\s*v\s*(?:kategori|kat\b)/i.test(t) || /norm[ay]\s+na\s+v\b/i.test(t) || /norm[aę]\s+na\s+v\b/i.test(t)) {
    norms.add('V');
  }

  // If we have actual registered players list from ChessArbiter:
  if (playerCategories.length >= 4) {
    const cats = playerCategories.map(normalizePzszachCat);
    const hasIIorHigher = cats.some(c => ['II', 'I', 'K', 'M', 'FM', 'IM', 'GM'].includes(c));
    const hasIorHigher = cats.some(c => ['I', 'K', 'M', 'FM', 'IM', 'GM'].includes(c));
    const hasKorHigher = cats.some(c => ['K', 'M', 'FM', 'IM', 'GM'].includes(c));
    const titledCount = cats.filter(c => ['K', 'M', 'FM', 'IM', 'GM', 'WFM', 'WIM', 'WGM'].includes(c)).length;

    // V i IV kat: minimum 5 rund
    if ((r === null || r >= 5) && n >= 6) {
      norms.add('V');
      norms.add('IV');
    }

    // III kat: minimum 5-6 rund, obecność zawodników z min. IV/III/II kat.
    const ivPlusCount = cats.filter(c => ['IV', 'III', 'II', 'I', 'K', 'M', 'FM', 'IM', 'GM'].includes(c)).length;
    if ((r === null || r >= 5) && n >= 6 && ivPlusCount >= 3) {
      norms.add('III');
    }

    // II kat: WYŁĄCZNIE szachy klasyczne wielodniowe / min. 7 rund (60 min na gracza)
    if (isMultiDayOrLong && (r === null || r >= 7) && n >= 6 && hasIIorHigher) {
      norms.add('II');
    }

    // I kat: WYŁĄCZNIE szachy klasyczne wielodniowe (min. 7-9 rund) z min. I kat
    if (isMultiDayOrLong && (r === null || r >= 7) && n >= 6 && hasIorHigher) {
      norms.add('I');
    }

    // k (kandydat): WYŁĄCZNIE szachy klasyczne wielodniowe, min. 9 rund, obecność kandydatów/mistrzów
    if (dur >= 3 && (r === null || r >= 9) && n >= 6 && (hasKorHigher || titledCount >= 1)) {
      norms.add('k');
    }

    // m (mistrz krajowy): WYŁĄCZNIE szachy klasyczne wielodniowe, min. 9 rund, min. 3 graczy z tytułem mistrzowskim
    if (dur >= 4 && (r === null || r >= 9) && n >= 8 && titledCount >= 3) {
      norms.add('m');
    }
  } else {
    // Fallback when playerCategories have not been fetched yet:
    // Any official classical tournament in Poland allows gaining at least V and IV category
    if (tc === 'classical') {
      norms.add('V');
      norms.add('IV');
      if (isMultiDayOrLong || (r && r >= 5)) {
        norms.add('III');
      }
      if (isMultiDayOrLong && (r === null || r >= 7)) {
        norms.add('II');
      }
    }
  }

  const order = ['V', 'IV', 'III', 'II', 'I', 'k', 'm'];
  return order.filter(x => norms.has(x));
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
      headers: { 'User-Agent': BOT_USER_AGENT },
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

        const isFide = detectFide(fullTd) || detectFide(name) || (cells.eq(2) && detectFide(cells.eq(2).text()));
        const col2Text = cells.eq(2) ? cells.eq(2).text() : '';
        const timeControl = detectTimeControl(name, `${fullTd} ${col2Text}`);
        const rounds = detectRounds(name);
        const achievableNorms = computePzszachNorms({ timeControl, rounds, durationDays, text: `${name} ${fullTd} ${col2Text}` });
        const prizeInfo = parseTournamentPrize(`${name} ${fullTd} ${col2Text}`, 'POL');

        tournaments.push({
          id: `ca-${idCounter++}`,
          name,
          city,
          country: 'POL',
          continent: 'Europe',
          flag: '🇵🇱',
          startDate: dates.start,
          endDate: dates.end,
          durationDays,
          timeControl,
          rounds,
          firstPrize: prizeInfo ? prizeInfo.firstPrize : 0,
          prizeCurrency: prizeInfo ? prizeInfo.prizeCurrency : 'PLN',
          isFide,
          achievableNorms,
          hasNorms: achievableNorms.length > 0,
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
    await page.setUserAgent(BOT_USER_AGENT);
    
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
      const prizeInfo = parseTournamentPrize(name, fedCode);
      
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
        firstPrize: prizeInfo ? prizeInfo.firstPrize : 0,
        prizeCurrency: prizeInfo ? prizeInfo.prizeCurrency : (fedCode === 'POL' ? 'PLN' : 'USD'),
        isFide: true,
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

  const isFide = detectFide(name) || detectFide(raw.text);
  const achievableNorms = countryInfo.code === 'POL' ? computePzszachNorms({
    timeControl: tc,
    rounds,
    durationDays,
    players,
    text: `${name} ${raw.text}`
  }) : [];
  const prizeInfo = parseTournamentPrize(`${name} ${raw.text}`, countryInfo.code);

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
    firstPrize: prizeInfo ? prizeInfo.firstPrize : 0,
    prizeCurrency: prizeInfo ? prizeInfo.prizeCurrency : (countryInfo.code === 'POL' ? 'PLN' : 'USD'),
    isFide,
    achievableNorms,
    hasNorms: achievableNorms.length > 0,
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
    await page.setUserAgent(BOT_USER_AGENT);

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
  // 1. Re-use existing cached details
  let reused = 0;
  tournaments.forEach(t => {
    const key = t.source || `${t.name}_${t.startDate}`;
    const old = cache.get(key);
    if (old) {
      if (old.lastChecked) t.lastChecked = old.lastChecked;
      if (old.rounds !== undefined && old.rounds !== null && !t.rounds) t.rounds = old.rounds;
      if (old.players !== undefined && old.players !== null && !t.players) t.players = old.players;
      if (old.gms !== undefined) t.gms = old.gms;
      if (old.ims !== undefined) t.ims = old.ims;
      if (old.fms !== undefined) t.fms = old.fms;
      if (old.firstPrize !== undefined) t.firstPrize = old.firstPrize;
      if (old.prizeCurrency !== undefined) t.prizeCurrency = old.prizeCurrency;
      if (old.isOpen !== undefined) t.isOpen = old.isOpen;
      if (old.isFide !== undefined && !t.isFide) t.isFide = old.isFide;
      if (old.achievableNorms && (!t.achievableNorms || !t.achievableNorms.length)) {
        t.achievableNorms = old.achievableNorms;
        t.hasNorms = true;
      }
      reused++;
    }
  });
  console.log(`  ⚡ Reused details from cache for ${reused} tournaments`);

  // 2. Build prioritized queue:
  // Priority 1: New / never checked -> soonest future start date first (>= today)
  // Priority 2: Already checked -> sorted by lastChecked ascending (od najdłużej nieaktualizowanego)
  const todayStr = new Date().toISOString().slice(0, 10);
  const neverChecked = tournaments.filter(t => !t.lastChecked);
  neverChecked.sort((a, b) => {
    const aFut = (a.startDate || '') >= todayStr ? 1 : 0;
    const bFut = (b.startDate || '') >= todayStr ? 1 : 0;
    if (aFut !== bFut) return bFut - aFut;
    return (a.startDate || '').localeCompare(b.startDate || '');
  });

  const alreadyChecked = tournaments.filter(t => !!t.lastChecked);
  alreadyChecked.sort((a, b) => (a.lastChecked || '').localeCompare(b.lastChecked || ''));

  const queue = [...neverChecked, ...alreadyChecked];

  // Batch of 50 tournaments per 4h transza
  const batchSize = 50;
  const batch = queue.slice(0, batchSize);
  console.log(`\n🔍 Transza: processing ${batch.length} tournaments (New: ${Math.min(neverChecked.length, batchSize)}, Updating existing: ${Math.max(0, batch.length - neverChecked.length)})...`);

  for (let i = 0; i < batch.length; i++) {
    const t = batch[i];
    try {
      if (t.scrapedFrom === 'ChessArbiter' && t.source && t.source.includes('turnieje/')) {
        let turnPath = null;
        const turnParamMatch = t.source.match(/turn=([^&]+)/);
        if (turnParamMatch) {
          turnPath = turnParamMatch[1];
        } else {
          const pathMatch = t.source.match(/turnieje\/(\d{4}\/[^\/]+)/);
          if (pathMatch) turnPath = pathMatch[1];
        }

        if (turnPath) {
          const baseUrl = `http://www.chessarbiter.com/turnieje/${turnPath}/`;

          let detailsFound = false;

          // 1. Try modern ChessArbiter Pro: capro_tournament.js
          try {
            const caproRes = await fetch(`${baseUrl}capro_tournament.js`, {
              headers: { 'User-Agent': BOT_USER_AGENT },
              timeout: 10000
            });

            if (caproRes.status === 429) {
              console.warn('  ⚠️ ChessArbiter 429 hit, pausing...');
              await sleep(4000);
              continue;
            }

            if (caproRes.ok) {
              const js = await caproRes.text();
              const startM = js.match(/Start date:.*?<b>(.*?)<\/b>/s);
              const endM = js.match(/End date:.*?<b>(.*?)<\/b>/s);
              const roundsM = js.match(/No\. of rounds:.*?<b>(.*?)<\/b>/s);
              const rateM = js.match(/Rate of play:.*?<b>(.*?)<\/b>/s);
              const placeM = js.match(/Place:.*?<b>(.*?)<\/b>/s);

              if (startM && startM[1]) t.startDate = startM[1].trim();
              if (endM && endM[1]) t.endDate = endM[1].trim();
              if (t.startDate && t.endDate) {
                const ms = new Date(t.endDate) - new Date(t.startDate);
                t.durationDays = isNaN(ms) || ms < 0 ? 1 : Math.max(1, Math.round(ms / 86400000) + 1);
              }

              if (roundsM && roundsM[1]) {
                const r = parseInt(roundsM[1], 10);
                if (r >= 1 && r <= 30) t.rounds = r;
              }

              if (rateM && rateM[1]) {
                const tc = detectTimeControl(rateM[1], rateM[1]);
                if (tc && tc !== 'Unknown') t.timeControl = tc;
              }

              if (placeM && placeM[1] && (!t.city || t.city === 'Polska')) {
                t.city = placeM[1].trim();
              }

              if (!t.isFide && detectFide(js)) t.isFide = true;

              const catsM = js.match(/var A12 = \[([\s\S]*?)\];/);
              const namesM = js.match(/var A11 = \[([\s\S]*?)\];/);

              let playerCategories = [];
              if (catsM) {
                playerCategories = catsM[1].split(',')
                  .map(s => s.trim().replace(/^["']|["']$/g, ''))
                  .filter(Boolean);
              }

              let count = 0;
              if (namesM) {
                count = namesM[1].split(',')
                  .map(s => s.trim().replace(/^["']|["']$/g, ''))
                  .filter(Boolean).length;
              }
              if (count > 0) t.players = count;

              let gms = 0, ims = 0, fms = 0;
              playerCategories.forEach(cat => {
                const c = cat.toUpperCase();
                if (c === 'GM' || c === 'WGM') gms++;
                else if (c === 'IM' || c === 'WIM') ims++;
                else if (c === 'FM' || c === 'WFM') fms++;
              });
              t.gms = gms;
              t.ims = ims;
              t.fms = fms;

              const calculatedNorms = computePzszachNorms({
                timeControl: t.timeControl,
                rounds: t.rounds,
                durationDays: t.durationDays,
                players: t.players || count,
                playerCategories,
                text: `${t.name || ''} ${js || ''}`
              });
              let allowedOrder = ['V', 'IV', 'III', 'II', 'I', 'k', 'm'];
              const tc = (t.timeControl || '').toLowerCase();
              if (tc === 'blitz' || tc === 'bullet') {
                allowedOrder = [];
              } else if (tc === 'rapid') {
                allowedOrder = ['V', 'IV', 'III'];
              }
              const merged = new Set([...(t.achievableNorms || []), ...calculatedNorms]);
              t.achievableNorms = allowedOrder.filter(x => merged.has(x));
              t.hasNorms = t.achievableNorms.length > 0;

              const prizeInfo = parseTournamentPrize(`${t.name || ''} ${js || ''}`, t.country || 'POL');
              if (prizeInfo) {
                t.firstPrize = prizeInfo.firstPrize;
                t.prizeCurrency = prizeInfo.prizeCurrency;
              }

              detailsFound = true;
            }
          } catch (e) {
            // fallback to HTML parsing
          }

          if (!detailsFound) {
            // 2. Legacy ChessArbiter fallback (fetch homepage + list_of_players.html)
            const res = await fetch(baseUrl, {
              headers: { 'User-Agent': BOT_USER_AGENT },
              timeout: 10000
            });

            if (res.status === 429) {
              console.warn('  ⚠️ ChessArbiter 429 hit, pausing...');
              await sleep(4000);
              continue;
            }

            if (res.ok) {
              const html = await res.text();
              const $ = cheerio.load(html);

              // 1. Extract dates from Main informations
              const startM = html.match(/Tr\("Start date:",""\);<\/script><\/td><td[^>]*>([\d\-]+)<\/td>/i);
              const endM = html.match(/Tr\("End date:",""\);<\/script><\/td><td[^>]*>([\d\-]+)<\/td>/i);
              if (startM && startM[1]) t.startDate = startM[1].trim();
              if (endM && endM[1]) t.endDate = endM[1].trim();
              if (t.startDate && t.endDate) {
                const ms = new Date(t.endDate) - new Date(t.startDate);
                t.durationDays = isNaN(ms) || ms < 0 ? 1 : Math.max(1, Math.round(ms / 86400000) + 1);
              }

              // 2. Extract rounds from Main informations or links
              const roundsM = html.match(/Tr\("No\. of rounds:",""\);<\/script><\/td><td[^>]*>(\d+)<\/td>/i);
              if (roundsM && roundsM[1]) {
                const r = parseInt(roundsM[1], 10);
                if (r >= 1 && r <= 30) t.rounds = r;
              }
              if (!t.rounds) {
                const roundMatches = html.matchAll(/(?:final_standings&|pairing&)(\d+)\.html/gi);
                for (const m of roundMatches) {
                  const r = parseInt(m[1], 10);
                  if (r >= 1 && r <= 30 && r > (t.rounds || 0)) t.rounds = r;
                }
              }
              if (!t.rounds) {
                const tm = html.match(/(\d+)\s*[- ]*rund/i);
                if (tm) t.rounds = parseInt(tm[1], 10);
              }

              // 3. Extract rate of play
              const rateM = html.match(/Tr\("Rate of play:",""\);<\/script><\/td><td[^>]*>(.*?)<\/td>/i);
              if (rateM && rateM[1]) {
                const tc = detectTimeControl(rateM[1], rateM[1]);
                if (tc && tc !== 'Unknown') t.timeControl = tc;
              }

              // 4. Extract place
              const placeM = html.match(/Tr\("Place:",""\);<\/script><\/td><td[^>]*>(.*?)<\/td>/i);
              if (placeM && placeM[1] && (!t.city || t.city === 'Polska')) {
                t.city = placeM[1].trim();
              }

              // 5. Extract players count
              const playersM = html.match(/Tr\("No\. of players:",""\);<\/script><\/td><td[^>]*>(\d+)<\/td>/i);
              if (playersM && playersM[1]) {
                const pCount = parseInt(playersM[1], 10);
                if (pCount > 0) t.players = pCount;
              }

              // 6. Extract categories from Titles' statistic table
              const htmlPlayerCategories = [];
              $('table.fr').each((i, tbl) => {
                if ($(tbl).find('table').length > 0) return; // avoid outer wrapper
                if ($(tbl).find('th.pan').text().includes("Titles' statistic")) {
                  let currentHeaders = [];
                  $(tbl).find('tr').each((ri, tr) => {
                    const rowClass = $(tr).attr('class');
                    if (rowClass === 'pan') {
                      const ths = $(tr).find('td');
                      currentHeaders = [];
                      ths.each((ci, td) => currentHeaders.push($(td).text().trim()));
                    } else if ($(tr).find('td.pan').length > 0 && currentHeaders.length > 0) {
                      const tds = $(tr).find('td');
                      tds.each((ci, td) => {
                        const count = parseInt($(td).text().trim(), 10);
                        const title = currentHeaders[ci];
                        if (!isNaN(count) && count > 0 && title) {
                          for (let k = 0; k < count; k++) htmlPlayerCategories.push(title);
                        }
                      });
                    }
                  });
                }
              });

              if (!t.isFide && detectFide(html)) t.isFide = true;

              const homeNorms = computePzszachNorms({
                timeControl: t.timeControl,
                rounds: t.rounds,
                durationDays: t.durationDays,
                players: t.players || htmlPlayerCategories.length,
                playerCategories: htmlPlayerCategories,
                text: html
              });
              if (homeNorms.length > 0) {
                const currentSet = new Set(t.achievableNorms || []);
                homeNorms.forEach(n => currentSet.add(n));
                t.achievableNorms = ['V', 'IV', 'III', 'II', 'I', 'k', 'm'].filter(x => currentSet.has(x));
                t.hasNorms = t.achievableNorms.length > 0;
              }

              const prizeInfo = parseTournamentPrize(`${t.name || ''} ${html || ''}`, t.country || 'POL');
              if (prizeInfo) {
                t.firstPrize = prizeInfo.firstPrize;
                t.prizeCurrency = prizeInfo.prizeCurrency;
              }
            }

            await sleep(300);

            const pRes = await fetch(`${baseUrl}list_of_players.html`, {
              headers: { 'User-Agent': BOT_USER_AGENT },
              timeout: 10000
            });

            if (pRes.ok) {
              const pHtml = await pRes.text();
              const p$ = cheerio.load(pHtml);
              let count = 0;
              let gms = 0, ims = 0, fms = 0;
              const playerCategories = [];

              p$('table tr').each((idx, tr) => {
                const tds = p$(tr).find('td');
                const firstTd = tds.eq(0).text().trim();
                if (/^\d+$/.test(firstTd)) {
                  count++;
                  const title = tds.eq(3).text().trim().toUpperCase();
                  if (title === 'GM' || title === 'WGM') gms++;
                  else if (title === 'IM' || title === 'WIM') ims++;
                  else if (title === 'FM' || title === 'WFM') fms++;

                  if (title) playerCategories.push(title);
                }
              });

              if (count > 0) t.players = count;
              t.gms = gms;
              t.ims = ims;
              t.fms = fms;

              const calculatedNorms = computePzszachNorms({
                timeControl: t.timeControl,
                rounds: t.rounds,
                durationDays: t.durationDays,
                players: count,
                playerCategories,
                text: `${t.name || ''} ${pHtml || ''}`
              });
              let allowedOrder = ['V', 'IV', 'III', 'II', 'I', 'k', 'm'];
              const tc = (t.timeControl || '').toLowerCase();
              if (tc === 'blitz' || tc === 'bullet') {
                allowedOrder = [];
              } else if (tc === 'rapid') {
                allowedOrder = ['V', 'IV', 'III'];
              }
              const merged = new Set([...(t.achievableNorms || []), ...calculatedNorms]);
              t.achievableNorms = allowedOrder.filter(x => merged.has(x));
              t.hasNorms = t.achievableNorms.length > 0;
            }
          }
        }
      } else if (t.scrapedFrom === 'Chess-Results' && t.source && t.source.includes('.aspx')) {
        const fetchUrl = t.source.replace('.aspx', '.aspx?art=0&zeilen=99999');
        const res = await fetch(fetchUrl, {
          headers: { 'User-Agent': BOT_USER_AGENT },
          timeout: 10000
        });

        if (res.status === 429) {
          console.warn('  ⚠️ Chess-Results 429 hit, pausing...');
          await sleep(4000);
          continue;
        }

        if (res.ok) {
          const html = await res.text();
          t.gms = (html.match(/\bW?GM\b/g) || []).length;
          t.ims = (html.match(/\bW?IM\b/g) || []).length;
          t.fms = (html.match(/\bW?FM\b/g) || []).length;

          const prizeInfo = parseTournamentPrize(`${t.name || ''} ${html || ''}`, t.country);
          if (prizeInfo) {
            t.firstPrize = prizeInfo.firstPrize;
            t.prizeCurrency = prizeInfo.prizeCurrency;
          }
          t.isOpen = !(html.toLowerCase().includes('closed') || (t.name && t.name.toLowerCase().includes('zamknięt')));
        }
      }

      t.lastChecked = new Date().toISOString();
    } catch (err) {
      // Ignore individual timeouts
    }

    await sleep(300);
    process.stdout.write(`\r  Progress: ${i + 1} / ${batch.length}`);
  }

  console.log('\n  ✅ Transza detail scraping complete!');
  return tournaments;
}

async function main() {
  console.log('\n🏁 chess:tour scraper starting...\n');

  // Fetch / update daily world currency rates
  await fetchDailyExchangeRates();

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
    .filter(t => t.endDate >= cutoffStr && !isFischerRandom(t.name))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // DEEP SCRAPE with cache and safe batching
  upcoming = await fetchTournamentDetails(upcoming, cache);

  // STRICT PZSZACH SANITIZATION:
  // Blitz/Bullet can NEVER have norms. Rapid can NEVER have II, I, k, or m norms.
  upcoming.forEach(t => {
    const tc = (t.timeControl || '').toLowerCase();
    if (tc === 'blitz' || tc === 'bullet') {
      t.achievableNorms = [];
      t.hasNorms = false;
    } else if (tc === 'rapid') {
      if (t.achievableNorms && t.achievableNorms.length > 0) {
        t.achievableNorms = t.achievableNorms.filter(n => ['V', 'IV', 'III'].includes(n));
        t.hasNorms = t.achievableNorms.length > 0;
      }
    }
  });

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

if (require.main === module) {
  main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
}

module.exports = {
  parseTournamentPrize,
  fetchDailyExchangeRates,
  computePzszachNorms
};
