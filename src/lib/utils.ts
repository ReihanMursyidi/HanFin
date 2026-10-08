import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Penggabung class Tailwind CSS dengan deteksi bentrokan (Shadcn UI Helper)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
