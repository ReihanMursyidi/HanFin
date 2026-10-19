import type { CATEGORIES } from "@/constants/transaction-constant";

export type Category = (typeof CATEGORIES)[number];

export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: Category;
  amount: number;
  type: "income" | "expense";
  user_id: string | null;
  embedding: number[] | null;
};

export type PendingDeletion = Pick<
  Transaction,
  "id" | "date" | "description" | "category" | "amount" | "type"
>;

export type WizardResult = {
  message: string;
  pendingDeletions: PendingDeletion[];
};
