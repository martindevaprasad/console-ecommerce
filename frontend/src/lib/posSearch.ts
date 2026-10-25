/**
 * POS menu search: ranked, typo-tolerant matching built for cashiers.
 *
 * Query syntax (combinable):
 *   chicken biryani   every word must match (name, description, SKU, category)
 *   cc / tnvm         initials of the item name ("Chicken Chettinad")
 *   chkn              letters in order ("chicken"), as a last resort
 *   <100  >200  100-200   price filters
 *   3*idli  3x idli   quantity: Enter adds 3
 *   8901234567890     exact barcode / SKU (scanner) ranks first
 */

export interface IndexedProduct {
  p: any;
  name: string;
  words: string[];
  initials: string;
  text: string; // description + category + sku, lower-cased
  sku: string;
  barcode: string;
  order: number;
}

export interface ParsedQuery {
  terms: string[];
  min?: number;
  max?: number;
  qty: number;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function buildIndex(products: any[]): IndexedProduct[] {
  return products.map((p, order) => {
    const name = norm(p.name || '');
    const words = name.replace(/[()]/g, ' ').split(/[\s\-/&,]+/).filter(Boolean);
    return {
      p,
      name,
      words,
      initials: words.map((w) => w[0]).join(''),
      text: norm([p.description, p.category?.name, p.sku].filter(Boolean).join(' ')),
      sku: norm(p.sku || ''),
      barcode: p.barcode || '',
      order,
    };
  });
}

export function parseQuery(raw: string): ParsedQuery {
  let q = norm(raw).trim();
  let qty = 1;
  const qm = q.match(/^(\d{1,3})\s*[*x]\s*(.*)$/);
  if (qm && qm[2]) { qty = Math.max(1, parseInt(qm[1], 10)); q = qm[2]; }

  const out: ParsedQuery = { terms: [], qty };
  for (const tok of q.split(/\s+/).filter(Boolean)) {
    let m: RegExpMatchArray | null;
    if ((m = tok.match(/^<=?(\d+(?:\.\d+)?)$/))) out.max = parseFloat(m[1]);
    else if ((m = tok.match(/^>=?(\d+(?:\.\d+)?)$/))) out.min = parseFloat(m[1]);
    else if ((m = tok.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/))) { out.min = parseFloat(m[1]); out.max = parseFloat(m[2]); }
    else out.terms.push(tok);
  }
  return out;
}

/** Letters of `needle` appear in order in `hay` (e.g. "chkn" in "chicken"). */
const subsequence = (needle: string, hay: string) => {
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j++) if (hay[j] === needle[i]) i++;
  return i === needle.length;
};

/** Score one term against one item; 0 = no match. */
function termScore(t: string, it: IndexedProduct): number {
  if (it.barcode && it.barcode === t) return 1000;
  if (it.sku && it.sku === t) return 900;
  if (it.name === t) return 500;
  if (it.name.startsWith(t)) return 300;
  if (it.words.some((w) => w.startsWith(t))) return 200;
  if (t.length >= 2 && it.initials.startsWith(t)) return 180;
  if (it.name.includes(t)) return 120;
  if (it.text.includes(t)) return 60;
  if (t.length >= 3 && subsequence(t, it.name)) return FUZZY;
  return 0;
}
const FUZZY = 25;

export function searchMenu(index: IndexedProduct[], q: ParsedQuery): IndexedProduct[] {
  const scored: { it: IndexedProduct; s: number; fuzzy: boolean }[] = [];
  for (const it of index) {
    const price = it.p.price ?? 0;
    if (q.min !== undefined && price < q.min) continue;
    if (q.max !== undefined && price > q.max) continue;
    let s = 0;
    let ok = true;
    let fuzzy = false;
    for (const t of q.terms) {
      const ts = termScore(t, it);
      if (!ts) { ok = false; break; }
      if (ts === FUZZY) fuzzy = true;
      s += ts;
    }
    if (ok) scored.push({ it, s, fuzzy });
  }
  // Loose letter-order matches only count when nothing matched properly
  const result = scored.some((x) => !x.fuzzy) ? scored.filter((x) => !x.fuzzy) : scored;
  if (q.terms.length) result.sort((a, b) => b.s - a.s || a.it.order - b.it.order);
  return result.map((x) => x.it);
}

/** Splits `name` around the first case-insensitive occurrence of any term, for highlighting. */
export function highlightParts(name: string, terms: string[]): [string, string, string] | null {
  const lower = norm(name);
  for (const t of terms) {
    const i = t.length > 1 ? lower.indexOf(t) : -1;
    if (i >= 0) return [name.slice(0, i), name.slice(i, i + t.length), name.slice(i + t.length)];
  }
  return null;
}
