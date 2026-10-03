import { Metadata } from 'next';
import Transaction from './_components/transaction';

export const metadata: Metadata = {
  title: 'Fina - Transaction',
  description: 'Your personal financial transactions',
};

export default function TransactionPage() {
  return (
    <div className="p-2 space-y-4">
      <section id="header">
        <h1 className="text-4xl font-bold text-primary">Transaction</h1>
        <p>
          Review and manage your recent transactions, recurring activity, and spending insights in one place.
        </p>
      </section>
      <section id="content">
        <Transaction />
      </section>
    </div>
  );
}