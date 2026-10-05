export function calculateDynamicRiskProfile(
  income: number,
  emergencyFund: number,
  dependents: number,
  maritalStatus: string,
): string {
  if (income <= 0) return "Konservatif";

  // 1. Hitung Target Dana Darurat Ideal
  let baseMonthsRequired = 3;

  // Jika sudah berkeluarga tapi belum punya anak (tanggungan 0),
  // secara teknis istri/suami bisa dihitung sebagai tanggungan tambahan
  if (maritalStatus === "Berkeluarga" && dependents === 0) {
    baseMonthsRequired = 6;
  } else if (dependents > 0) {
    // Jika punya tanggungan (anak, orang tua, dll), tambah 3 bulan per kepala
    baseMonthsRequired = 3 + dependents * 3;
  }

  // Batas maksimal target wajar biasanya 12x (walaupun punya 5 anak, 12x sudah sangat aman)
  if (baseMonthsRequired > 12) baseMonthsRequired = 12;

  const idealEmergencyFundTarget = baseMonthsRequired * income;

  // 2. Tentukan Profil Risiko berdasarkan persentase ketercapaian target
  const achievementRatio = emergencyFund / idealEmergencyFundTarget;

  // Wajib fokus menabung, jangan investasi berisiko.
  if (achievementRatio < 0.5) return "Konservatif";
  if (achievementRatio < 1.0) return "Moderat";
  // Jika dana darurat sudah melampaui target ideal (>= 100%)
  // Bebas untuk mengambil risiko agresif
  return "Agresif";
}
