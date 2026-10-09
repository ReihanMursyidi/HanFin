import type { Currency } from "@/features/market/types";

// Format tanggal ISO ke format Indonesia
export function formatDate(dateString: string | Date): string {
  const date =
    typeof dateString === "string" ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Pemotong teks jika melebihi batas karakter tertentu (Truncate)
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

// Format angka ke dalam mata uang IDR atau USD
export function formatCurrency(
  amount: number,
  currency: Currency = "IDR",
): string {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : amount < 1 ? 4 : 2,
  }).format(amount);
}

// Format angka menjadi mata uang Rupiah (IDR)
export function convertToIDR(amount: number): string {
  return formatCurrency(amount, "IDR");
}

// Konversi nilai nominal dari mata uang asal ke mata uang tujuan (Posisional).
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  fxRate: number = 17257,
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "IDR") return amount * fxRate;
  if (from === "IDR" && to === "USD") return amount / fxRate;
  return amount;
}

// Konversi nilai aset sesuai preferensi mata uang user (Objek Parameter).
export function convertAssetPrice({
  amount,
  baseCurrency,
  targetCurrency,
  fxRate = 17257,
}: {
  amount: number;
  baseCurrency: Currency;
  targetCurrency: Currency;
  fxRate?: number;
}): number {
  return convertCurrency(amount, baseCurrency, targetCurrency, fxRate);
}
