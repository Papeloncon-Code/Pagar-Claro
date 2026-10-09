import {
  comparePrices,
  formatNumber,
  formatSignedPercent,
  parsePrice,
} from "./money.js";
import {
  fetchLatestRates,
  formatRateDate,
  readCachedRates,
  saveCachedRates,
} from "./rates.js";

const form = document.querySelector("#price-form");
const usdInput = document.querySelector("#price-usd");
const vesInput = document.querySelector("#price-ves");
const calculateButton = document.querySelector("#calculate-button");
const formMessage = document.querySelector("#form-message");
const resultEmpty = document.querySelector("#result-empty");
const calculationOutput = document.querySelector("#calculation-output");
const rateNotice = document.querySelector("#rate-notice");

let ratesPromise = null;

function showFormMessage(message, kind = "error") {
  formMessage.textContent = message;
  formMessage.className = `form-message is-${kind}`;
  formMessage.hidden = false;
}

function clearFormMessage() {
  formMessage.textContent = "";
  formMessage.hidden = true;
}

function setFieldError(input, errorElement, message = "") {
  input.setAttribute("aria-invalid", String(Boolean(message)));
  errorElement.textContent = message;
  errorElement.hidden = !message;
}

function showRateNotice(message, kind = "info") {
  rateNotice.textContent = message;
  rateNotice.className = `rate-notice is-${kind}`;
  rateNotice.hidden = !message;
}

function renderRates(rates) {
  const rateEntries = [
    ["bcv", rates.bcv],
    ["euro", rates.euro],
    ["parallel", rates.parallel],
  ];

  for (const [key, rate] of rateEntries) {
    document.querySelector(`#rate-${key}`).textContent = `Bs ${formatNumber(rate.value)}`;
    document.querySelector(`#date-${key}`).textContent =
      `Actualizada ${formatRateDate(rate.updatedAt)}`;
  }
}

/** Loads fresh rates; on failure, falls back to the last complete browser cache. */
function refreshRates() {
  if (ratesPromise) return ratesPromise;

  ratesPromise = (async () => {
    showRateNotice("Consultando las tasas del día…", "loading");

    try {
      const rates = await fetchLatestRates();
      saveCachedRates(rates);
      renderRates(rates);
      showRateNotice("");
      return rates;
    } catch {
      const cachedRates = readCachedRates();
      if (cachedRates) {
        renderRates(cachedRates);
        showRateNotice(
          `Tasa del ${formatRateDate(cachedRates.savedAt, { long: true })}, sin conexión`,
          "offline",
        );
        return cachedRates;
      }

      for (const key of ["bcv", "euro", "parallel"]) {
        document.querySelector(`#rate-${key}`).textContent = "No disponible";
        document.querySelector(`#date-${key}`).textContent = "Sin conexión";
      }
      showRateNotice(
        "No hay tasas guardadas y no se pudo conectar. Conéctate para consultar las tasas del día.",
        "offline",
      );
      return null;
    } finally {
      ratesPromise = null;
    }
  })();

  return ratesPromise;
}

function renderComparison(result) {
  document.querySelector("#implied-rate").textContent =
    `Bs ${formatNumber(result.impliedRate)} por $1`;
  document.querySelector("#rate-badge").textContent = result.label;

  for (const key of ["bcv", "euro", "parallel"]) {
    const value = result.differences[key];
    const differenceElement = document.querySelector(`#${key}-difference`);
    differenceElement.textContent = formatSignedPercent(value);
    differenceElement.classList.toggle("is-above", value > 0);
    differenceElement.classList.toggle("is-below", value < 0);
    differenceElement.classList.toggle("is-even", value === 0);
  }

  const amount = result.overpayment;
  const overpayment = document.querySelector("#overpayment");
  const overpaymentLabel = document.querySelector("#overpayment-label");
  const overpaymentValue = document.querySelector("#overpayment-value");
  overpayment.classList.remove("is-overpayment", "is-saving", "is-even");

  if (amount > 0.005) {
    overpayment.classList.add("is-overpayment");
    overpaymentLabel.textContent = "Pagas de más que a BCV";
    overpaymentValue.textContent = `Bs ${formatNumber(amount)}`;
  } else if (amount < -0.005) {
    overpayment.classList.add("is-saving");
    overpaymentLabel.textContent = "Ahorro frente a BCV";
    overpaymentValue.textContent = `Bs ${formatNumber(Math.abs(amount))}`;
  } else {
    overpayment.classList.add("is-even");
    overpaymentLabel.textContent = "Coincide con la tasa BCV";
    overpaymentValue.textContent = "Bs 0,00";
  }

  resultEmpty.hidden = true;
  calculationOutput.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormMessage();

  const usd = parsePrice(usdInput.value, "precio en dólares");
  const ves = parsePrice(vesInput.value, "precio en bolívares");
  setFieldError(usdInput, document.querySelector("#price-usd-error"), usd.ok ? "" : usd.message);
  setFieldError(vesInput, document.querySelector("#price-ves-error"), ves.ok ? "" : ves.message);

  if (!usd.ok || !ves.ok) {
    resultEmpty.hidden = false;
    calculationOutput.hidden = true;
    return;
  }

  calculateButton.disabled = true;
  calculateButton.textContent = "Calculando…";
  showFormMessage("Consultando las tasas del día…", "loading");

  try {
    const rates = await refreshRates();
    if (!rates) {
      showFormMessage("No se pudo calcular porque no hay tasas disponibles. Intenta de nuevo cuando tengas conexión.");
      resultEmpty.hidden = false;
      calculationOutput.hidden = true;
      return;
    }

    clearFormMessage();
    renderComparison(comparePrices(usd.value, ves.value, rates));
  } finally {
    calculateButton.disabled = false;
    calculateButton.textContent = "Calcular";
  }
});

for (const [input, errorId] of [
  [usdInput, "#price-usd-error"],
  [vesInput, "#price-ves-error"],
]) {
  input.addEventListener("input", () => {
    setFieldError(input, document.querySelector(errorId));
    clearFormMessage();
    resultEmpty.hidden = false;
    calculationOutput.hidden = true;
  });
}

void refreshRates();
