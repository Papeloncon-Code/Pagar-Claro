import {
  comparePrices,
  formatNumber,
  formatSignedPercent,
  parsePrice,
} from "./money.js";
import { compareRemittance } from "./remittances.js";
import {
  fetchLatestRates,
  formatRateDate,
  readCachedRates,
  saveCachedRates,
} from "./rates.js";
import {
  readSavedRemittances,
  readSavedStores,
  saveRemittance,
  saveStore,
} from "./savedData.js";

const form = document.querySelector("#price-form");
const usdInput = document.querySelector("#price-usd");
const vesInput = document.querySelector("#price-ves");
const calculateButton = document.querySelector("#calculate-button");
const formMessage = document.querySelector("#form-message");
const resultEmpty = document.querySelector("#result-empty");
const calculationOutput = document.querySelector("#calculation-output");
const rateNotice = document.querySelector("#rate-notice");
const placeNameInput = document.querySelector("#place-name");
const placeMessage = document.querySelector("#place-message");
const remittanceForm = document.querySelector("#remittance-form");
const remittanceButton = document.querySelector("#remittance-submit");
const remittanceMessage = document.querySelector("#remittance-message");

let ratesPromise = null;
let lastComparison = null;

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
  for (const notice of document.querySelectorAll("#rate-notice, #more-rate-notice")) {
    notice.textContent = message;
    notice.className = `rate-notice is-${kind}`;
    notice.hidden = !message;
  }
}

function renderRates(rates) {
  const rateEntries = [
    ["bcv", rates.bcv],
    ["euro", rates.euro],
    ["parallel", rates.parallel],
  ];

  for (const [key, rate] of rateEntries) {
    for (const value of document.querySelectorAll(`[data-rate-value="${key}"]`)) {
      value.textContent = `Bs ${formatNumber(rate.value)}`;
    }
    for (const date of document.querySelectorAll(`[data-rate-date="${key}"]`)) {
      date.textContent = `Actualizada ${formatRateDate(rate.updatedAt)}`;
    }
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

      for (const value of document.querySelectorAll("[data-rate-value]")) {
        value.textContent = "No disponible";
      }
      for (const date of document.querySelectorAll("[data-rate-date]")) {
        date.textContent = "Sin conexión";
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
  lastComparison = result;
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

function makeElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderSavedStores(stores) {
  const list = document.querySelector("#saved-places-list");
  const emptyMessage = document.querySelector("#saved-places-empty");
  list.replaceChildren();
  emptyMessage.hidden = stores.length > 0;

  for (const store of stores) {
    const item = makeElement("article", "saved-place");
    const details = makeElement("div");
    details.append(
      makeElement("h3", "saved-place-name", store.name),
      makeElement(
        "p",
        "saved-place-date",
        `Guardado ${formatRateDate(store.savedAt, { long: true })}`,
      ),
    );
    item.append(
      details,
      makeElement("strong", "saved-place-rate", `Bs ${formatNumber(store.rate)} por $1`),
    );
    list.append(item);
  }
}

function showPlaceMessage(message, kind = "error") {
  placeMessage.textContent = message;
  placeMessage.className = `form-message is-${kind}`;
  placeMessage.hidden = !message;
}

function showRemittanceMessage(message, kind = "error") {
  remittanceMessage.textContent = message;
  remittanceMessage.className = `form-message is-${kind}`;
  remittanceMessage.hidden = !message;
}

function renderRemittanceResult(record) {
  document.querySelector("#remittance-arrival").textContent =
    `Bs ${formatNumber(record.receivedVes)}`;
  document.querySelector("#remittance-total").textContent =
    `US$ ${formatNumber(record.totalUsd)}`;
  document.querySelector("#remittance-bcv").textContent =
    `Bs ${formatNumber(record.bcvEquivalentVes)}`;

  const difference = document.querySelector("#remittance-difference");
  const differenceLabel = document.querySelector("#remittance-difference-label");
  const differenceValue = document.querySelector("#remittance-difference-value");
  difference.classList.remove("is-better", "is-worse", "is-even");

  if (record.differenceVes > 0.005) {
    difference.classList.add("is-better");
    differenceLabel.textContent = "Llegan más bolívares que a tasa BCV";
    differenceValue.textContent =
      `+ Bs ${formatNumber(record.differenceVes)} (${formatSignedPercent(record.differencePercent)})`;
  } else if (record.differenceVes < -0.005) {
    difference.classList.add("is-worse");
    differenceLabel.textContent = "Llegan menos bolívares que a tasa BCV";
    differenceValue.textContent =
      `− Bs ${formatNumber(Math.abs(record.differenceVes))} (${formatSignedPercent(record.differencePercent)})`;
  } else {
    difference.classList.add("is-even");
    differenceLabel.textContent = "Igual que a tasa BCV";
    differenceValue.textContent = "Bs 0,00 (0,00 %)";
  }

  document.querySelector("#remittance-result").hidden = false;
}

function renderSavedRemittances(remittances) {
  const list = document.querySelector("#saved-remittances-list");
  const emptyMessage = document.querySelector("#saved-remittances-empty");
  list.replaceChildren();
  emptyMessage.hidden = remittances.length > 0;

  for (const [index, record] of remittances.entries()) {
    const card = makeElement("article", "remittance-card");
    card.dataset.testid = `card-remittance-${index}`;
    card.append(
      makeElement("h3", "remittance-card-title", record.via),
      makeElement(
        "p",
        "remittance-card-date",
        `Guardado ${formatRateDate(record.savedAt, { long: true })}`,
      ),
    );

    const values = makeElement("dl", "remittance-card-values");
    const fields = [
      ["Bs que llegan", `Bs ${formatNumber(record.receivedVes)}`],
      ["Costo total", `US$ ${formatNumber(record.totalUsd)}`],
      ["A tasa BCV", `Bs ${formatNumber(record.bcvEquivalentVes)}`],
      [
        "Diferencia",
        `${record.differenceVes > 0 ? "+" : record.differenceVes < 0 ? "−" : ""}Bs ${formatNumber(Math.abs(record.differenceVes))} (${formatSignedPercent(record.differencePercent)})`,
      ],
    ];

    for (const [label, value] of fields) {
      values.append(makeElement("dt", "", label), makeElement("dd", "", value));
    }

    card.append(values);
    list.append(card);
  }
}

function showScreen(tabName) {
  for (const screen of document.querySelectorAll("[data-screen]")) {
    screen.hidden = screen.dataset.screen !== tabName;
  }

  for (const button of document.querySelectorAll("[data-tab]")) {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("is-active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }
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
    lastComparison = null;
    resultEmpty.hidden = false;
    calculationOutput.hidden = true;
  });
}

document.querySelector("#save-place-form").addEventListener("submit", (event) => {
  event.preventDefault();
  showPlaceMessage("");

  if (!lastComparison) {
    showPlaceMessage("Calcula la tasa del local antes de guardarlo.");
    return;
  }

  const result = saveStore(placeNameInput.value, lastComparison.impliedRate);
  if (!result.ok) {
    showPlaceMessage(result.message);
    return;
  }

  placeNameInput.value = "";
  showPlaceMessage("Local guardado en este navegador.", "success");
  renderSavedStores(result.stores);
});

const remittanceFields = [
  ["#remittance-amount", "monto que envías", false],
  ["#remittance-fee", "comisión", true],
  ["#remittance-rate", "tasa del servicio", false],
];

for (const [selector] of remittanceFields) {
  const input = document.querySelector(selector);
  const eventName = input.tagName === "SELECT" ? "change" : "input";
  input.addEventListener(eventName, () => {
    setFieldError(input, document.querySelector(input.getAttribute("aria-describedby")));
    showRemittanceMessage("");
    document.querySelector("#remittance-result").hidden = true;
  });
}

document.querySelector("#remittance-via").addEventListener("change", (event) => {
  setFieldError(event.currentTarget, document.querySelector("#remittance-via-error"));
  showRemittanceMessage("");
  document.querySelector("#remittance-result").hidden = true;
});

remittanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showRemittanceMessage("");

  const [amountSelector, amountLabel] = remittanceFields[0];
  const [feeSelector, feeLabel, allowZero] = remittanceFields[1];
  const [rateSelector, rateLabel] = remittanceFields[2];
  const amountInput = document.querySelector(amountSelector);
  const feeInput = document.querySelector(feeSelector);
  const rateInput = document.querySelector(rateSelector);
  const viaInput = document.querySelector("#remittance-via");
  const amount = parsePrice(amountInput.value, amountLabel);
  const fee = parsePrice(feeInput.value, feeLabel, { allowZero });
  const serviceRate = parsePrice(rateInput.value, rateLabel);

  setFieldError(amountInput, document.querySelector("#remittance-amount-error"), amount.ok ? "" : amount.message);
  setFieldError(feeInput, document.querySelector("#remittance-fee-error"), fee.ok ? "" : fee.message);
  setFieldError(rateInput, document.querySelector("#remittance-rate-error"), serviceRate.ok ? "" : serviceRate.message);
  setFieldError(
    viaInput,
    document.querySelector("#remittance-via-error"),
    viaInput.value ? "" : "Selecciona una vía.",
  );

  if (!amount.ok || !fee.ok || !serviceRate.ok || !viaInput.value) {
    document.querySelector("#remittance-result").hidden = true;
    return;
  }

  remittanceButton.disabled = true;
  remittanceButton.textContent = "Consultando tasas…";

  try {
    const rates = await refreshRates();
    if (!rates) {
      showRemittanceMessage("No hay una tasa BCV disponible para comparar. Conéctate e intenta de nuevo.");
      document.querySelector("#remittance-result").hidden = true;
      return;
    }

    const calculation = compareRemittance({
      amountUsd: amount.value,
      commissionUsd: fee.value,
      serviceRate: serviceRate.value,
      bcvRate: rates.bcv.value,
    });
    const record = {
      ...calculation,
      via: viaInput.value,
      bcvRate: rates.bcv.value,
      savedAt: new Date().toISOString(),
    };
    renderRemittanceResult(record);

    const saved = saveRemittance(record);
    if (saved.ok) {
      showRemittanceMessage("Comparación guardada en este navegador.", "success");
      renderSavedRemittances(saved.remittances);
    } else {
      showRemittanceMessage(
        `Se calculó el envío, pero ${saved.message.toLocaleLowerCase("es")}`,
        "error",
      );
      renderSavedRemittances(readSavedRemittances());
    }
  } catch {
    showRemittanceMessage("No se pudo calcular este envío. Revisa los datos e intenta de nuevo.");
    document.querySelector("#remittance-result").hidden = true;
  } finally {
    remittanceButton.disabled = false;
    remittanceButton.textContent = "Calcular y guardar esta vía";
  }
});

for (const button of document.querySelectorAll("[data-tab]")) {
  button.addEventListener("click", () => showScreen(button.dataset.tab));
}

renderSavedStores(readSavedStores());
renderSavedRemittances(readSavedRemittances());
void refreshRates();
