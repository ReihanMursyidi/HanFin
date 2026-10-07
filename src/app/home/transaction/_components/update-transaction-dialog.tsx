"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { CATEGORIES } from "@/constants/transaction-constant";
import { updateTransaction } from "@/features/transaction/action";
import type { SelectedTransactionState } from "./delete-transaction-dialog";

const categoryValues = [...CATEGORIES] as [
  (typeof CATEGORIES)[number],
  ...(typeof CATEGORIES)[number][],
];

// 1. Zod Schema
const formSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required"),
  type: z.enum(["income", "expense"], {
    message: "Type is required",
  }),
  category: z.enum(categoryValues, {
    message: "Category is required",
  }),
  date: z.string().min(1, "Date is required"),
  description: z.string().trim().min(1, "Description is required"),
});

type FormValues = z.infer<typeof formSchema>;

// 2. Props: Menggunakan tipe eksternal dan menghapus 'refetch'
interface UpdateTransactionDialogProps {
  selectedTransaction: SelectedTransactionState;
  setSelectedTransaction: Dispatch<SetStateAction<SelectedTransactionState>>;
}

export default function UpdateTransactionDialog({
  selectedTransaction,
  setSelectedTransaction,
}: UpdateTransactionDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      type: "income",
      category: categoryValues[0],
      date: "",
      description: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormValues }) => {
      const formattedData = {
        ...data,
        amount: parseFloat(data.amount) || 0,
      };
      return updateTransaction(id, formattedData);
    },
    onSuccess: () => {
      setSelectedTransaction(null);
      form.reset();

      // 3. Cache Invalidation: Update tabel dan dashboard secara global
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });

      toast.success("Transaction updated successfully!");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update transaction",
      );
    },
  });

  // Sinkronisasi data ketika user mengklik tombol Edit di tabel
  useEffect(() => {
    if (selectedTransaction?.action === "update") {
      form.reset({
        amount: String(selectedTransaction.data.amount),
        type: selectedTransaction.data.type,
        category: selectedTransaction.data.category,
        date: String(selectedTransaction.data.date),
        description: selectedTransaction.data.description,
      });
    }
  }, [selectedTransaction, form]);

  const onSubmit = (data: FormValues) => {
    if (selectedTransaction) {
      mutate({ id: String(selectedTransaction.data.id), data });
    }
  };

  const isOpen =
    !!selectedTransaction && selectedTransaction.action === "update";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setSelectedTransaction(null);
      }}
    >
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogHeader className="gap-1 mb-5">
            <DialogTitle>Update Transaction</DialogTitle>
            <DialogDescription>
              Edit your transaction details below.
            </DialogDescription>
          </DialogHeader>

          {/* 5. FieldGroup dikeluarkan dari DialogHeader */}
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="update-amount">Amount</FieldLabel>
                  <Input
                    {...field}
                    id="update-amount"
                    placeholder="0.00"
                    autoComplete="off"
                    type="number"
                    step="any"
                    min="0"
                    disabled={isPending}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="type"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="update-type">Type</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <SelectTrigger id="update-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="category"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="update-category">Category</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <SelectTrigger id="update-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem value={category} key={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="update-date">Date</FieldLabel>
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) =>
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="update-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="update-description"
                    placeholder="Enter short description..."
                    autoComplete="off"
                    disabled={isPending}
                    className="h-20 resize-none"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="gap-2 pt-4 mt-6 border-t border-border/40 sm:gap-0">
            <Button
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                setSelectedTransaction(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.formState.isValid || isPending}
            >
              {isPending ? "Updating..." : "Update Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
