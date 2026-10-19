// Dipakai bersama oleh transaction/action.ts (saat menyimpan) dan
// ai/embedding.ts (saat backfill) agar teks embedding selalu identik.
// Sengaja TANPA "use server" supaya bukan server action.
export type EmbeddingSource = {
  amount: number | string;
  type: string;
  category: string;
  description: string | null;
  date: string;
};

export function buildEmbeddingText(transaction: EmbeddingSource): string {
  return JSON.stringify({
    amount: Number(transaction.amount),
    type: transaction.type,
    category: transaction.category,
    description: transaction.description ?? "",
    date: transaction.date,
  });
}
