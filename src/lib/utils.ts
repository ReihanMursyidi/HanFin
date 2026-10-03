import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Penggabung class Tailwind CSS dengan deteksi bentrokan (Shadcn UI Helper)
 */
export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
}

/**
 * Format angka menjadi mata uang Rupiah (IDR)
 * Contoh: 1500000 -> "Rp 1.500.000"
 */
export function convertToIDR(amount: number): string {
   return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
   }).format(amount);
}

/**
 * Format tanggal ISO ke format Indonesia
 * Contoh: "2026-09-18" -> "18 September 2026"
 */
export function formatDate(dateString: string | Date): string {
   const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
   return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
   }).format(date);
}

/**
 * Pemotong teks jika melebihi batas karakter tertentu (Truncate)
 */
export function truncateText(text: string, maxLength: number): string {
   if (text.length <= maxLength) return text;
   return text.slice(0, maxLength) + '...';
}