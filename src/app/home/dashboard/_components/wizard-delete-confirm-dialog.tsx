"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";

import type { PendingDeletion } from "@/app/types/transaction";
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
import { convertToIDR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface WizardDeleteConfirmDialogProps {
  pending: PendingDeletion[];
  setPending: Dispatch<SetStateAction<PendingDeletion[]>>;
}

// Dialog konfirmasi: transaksi yang ditemukan wizard AI baru dihapus
// setelah user menekan tombol "Delete" pada transaksi yang dimaksud.
export default function WizardDeleteConfirmDialog({
  pending,
  setPending,
}: WizardDeleteConfirmDialogProps) {
  const queryClient = useQueryClient();

  const { mutate, isPending, variables } = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: (_, id) => {
      setPending((prev) => prev.filter((item) => item.id !== id));
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

  return (
    <Dialog
      open={pending.length > 0}
      onOpenChange={(open) => {
        if (!open && !isPending) setPending([]);
      }}
    >
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-destructive">
            Konfirmasi penghapusan
          </DialogTitle>
          <DialogDescription>
            AI menemukan transaksi berikut. Pilih transaksi yang benar-benar
            ingin dihapus. Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {pending.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 border rounded-lg"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium truncate">
                  {item.description || "(tanpa deskripsi)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.date)} · {item.category}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    item.type === "income" ? "text-green-500" : "text-red-500",
                  )}
                >
                  {item.type === "income" ? "+" : "-"}
                  {convertToIDR(item.amount)}
                </p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => mutate(item.id)}
              >
                {isPending && variables === item.id ? "Deleting..." : "Delete"}
              </Button>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setPending([])}
            disabled={isPending}
          >
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
