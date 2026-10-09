const STORES_KEY = "pagar-claro:saved-stores:v1";
const REMITTANCES_KEY = "pagar-claro:saved-remittances:v1";

function readList(key, storage) {
  try {
    const value = (storage ?? globalThis.localStorage).getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key, items, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(key, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function isSavedStore(item) {
  return (
    item &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    Number.isFinite(Number(item.rate)) &&
    Number(item.rate) > 0 &&
    typeof item.savedAt === "string" &&
    Number.isFinite(Date.parse(item.savedAt))
  );
}

export function readSavedStores(storage) {
  return readList(STORES_KEY, storage).filter(isSavedStore);
}

export function saveStore(name, rate, storage) {
  const cleanName = String(name ?? "").trim();
  const numericRate = Number(rate);

  if (!cleanName) {
    return { ok: false, message: "Escribe el nombre del local." };
  }
  if (cleanName.length > 80) {
    return { ok: false, message: "El nombre puede tener hasta 80 caracteres." };
  }
  if (!Number.isFinite(numericRate) || numericRate <= 0) {
    return { ok: false, message: "No hay una tasa válida para guardar." };
  }

  const stores = readSavedStores(storage);
  const normalizedName = cleanName.toLocaleLowerCase("es");
  const existingIndex = stores.findIndex(
    (store) => store.name.toLocaleLowerCase("es") === normalizedName,
  );
  const record = {
    name: cleanName,
    rate: numericRate,
    savedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    stores.splice(existingIndex, 1);
  }
  stores.unshift(record);

  if (!writeList(STORES_KEY, stores, storage)) {
    return {
      ok: false,
      message: "No se pudo guardar en este navegador. Revisa el espacio disponible.",
    };
  }

  return { ok: true, stores };
}

function isSavedRemittance(item) {
  return (
    item &&
    typeof item.via === "string" &&
    item.via.trim().length > 0 &&
    [
      "amountUsd",
      "commissionUsd",
      "serviceRate",
      "receivedVes",
      "totalUsd",
      "bcvEquivalentVes",
      "differenceVes",
      "differencePercent",
    ].every((key) => Number.isFinite(Number(item[key]))) &&
    typeof item.savedAt === "string" &&
    Number.isFinite(Date.parse(item.savedAt))
  );
}

export function readSavedRemittances(storage) {
  return readList(REMITTANCES_KEY, storage).filter(isSavedRemittance);
}

export function saveRemittance(comparison, storage) {
  if (!isSavedRemittance(comparison)) {
    return { ok: false, message: "No se pudo guardar esta comparación." };
  }

  const remittances = [{ ...comparison }, ...readSavedRemittances(storage)];

  if (!writeList(REMITTANCES_KEY, remittances, storage)) {
    return {
      ok: false,
      message: "No se pudo guardar en este navegador. Revisa el espacio disponible.",
    };
  }

  return { ok: true, remittances };
}
