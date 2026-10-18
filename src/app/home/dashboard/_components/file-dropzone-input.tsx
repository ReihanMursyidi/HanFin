"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, UploadCloudIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { extractReceiptData } from "@/features/ai/multimodal";
import { cn } from "@/lib/utils";

export interface TransactionFormValues {
  amount: string;
  type: "income" | "expense";
  category: string;
  date: string;
  description: string;
}

interface FileDropzoneInputProps {
  // Gunakan penamaan tipe eksplisit agar tidak error saat import react-hook-form
  setValues: (values: TransactionFormValues) => void;
}

export default function FileDropzoneInput({
  setValues,
}: FileDropzoneInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: extractReceiptData,
    onSuccess: (response) => {
      // Auto-fill form dengan hasil ekstraksi AI
      setValues({
        amount: `${response.amount ?? ""}`,
        type: response.type ?? "expense",
        category: response.category ?? "",
        date: response.date ?? "",
        description: response.description ?? "",
      });

      toast.success("Receipt scanned successfully!");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process the receipt",
      );
    },
  });

  // Validasi file type dengan fallback nama file jika file.type kosong
  const isValidFileType = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();

    const validExtensions = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".mp4",
      ".mp3",
    ];
    const isExtensionValid = validExtensions.some((ext) => name.endsWith(ext));

    return (
      type.endsWith("pdf") ||
      type.startsWith("image") ||
      type.startsWith("video") ||
      type.startsWith("audio") ||
      isExtensionValid
    );
  };

  const processFile = (file: File) => {
    if (!isValidFileType(file)) {
      toast.error(
        "File type not supported. Please upload PDF, Image, Video, or Audio.",
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    mutate(formData);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (isPending) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf, image/*, video/*, audio/*"
        onChange={handleFileChange}
        disabled={isPending}
        aria-hidden="true"
      />

      <button
        type="button"
        disabled={isPending}
        onDragOver={(e: React.DragEvent<HTMLButtonElement>) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isPending && fileInputRef.current?.click()}
        className={cn(
          "w-full border-2 border-dashed rounded-xl p-6 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 text-left",
          isPending
            ? "opacity-70 cursor-not-allowed border-muted bg-muted/20"
            : "cursor-pointer",
          isDragging && !isPending
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-muted hover:border-primary/50 hover:bg-muted/50",
        )}
        aria-label="Upload receipt or document"
      >
        {isPending ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2Icon className="size-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-primary">
              AI is processing receipt...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadCloudIcon
              className={cn(
                "size-10 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-foreground">
                Drag & Drop Receipt Here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse from your device
              </p>
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
