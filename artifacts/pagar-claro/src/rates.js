const DOLLAR_RATES_URL = "https://ve.dolarapi.com/v1/dolares";
const EURO_RATES_URL = "https://ve.dolarapi.com/v1/euros";
const CACHE_KEY = "pagar-claro:last-valid-rates:v1";

function selectRate(rows, source, currencyName) {
  if (!Array.isArray(rows)) {
    throw new Error(`La respuesta de tasas para ${currencyName} no es válida.`);
  }

  const row = rows.find((item) => item?.fuente === source);
  const value = Number(row?.promedio);
  const updatedAt = row?.fechaActualizacion;

  if (
    !Number.isFinite(value) ||
    value <= 0 ||
    typeof updatedAt !== "string" ||
    !Number.isFinite(Date.parse(updatedAt))
  ) {
    throw new Error(`No se encontró una tasa válida para ${currencyName}.`);
  }

  return { value, updatedAt };
}

/** Requests all three reference rates and validates the public API responses. */
export async function fetchLatestRates(fetcher = globalThis.fetch) {
  const [dollarResponse, euroResponse] = await Promise.all([
    fetcher(DOLLAR_RATES_URL, { cache: "no-store" }),
    fetcher(EURO_RATES_URL, { cache: "no-store" }),
  ]);

  if (!dollarResponse.ok || !euroResponse.ok) {
    throw new Error("No se pudieron consultar las tasas.");
  }

  const [dollarRows, euroRows] = await Promise.all([
    dollarResponse.json(),
    euroResponse.json(),
  ]);

  return {
    bcv: selectRate(dollarRows, "oficial", "BCV"),
    euro: selectRate(euroRows, "oficial", "euro BCV"),
    parallel: selectRate(dollarRows, "paralelo", "paralelo"),
    savedAt: new Date().toISOString(),
  };
}

function isValidRate(rate) {
  return (
    rate &&
    Number.isFinite(Number(rate.value)) &&
    Number(rate.value) > 0 &&
    typeof rate.updatedAt === "string" &&
    Number.isFinite(Date.parse(rate.updatedAt))
  );
}

function isValidSnapshot(snapshot) {
  return (
    snapshot &&
    isValidRate(snapshot.bcv) &&
    isValidRate(snapshot.euro) &&
    isValidRate(snapshot.parallel) &&
    typeof snapshot.savedAt === "string" &&
    Number.isFinite(Date.parse(snapshot.savedAt))
  );
}

/** Stores only a complete, validated set so offline use never mixes dates. */
export function saveCachedRates(snapshot, storage) {
  if (!isValidSnapshot(snapshot)) return false;
  try {
    (storage ?? globalThis.localStorage).setItem(CACHE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

/** Returns the last complete set, or null if storage is empty or unavailable. */
export function readCachedRates(storage) {
  try {
    const rawSnapshot = (storage ?? globalThis.localStorage).getItem(CACHE_KEY);
    if (!rawSnapshot) return null;
    const snapshot = JSON.parse(rawSnapshot);
    if (!isValidSnapshot(snapshot)) return null;

    return {
      ...snapshot,
      bcv: { ...snapshot.bcv, value: Number(snapshot.bcv.value) },
      euro: { ...snapshot.euro, value: Number(snapshot.euro.value) },
      parallel: { ...snapshot.parallel, value: Number(snapshot.parallel.value) },
    };
  } catch {
    return null;
  }
}

export function formatRateDate(dateValue, options = {}) {
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";

  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: options.long ? "long" : "short",
    year: "numeric",
    timeZone: "America/Caracas",
  }).format(date);
}
