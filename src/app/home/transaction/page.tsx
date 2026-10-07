import type { Metadata } from "next";
import Transaction from "./_components/transaction";

export const metadata: Metadata = {
  title: "HanFin - Transaction",
  description: "Your personal financial transactions",
};

export default function TransactionPage() {
  return (
    <div className="custom-scrollbar">
      <Transaction />
    </div>
  );
}
