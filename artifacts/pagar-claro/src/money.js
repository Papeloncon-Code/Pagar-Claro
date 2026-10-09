const numberFormat = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Reads prices entered with either decimal comma or decimal point.
 * Also accepts Venezuelan (1.234,56) and US (1,234.56) grouping.
 */
export function parsePrice(rawValue, label) {
  let value = String(rawValue ?? "").trim().replace(/\s/g, "");

  if (!value) {
    return { ok: false, message: `Ingresa el ${label}.` };
  }

  if (/^[.,]\d+$/.test(value)) value = `0${value}`;

  if (!/^[0-9.,]+$/.test(value)) {
    return {
      ok: false,
      message: "Usa solo números y un separador decimal con coma o punto.",
    };
  }

  const lastDot = value.lastIndexOf(".");
  const lastComma = value.lastIndexOf(",");
  let normalized;

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const wholeParts = value.slice(0, decimalIndex).split(/[.,]/);
    const decimals = value.slice(decimalIndex + 1);
    const wholeIsValid =
      wholeParts[0]?.length > 0 &&
      wholeParts.every((part, index) =>
        index === 0 ? /^\d+$/.test(part) : /^\d{3}$/.test(part),
      );
    if (!wholeIsValid || !/^\d+$/.test(decimals)) {
      return { ok: false, message: "Revisa el formato del precio." };
    }
    normalized = `${wholeParts.join("")}.${decimals}`;
  } else {
    const separator = lastDot !== -1 ? "." : lastComma !== -1 ? "," : null;

    if (!separator) {
      normalized = value;
    } else {
      const pieces = value.split(separator);
      if (pieces.some((piece) => piece === "")) {
        return { ok: false, message: "Revisa el formato del precio." };
      }

      if (
        pieces.length > 2 &&
        pieces[0].length > 0 &&
        pieces.slice(1).every((piece) => /^\d{3}$/.test(piece))
      ) {
        normalized = pieces.join("");
      } else if (pieces.length === 2) {
        normalized = `${pieces[0]}.${pieces[1]}`;
      } else {
        return { ok: false, message: "Revisa el formato del precio." };
      }
    }
  }

  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    return { ok: false, message: "Ingresa un precio válido." };
  }
  if (number <= 0) {
    return { ok: false, message: "El precio debe ser mayor que cero." };
  }

  return { ok: true, value: number };
}

/** Calculates the implied rate, benchmark differences, and closest label. */
export function comparePrices(priceUsd, priceVes, rates) {
  const impliedRate = priceVes / priceUsd;
  const benchmarks = [
    { key: "bcv", label: "Tasa BCV", rate: rates.bcv.value },
    { key: "euro", label: "Tasa euro BCV", rate: rates.euro.value },
    { key: "parallel", label: "Tasa paralelo", rate: rates.parallel.value },
  ].map((benchmark) => ({
    ...benchmark,
    differencePercent: ((impliedRate - benchmark.rate) / benchmark.rate) * 100,
  }));

  const matchingBenchmark = benchmarks
    .filter((benchmark) => Math.abs(benchmark.differencePercent) < 1)
    .sort(
      (first, second) =>
        Math.abs(first.differencePercent) - Math.abs(second.differencePercent),
    )[0];

  return {
    impliedRate,
    label: matchingBenchmark?.label ?? "Tasa propia del local",
    differences: Object.fromEntries(
      benchmarks.map((benchmark) => [benchmark.key, benchmark.differencePercent]),
    ),
    overpayment: priceVes - priceUsd * rates.bcv.value,
  };
}

export function formatNumber(value) {
  return numberFormat.format(value);
}

export function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${numberFormat.format(Math.abs(value))} %`;
}
