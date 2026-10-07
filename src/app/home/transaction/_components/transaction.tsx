"use client";

import { useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getTransactions } from "@/features/transaction/action";
import TransactionTable from "./transaction-table";
import CreateTransactionCard from "./create-transaction-card";
import WizardInput from "../../dashboard/_components/wizard-input";

export default function Transaction() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const createCardRef = useRef<HTMLDivElement>(null);
  const scrollToCreateCard = () => {
    createCardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, limit, search],
    queryFn: () => getTransactions({ page, limit, search }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4 custom-scrollbar">
      <div className="flex items-center justify-between gap-4 px-1">
        <section id="header" className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-primary">
            Transaction
          </h1>
          <p className="text-sm md:text-base">
            Review and manage your recent transactions, recurring activity, and
            spending insights in one place.
          </p>
        </section>
      </div>

      <WizardInput />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-2 items-start">
        <TransactionTable
          transactions={data}
          isLoading={isLoading}
          page={page}
          limit={limit}
          search={search}
          setPage={setPage}
          setLimit={setLimit}
          setSearch={setSearch}
          onAddClick={scrollToCreateCard}
        />

        <div ref={createCardRef} className="sticky top-6">
          <CreateTransactionCard />
        </div>
      </div>
    </div>
  );
}
