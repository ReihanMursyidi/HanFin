import { Type, type FunctionDeclaration } from "@google/genai";

// FUNCTION DECLARATIONS UNTUK AI TOOL CALLING
export const createMarketTransactionDeclaration: FunctionDeclaration = {
  name: "create_market_transaction",
  description:
    "Mencatat transaksi pasar baru (Beli atau Jual saham/crypto). Panggil fungsi ini jika pengguna ingin membeli atau menjual aset.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description:
          "Simbol aset ringkas (contoh: BBCA, BBRI, BMRI, TLKM, BTC, ETH, SOL, BNB).",
      },
      transaction_type: {
        type: Type.STRING,
        enum: ["buy", "sell"],
        description:
          "Tipe transaksi: 'buy' untuk beli/entry/dca, atau 'sell' untuk jual/tp/cut loss.",
      },
      quantity: {
        type: Type.NUMBER,
        description:
          "Jumlah kuantitas aset. Untuk Saham Indonesia, jika pengguna sebut 'lot', KONVERSI KE LEMBAR (1 lot = 100 lembar). Untuk Crypto, masukan jumlah unit asli (misal: 0.05).",
      },
      price_per_unit: {
        type: Type.NUMBER,
        description:
          "Harga per unit/lembar murni. Jika pengguna TIDAK menyebutkan harga di dalam instruksi, isi dengan angka 0.",
      },
      notes: {
        type: Type.STRING,
        description: "Catatan opsional transaksi.",
      },
    },
    required: ["symbol", "transaction_type", "quantity"],
  },
};

export const deleteMarketTransactionDeclaration: FunctionDeclaration = {
  name: "delete_market_transaction",
  description: "Menghapus transaksi pasar terakhir berdasarkan simbol aset.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      symbol: {
        type: Type.STRING,
        description: "Simbol aset yang transaksinya ingin dihapus.",
      },
    },
    required: ["symbol"],
  },
};
