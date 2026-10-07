import type { Metadata } from "next";
import Transaction from "./_components/transaction";

export const metadata: Metadata = {
  title: "HanFin - Transaction",
  description: "Your personal financial transactions",
};

export default function TransactionPage() {
  return (
    <div className="space-y-6 custom-scrollbar">
      <section id="header" className="space-y-1.5 px-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-primary">
          Transaction
        </h1>
        <p className="text-sm md:text-base">
          Review and manage your recent transactions, recurring activity, and
          spending insights in one place.
        </p>
      </section>
      <Transaction />
    </div>
  );
}
