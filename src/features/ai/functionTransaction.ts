import type { FunctionDeclaration } from "@google/genai";
import { Type } from "@google/genai";
import { CATEGORIES } from "@/constants/transaction-constant";

const transactionProperties = {
  id: {
    type: Type.STRING,
    description: "The unique identifier of the transaction",
  },
  amount: {
    type: Type.NUMBER,
    description: "The amount of the transaction",
  },
  type: {
    type: Type.STRING,
    enum: ["income", "expense"],
    description: 'The type of the transaction, either "income" or "expense"',
  },
  category: {
    type: Type.STRING,
    enum: [...CATEGORIES],
    description: "The category of the transaction",
  },
  description: {
    type: Type.STRING,
    description:
      "A brief description of the transaction, first letter capitalized",
  },
  date: {
    type: Type.STRING,
    description: 'The date of the transaction in the format "YYYY-MM-DD"',
  },
};

export const getTransactionDeclaration: FunctionDeclaration = {
  name: "get_transaction",
  description:
    "Internal lookup used ONLY to locate the target transaction of an update or delete command. Never use it to answer questions or to show the user their transactions.",
  parameters: {
    type: Type.OBJECT,
    properties: transactionProperties,
  },
};

export const createTransactionDeclaration: FunctionDeclaration = {
  name: "create_transaction",
  description:
    "Create a new transaction in the user's financial history based on the provided details.",
  parameters: {
    type: Type.OBJECT,
    properties: transactionProperties,
    required: ["amount", "description", "type", "category", "date"],
  },
};

export const deleteTransactionDeclaration: FunctionDeclaration = {
  name: "delete_transaction",
  description:
    "Find the transaction(s) the user wants to delete. This does NOT delete anything: it asks the user to confirm on screen. Pass the transaction id if known (from get_transaction), otherwise the known details.",
  parameters: {
    type: Type.OBJECT,
    properties: transactionProperties,
  },
};

export const updateTransactionDeclaration: FunctionDeclaration = {
  name: "update_transaction",
  description:
    "Update an existing transaction from user's financial history. Pass the transaction id and only the fields that should change; omitted fields keep their current value.",
  parameters: {
    type: Type.OBJECT,
    properties: transactionProperties,
    required: ["id"],
  },
};

export const rejectRequestDeclaration: FunctionDeclaration = {
  name: "reject_request",
  description:
    "Call this when the user's input is NOT a command to create, update, or delete a transaction: for example a question, a request to view, list, summarize or analyze transactions, financial advice, a greeting, or an unrelated topic. Do not call any other function in that case.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: {
        type: Type.STRING,
        description: "Short reason in Bahasa Indonesia",
      },
    },
  },
};
