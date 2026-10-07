"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getTransactions } from "@/features/transaction/action";
import TransactionTable from "./transaction-table";
import CreateTransactionCard from "./create-transaction-card";
import WizardInput from "../../dashboard/_components/wizard-input";

export default function Transaction() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, limit, search],
    queryFn: () => getTransactions({ page, limit, search }),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <WizardInput />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <TransactionTable
          transactions={data}
          isLoading={isLoading}
          page={page}
          limit={limit}
          search={search}
          setPage={setPage}
          setLimit={setLimit}
          setSearch={setSearch}
        />

        <div className="sticky top-6">
          <CreateTransactionCard />
        </div>
      </div>
    </div>
  );
}
