"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  ChartPieIcon,
  ImageIcon,
  Loader2Icon,
  Sparkles,
  SparklesIcon,
  VideoIcon,
} from "lucide-react";
import Image from "next/image";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  generateChart,
  generateImage,
  generateVideo,
} from "@/features/ai/generative-content";
import { cn, convertToIDR } from "@/lib/utils";

// --- KONSTANTA & SCHEMA ---
const COLORS = [
  "#10b981",
  "#f43f5e",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#64748b",
];

const formSchema = z.object({
  request: z.string().trim().min(1, "Request is required"),
});

type GenerativeResult =
  | {
      type: "chart";
      chartType: "bar" | "pie";
      data: { name: string; value: number }[];
    }
  | { type: "image"; data: string }
  | { type: "video"; data: string };

// --- SUB-KOMPONEN: CHART RENDERER ---
function ChartRenderer({
  result,
}: {
  result: Extract<GenerativeResult, { type: "chart" }>;
}) {
  if (result.chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={result.data}>
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => convertToIDR(Number(value) || 0)}
            width={80}
          />
          <Tooltip
            formatter={(value) => convertToIDR(Number(value) || 0)}
            contentStyle={{ borderRadius: "8px" }}
          />
          <Bar
            dataKey="value"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={result.data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props) => (
            <text
              x={props.x}
              y={props.y}
              fill={COLORS[props.index % COLORS.length]}
              textAnchor={props.textAnchor}
              dominantBaseline="central"
              fontSize={14}
            >
              {`${props.name} (${((props.percent || 0) * 100).toFixed(0)}%)`}
            </text>
          )}
          outerRadius={100}
          dataKey="value"
        >
          {result.data.map((_, index) => (
            <Sector
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => convertToIDR(Number(value) || 0)}
          contentStyle={{ borderRadius: "8px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// --- KOMPONEN UTAMA ---
export default function GenerativeContent() {
  const [insightType, setInsightType] = useState<"chart" | "image" | "video">(
    "chart",
  );
  const [result, setResult] = useState<GenerativeResult | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { request: "" },
  });

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (request: string): Promise<GenerativeResult | null> => {
      switch (insightType) {
        case "chart":
          const chartResult = await generateChart(request);
          return { ...chartResult, type: "chart" };
        case "image":
          return { type: "image", data: await generateImage(request) };
        case "video":
          return { type: "video", data: await generateVideo(request) };
        default:
          return null;
      }
    },
    onSuccess: (response) => {
      if (response) {
        setResult(response);
        toast.success(`Berhasil menghasilkan ${insightType}`);
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Gagal memproses permintaan",
      );
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutate(data.request);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Card className="relative w-full overflow-hidden shadow-sm border-primary/20">
      <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-muted/10">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <CardTitle className="flex items-center gap-2 text-xl">
            <SparklesIcon className="size-5 text-primary" />
            Generative AI Insight{" "}
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              BETA
            </span>
          </CardTitle>

          <form
            className="flex flex-col gap-2 lg:flex-row lg:items-center"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <ButtonGroup>
              <Button
                variant={insightType === "chart" ? "default" : "secondary"}
                type="button"
                size="icon"
                onClick={() => setInsightType("chart")}
                disabled={isPending}
              >
                <ChartPieIcon className="size-4" />
              </Button>
              <Button
                variant={insightType === "image" ? "default" : "secondary"}
                type="button"
                size="icon"
                onClick={() => setInsightType("image")}
                disabled={isPending}
              >
                <ImageIcon className="size-4" />
              </Button>
              <Button
                variant={insightType === "video" ? "default" : "secondary"}
                type="button"
                size="icon"
                onClick={() => setInsightType("video")}
                disabled={isPending}
              >
                <VideoIcon className="size-4" />
              </Button>
            </ButtonGroup>

            <div className="flex flex-row gap-2">
              <Controller
                control={form.control}
                name="request"
                render={({ field }) => (
                  <Field>
                    <Input
                      {...field}
                      id="form-request"
                      placeholder="Contoh: Tampilkan total pengeluaran per kategori dalam 6 bulan terakhir"
                      className="w-full lg:w-70 bg-secondary"
                      onKeyDown={handleKeyDown}
                      disabled={isPending}
                    />
                  </Field>
                )}
              />
              <Button
                type="submit"
                disabled={isPending || !form.formState.isValid}
              >
                {isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                <span className="hidden lg:inline">
                  {result ? "Update" : "Generate"}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </CardHeader>

      <CardContent className={cn("p-6", result?.type === "chart" && "h-87.5")}>
        {error && (
          <div className="p-4 mb-4 text-sm font-medium border rounded-lg text-destructive border-destructive/50 bg-destructive/10">
            {error.message}
          </div>
        )}

        {!result ? (
          <div className="flex items-center justify-center border-2 border-dashed border-muted rounded-xl h-75 bg-muted/5">
            {isPending ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2Icon className="size-8 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  AI sedang memproses permintaanmu...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
                <SparklesIcon className="size-8" />
                <span className="text-lg font-medium">
                  Visualisasikan Data dengan AI
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full duration-500 animate-in fade-in">
            {result.type === "chart" && <ChartRenderer result={result} />}

            {result.type === "image" && (
              <Image
                width={1920}
                height={1080}
                src={result.data}
                alt="AI Generated Content"
                className="object-cover w-auto border shadow-sm rounded-xl max-h-125"
              />
            )}

            {result.type === "video" && (
              <video
                src={result.data}
                controls
                muted
                className="object-contain w-full border shadow-sm rounded-xl max-h-125"
              >
                Browser Anda tidak mendukung pemutaran video.
              </video>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
