/**
 * Format angka menjadi mata uang Rupiah (IDR)
 * Contoh: 1500000 -> "Rp 1.500.000"
 */
export function convertToIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ISO ke format Indonesia
 * Contoh: "2026-09-18" -> "18 September 2026"
 */
export function formatDate(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Pemotong teks jika melebihi batas karakter tertentu (Truncate)
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Format angka ke dalam mata uang IDR atau USD secara dinamis
export function formatCurrency(
  amount: number,
  currency: "IDR" | "USD" = "IDR",
): string {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount);
}

// Konversi nilai aset sesuai preferensi mata uang user
export function convertAssetPrice({
  amount,
  baseCurrency,
  targetCurrency,
  fxRate = 17257,
}: {
  amount: number;
  baseCurrency: "IDR" | "USD";
  targetCurrency: "IDR" | "USD";
  fxRate?: number;
}): number {
  if (baseCurrency === targetCurrency) return amount;

  // Konversi USD ke IDR
  if (baseCurrency === "USD" && targetCurrency === "IDR") {
    return amount * fxRate;
  }

  // Konversi IDR ke USD
  if (baseCurrency === "IDR" && targetCurrency === "USD") {
    return amount / fxRate;
  }

  return amount;
}
