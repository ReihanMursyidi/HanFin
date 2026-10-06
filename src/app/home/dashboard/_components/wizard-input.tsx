"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2Icon,
  MicIcon,
  SendIcon,
  SparklesIcon,
  SquareIcon,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useRef, useState, useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import Markdown from "react-markdown";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { handleWizardTools } from "@/features/ai/wizard";

const formSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function WizardInput() {
  const queryClient = useQueryClient();
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const message = useWatch({ control: form.control, name: "message" });
  const isText = message !== "";

  // Bersihkan stream audio saat komponen ditutup untuk keamanan hardware browser
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const { mutate, isPending } = useMutation({
    mutationFn: handleWizardTools,
    onSuccess: (response) => {
      toast.success(
        <div className="response-ai w-full!">
          <Markdown>{response}</Markdown>
        </div>,
      );
      // Sinkronisasi cache global React Query secara mandiri tanpa prop drilling
      queryClient.invalidateQueries({ queryKey: ["balance"] });
      form.reset();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to process your request",
      );
    },
  });

  const onSubmit = (data: FormValues) => {
    const formData = new FormData();
    formData.append("type", "text");
    formData.append("file", "");
    formData.append("request", data.message);
    mutate(formData);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("type", "audio");
        formData.append("request", "");
        formData.append("file", audioBlob);

        mutate(formData);

        // Hentikan semua track audio setelah rekaman selesai
        stream.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Gagal mengakses mikrofon. Periksa izin akses browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Fungsi pengarah klik untuk tombol aksi di sebelah kanan
  const handleActionClick = () => {
    if (!isText) {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  return (
    <Card className="w-full p-0 transition-all shadow-sm border-primary/20 focus-within:border-primary/50">
      <CardContent className="px-4 py-2">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-center gap-3"
        >
          <div className="flex items-center justify-center text-primary">
            <SparklesIcon className="size-5" />
          </div>

          <Controller
            control={form.control}
            name="message"
            render={({ field }) => (
              <Field className="flex-1">
                <input
                  {...field}
                  id="form-message"
                  placeholder={
                    isRecording
                      ? "Mendengarkan suara..."
                      : isPending && !field.value
                        ? "Memproses permintaanmu..."
                        : "Kelola transaksi dengan AI atau suara..."
                  }
                  autoComplete="off"
                  className="w-full h-12 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground"
                  onKeyDown={handleKeyDown}
                  disabled={isPending || isRecording}
                />
              </Field>
            )}
          />

          <Button
            type={isText ? "submit" : "button"}
            size="icon"
            variant="ghost"
            disabled={isPending}
            onClick={handleActionClick}
            className="transition-all rounded-full size-9 text-foreground hover:bg-secondary"
            aria-label={
              isText
                ? "Kirim pesan"
                : isRecording
                  ? "Berhenti merekam"
                  : "Mulai merekam suara"
            }
          >
            {isPending ? (
              <Loader2Icon className="size-5 animate-spin text-primary" />
            ) : isText ? (
              <SendIcon className="size-5 text-primary" />
            ) : isRecording ? (
              <SquareIcon className="text-red-500 size-5 fill-red-500 animate-pulse" />
            ) : (
              <MicIcon className="size-5 text-muted-foreground hover:text-foreground" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
