const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const REST_BASE = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

export const PERIODS = [
  { label: "Día", days: 1 },
  { label: "Semana", days: 7 },
  { label: "Quincena", days: 15 },
  { label: "Mes", days: 30 },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function supabaseSelect(table, query) {
  const url = `${REST_BASE}/${table}?${query}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Error al consultar ${table}: ${res.status}`);
  return res.json();
}

async function supabaseInsert(table, rows) {
  const url = `${REST_BASE}/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Error al insertar en ${table}: ${res.status}`);
  return res.json();
}

async function findOrCreate(entity, name) {
  const cleanName = String(name).trim();
  const table = entity === "product" ? "ph_products" : "ph_stores";
  const existing = await supabaseSelect(
    table,
    `select=id,name&name=eq.${encodeURIComponent(cleanName)}&limit=1`,
  );
  if (existing.length > 0) return existing[0];
  const created = await supabaseInsert(table, { name: cleanName });
  return created[0];
}

export async function saveTodayPrice({ productName, storeName, priceUsd, priceVes }) {
  const product = await findOrCreate("product", productName);
  const store = await findOrCreate("store", storeName);
  const today = todayStr();

  const existing = await supabaseSelect(
    "ph_prices",
    `select=id&product_id=eq.${product.id}&store_id=eq.${store.id}&recorded_on=eq.${today}&limit=1`,
  );

  if (existing.length > 0) {
    const res = await fetch(
      `${REST_BASE}/ph_prices?id=eq.${existing[0].id}`,
      {
        method: "PATCH",
        headers: { ...HEADERS, Prefer: "return=representation" },
        body: JSON.stringify({ price_usd: priceUsd, price_ves: priceVes }),
      },
    );
    if (!res.ok) throw new Error("Error al actualizar el precio.");
    return res.json();
  }

  return supabaseInsert("ph_prices", {
    product_id: product.id,
    store_id: store.id,
    price_usd: priceUsd,
    price_ves: priceVes,
    recorded_on: today,
  });
}

export async function fetchAllPriceHistory() {
  const [products, stores, prices] = await Promise.all([
    supabaseSelect("ph_products", "select=id,name&order=name.asc"),
    supabaseSelect("ph_stores", "select=id,name&order=name.asc"),
    supabaseSelect("ph_prices", "select=id,product_id,store_id,price_usd,price_ves,recorded_on&order=recorded_on.desc"),
  ]);
  return { products, stores, prices };
}

/**
 * Computes variation = (today_price / past_price - 1) * 100
 * Returns null if not enough history for the given period.
 */
export function computeVariation(prices, productId, storeId, days) {
  const relevant = prices
    .filter((p) => p.product_id === productId && p.store_id === storeId)
    .sort((a, b) => b.recorded_on.localeCompare(a.recorded_on));

  if (relevant.length === 0) return null;

  const today = relevant[0];
  const cutoff = dateNDaysAgo(days);
  const past = relevant.find((p) => p.recorded_on <= cutoff);

  if (!past || past.recorded_on === today.recorded_on) return null;

  const varUsd = (Number(today.price_usd) / Number(past.price_usd) - 1) * 100;
  const varVes = (Number(today.price_ves) / Number(past.price_ves) - 1) * 100;

  return {
    todayUsd: Number(today.price_usd),
    todayVes: Number(today.price_ves),
    pastUsd: Number(past.price_usd),
    pastVes: Number(past.price_ves),
    pastDate: past.recorded_on,
    varUsd,
    varVes,
  };
}

/**
 * Computes the total-list variation: sum of all product prices today
 * vs sum of all product prices N days ago.
 * Uses the best available store per product (most recent entry).
 */
export function computeTotalVariation(prices, products, stores, days) {
  const cutoff = dateNDaysAgo(days);
  let sumTodayUsd = 0;
  let sumTodayVes = 0;
  let sumPastUsd = 0;
  let sumPastVes = 0;
  let hasToday = false;
  let hasPast = false;

  for (const product of products) {
    const relevant = prices
      .filter((p) => p.product_id === product.id)
      .sort((a, b) => b.recorded_on.localeCompare(a.recorded_on));

    if (relevant.length === 0) continue;

    const today = relevant[0];
    const past = relevant.find((p) => p.recorded_on <= cutoff);

    if (today && today.recorded_on > cutoff) {
      sumTodayUsd += Number(today.price_usd);
      sumTodayVes += Number(today.price_ves);
      hasToday = true;
    }

    if (past && past.recorded_on !== today.recorded_on) {
      sumPastUsd += Number(past.price_usd);
      sumPastVes += Number(past.price_ves);
      hasPast = true;
    }
  }

  if (!hasToday || !hasPast) return null;

  return {
    varUsd: (sumTodayUsd / sumPastUsd - 1) * 100,
    varVes: (sumTodayVes / sumPastVes - 1) * 100,
  };
}
