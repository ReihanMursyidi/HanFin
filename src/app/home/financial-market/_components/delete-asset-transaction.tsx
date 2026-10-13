"use client";

import { useTransition } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteMarketTransaction } from "@/features/market/action";
import { toast } from "sonner";

interface DeleteAssetTransactionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  symbol: string;
}

export function DeleteAssetTransaction({
  open,
  onOpenChange,
  id,
  symbol,
}: DeleteAssetTransactionProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteMarketTransaction(id);
        toast.success(`Transaksi ${symbol} berhasil dihapus.`);
        onOpenChange(false);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Gagal menghapus transaksi.";
        toast.error(msg);
        console.error("Gagal menghapus transaksi:", error);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base font-bold">
            <AlertTriangle className="size-4 text-rose-500" />
            Hapus Transaksi {symbol}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            Tindakan ini akan menghapus riwayat transaksi secara permanen dan
            memperbarui kalkulasi portofolio Anda.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                Menghapus...
              </>
            ) : (
              "Ya, Hapus"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
