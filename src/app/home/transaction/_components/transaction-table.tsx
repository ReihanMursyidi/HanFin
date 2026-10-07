import { PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTransactions } from "@/features/transaction/action";
import { cn, convertToIDR } from "@/lib/utils";

import DeleteTransactionDialog, {
  SelectedTransactionState,
} from "./delete-transaction-dialog";
import UpdateTransactionDialog from "./update-transaction-dialog";
import { DashRing } from "@/components/dash-ring";

// 1. CONSTANTS & TYPES
const TABLE_HEADER = [
  "#",
  "Date",
  "Description",
  "Category",
  "Amount",
  "Action",
];

type TransactionsResponse = Awaited<ReturnType<typeof getTransactions>>;

interface TransactionTableProps {
  transactions?: TransactionsResponse;
  isLoading: boolean;
  page: number;
  limit: number;
  search: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
}

// 2. MAIN COMPONENT
export default function TransactionTable({
  transactions,
  isLoading,
  page,
  limit,
  search,
  setPage,
  setLimit,
  setSearch,
}: TransactionTableProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [selectedTransaction, setSelectedTransaction] =
    useState<SelectedTransactionState>(null);

  // Debounce logic untuk fitur Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        setSearch(localSearch);
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, search, setPage, setSearch]);

  const sortedTransactions = [...(transactions?.data ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <Fragment>
      <Card className="w-full shadow-sm border-primary/20">
        <CardHeader className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activities.</CardDescription>
          </div>
          <div>
            <Input
              placeholder="Search by description..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-background"
              disabled={isLoading}
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-hidden border rounded-md border-border/50">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {TABLE_HEADER.map((header) => (
                    <TableHead
                      key={`th-${header}`}
                      className="font-semibold text-muted-foreground whitespace-nowrap"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={TABLE_HEADER.length}
                      className="h-40 text-center"
                    >
                      <div className="flex items-center justify-center">
                        <DashRing className="size-8 text-primary/50" />
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && sortedTransactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={TABLE_HEADER.length}
                      className="h-40 text-center text-muted-foreground"
                    >
                      No transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  sortedTransactions.map((transaction, index) => {
                    const isExpense = transaction.type === "expense";

                    return (
                      <TableRow
                        key={`tr-${transaction.id}`}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="font-medium text-muted-foreground">
                          {(page - 1) * limit + index + 1}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(transaction.date).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </TableCell>
                        <TableCell
                          className="truncate max-w-50"
                          title={transaction.description}
                        >
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <span className="px-2.5 py-1 text-xs rounded-full bg-secondary text-secondary-foreground font-medium border border-border/50">
                            {transaction.category}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "font-semibold whitespace-nowrap",
                            isExpense ? "text-red-500" : "text-emerald-500",
                          )}
                        >
                          {convertToIDR(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                              onClick={() =>
                                setSelectedTransaction({
                                  data: transaction,
                                  action: "update",
                                })
                              }
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                setSelectedTransaction({
                                  data: transaction,
                                  action: "delete",
                                })
                              }
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* 3. PAGINATION CONTROLS */}
          <div className="flex flex-col items-center justify-between gap-4 mt-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Rows per page
              </span>
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
                disabled={isLoading}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue placeholder={limit.toString()} />
                </SelectTrigger>
                <SelectContent>
                  {[1, 10, 20, 50, 100].map((size) => (
                    <SelectItem key={`limit-${size}`} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(transactions?.totalPages ?? 0) > 1 && (
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={
                        page === 1 ? "pointer-events-none opacity-50" : ""
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-4 text-sm font-medium text-muted-foreground">
                      Page {page} of {transactions?.totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={
                        page === Number(transactions?.totalPages)
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < Number(transactions?.totalPages))
                          setPage(page + 1);
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. DIALOGS */}
      <DeleteTransactionDialog
        selectedTransaction={selectedTransaction}
        setSelectedTransaction={setSelectedTransaction}
      />
      <UpdateTransactionDialog
        selectedTransaction={selectedTransaction}
        setSelectedTransaction={setSelectedTransaction}
      />
    </Fragment>
  );
}
