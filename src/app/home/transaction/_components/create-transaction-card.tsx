"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
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
import { createTransaction } from "@/features/transaction/action";
import FileDropzoneInput from "../../dashboard/_components/file-dropzone-input";

// Zod Schema
const formSchema = z.object({
  amount: z.string().trim().min(1, "Amount is required"),
  type: z.enum(["income", "expense"], {
    message: "Type is required",
  }),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .refine(
      (value) => CATEGORIES.includes(value as (typeof CATEGORIES)[number]),
      {
        message: "Category is required",
      },
    ),
  date: z.string().min(1, "Date is required"),
  description: z.string().trim().min(1, "Description is required"),
});
type FormValues = z.infer<typeof formSchema>;

export default function CreateTransactionCard() {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      type: "income",
      category: "",
      date: "",
      description: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormValues) => {
      const formattedData: Parameters<typeof createTransaction>[0] = {
        ...data,
        amount: Number.parseFloat(data.amount) || 0,
        category: data.category as Parameters<
          typeof createTransaction
        >[0]["category"],
      };

      return createTransaction(formattedData);
    },
    onSuccess: () => {
      form.reset();

      // 3. Invalidate Cache:
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["balance"] });

      toast.success("Transaction created successfully!");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create transaction",
      );
    },
  });

  const onSubmit = (data: FormValues) => {
    mutate(data);
  };

  return (
    <Card className="w-full shadow-sm h-fit border-primary/20">
      <CardHeader className="space-y-1.5">
        <CardTitle>Create Transaction</CardTitle>
        <CardDescription>Add a new financial activity.</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6">
          <FileDropzoneInput setValues={form.setValues} />
        </div>

        {/* Form Input Manual */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="form-amount">Amount</FieldLabel>
                  <Input
                    {...field}
                    id="form-amount"
                    placeholder="0.00"
                    autoComplete="off"
                    type="number"
                    min="0"
                    step="any"
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
                  <FieldLabel htmlFor="form-type">Type</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <SelectTrigger id="form-type">
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
                  <FieldLabel htmlFor="form-category">Category</FieldLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <SelectTrigger id="form-category">
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
                  <FieldLabel htmlFor="form-date">Date</FieldLabel>
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onSelect={(date: Date | undefined) =>
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
                  <FieldLabel htmlFor="form-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="form-description"
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

            <Button
              size="lg"
              type="submit"
              className="mt-2"
              disabled={isPending || !form.formState.isValid}
            >
              {isPending ? "Creating..." : "Create Transaction"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
