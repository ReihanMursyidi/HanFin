"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, UploadCloudIcon } from "lucide-react";
import type { DragEvent, ChangeEvent } from "react";
import { useRef, useState } from "react";
import type { UseFormSetValues } from "react-hook-form";
import { toast } from "sonner";
import { extractReceiptData } from "@/features/ai/multimodal";
import { cn } from "@/lib/utils";

// 1. Bersihkan definisi prop, hapus 'refetch' yang tidak lagi dibutuhkan
interface FileDropzoneInputProps {
  setValues: UseFormSetValues<{
    amount: string;
    type: "income" | "expense";
    category: string;
    date: string;
    description: string;
  }>;
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
        ...response,
        amount: `${response.amount}`,
      });

      toast.success("Receipt scanned successfully!");

      // Bersihkan input agar user bisa upload file yang sama jika perlu
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

  // 2. Ekstrak logika validasi agar lebih rapi dan deklaratif
  const isValidFileType = (type: string) => {
    return (
      type.endsWith("pdf") ||
      type.startsWith("image") ||
      type.startsWith("video") ||
      type.startsWith("audio")
    );
  };

  const processFile = (file: File) => {
    if (!isValidFileType(file.type)) {
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

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    // Bersihkan value input sebelumnya agar tidak bentrok
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

      {/* 3. Gunakan <div> interaktif dengan role="button" ketimbang elemen <button> murni 
             untuk menghindari masalah re-render / auto-submit di dalam form */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isPending && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (!isPending && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          "w-full border-2 border-dashed rounded-xl p-6 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50",
          isPending
            ? "opacity-70 cursor-not-allowed border-muted bg-muted/20"
            : "cursor-pointer",
          isDragging && !isPending
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-muted hover:border-primary/50 hover:bg-muted/50",
        )}
        aria-disabled={isPending}
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
      </div>
    </div>
  );
}
