"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import type { Transaction } from "@/app/types/transaction";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteTransaction } from "@/features/transaction/action";

// 1. Ekstrak tipe state agar definisi prop komponen tidak berantakan
export type SelectedTransactionState = {
  data: Omit<Transaction, "user_id" | "embedding">;
  action: "update" | "delete";
} | null;

// Hapus prop 'refetch' karena kita akan menggunakan cache invalidation global
interface DeleteTransactionDialogProps {
  selectedTransaction: SelectedTransactionState;
  setSelectedTransaction: Dispatch<SetStateAction<SelectedTransactionState>>;
}

export default function DeleteTransactionDialog({
  selectedTransaction,
  setSelectedTransaction,
}: DeleteTransactionDialogProps) {
  // 2. Gunakan queryClient untuk independensi komponen
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),

    onSuccess: () => {
      setSelectedTransaction(null);

      // 3. Update data tabel transaksi dan saldo dashboard secara serentak
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });

      toast.success("Transaction deleted successfully!");
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete transaction",
      );
    },
  });

  // Ekstrak logika boolean agar render HTML lebih bersih
  const isOpen =
    !!selectedTransaction && selectedTransaction.action === "delete";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setSelectedTransaction(null);
      }}
    >
      <DialogContent className="gap-5 sm:max-w-106.25">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-destructive">Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            transaction data from the database.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setSelectedTransaction(null)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (selectedTransaction) mutate(selectedTransaction.data.id);
            }}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
