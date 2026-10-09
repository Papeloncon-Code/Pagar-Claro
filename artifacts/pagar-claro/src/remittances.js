export function compareRemittance({
  amountUsd,
  commissionUsd,
  serviceRate,
  bcvRate,
}) {
  if (
    !Number.isFinite(amountUsd) ||
    amountUsd <= 0 ||
    !Number.isFinite(commissionUsd) ||
    commissionUsd < 0 ||
    !Number.isFinite(serviceRate) ||
    serviceRate <= 0 ||
    !Number.isFinite(bcvRate) ||
    bcvRate <= 0
  ) {
    throw new Error("Los montos y las tasas deben ser válidos.");
  }

  const receivedVes = amountUsd * serviceRate;
  const totalUsd = amountUsd + commissionUsd;
  const bcvEquivalentVes = totalUsd * bcvRate;
  const differenceVes = receivedVes - bcvEquivalentVes;

  return {
    amountUsd,
    commissionUsd,
    serviceRate,
    receivedVes,
    totalUsd,
    bcvEquivalentVes,
    differenceVes,
    differencePercent: (differenceVes / bcvEquivalentVes) * 100,
  };
}
