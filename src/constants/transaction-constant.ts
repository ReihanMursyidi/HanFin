import z from "zod";

export const CATEGORIES = [
  "Food & Drink",
  "Shopping",
  "Housing",
  "Transportation",
  "Entertainment",
  "Salary",
  "Others",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const transactionSchema = z.object({
  amount: z.number().default(0).describe("Transaction nominal"),
  type: z.enum(["income", "expense"]).describe("Type of transaction"),
  category: z.enum(CATEGORIES).describe("Category of transaction"),
  description: z.string().describe("Short text for describing transaction"),
  date: z.string().describe("The date of transaction in YYYY-MM-DD format"),
});
