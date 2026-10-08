"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { convertToIDR } from "@/lib/format";
import type { PortfolioAsset } from "@/features/market/types";

interface AssetAllocationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  assets: PortfolioAsset[];
  currency: string;
}

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

export function AssetAllocationModal({
  isOpen,
  onOpenChange,
  assets,
  currency,
}: AssetAllocationModalProps) {
  const chartData = assets.map((a) => ({
    name: a.symbol,
    fullName: a.name,
    value: a.current_value || 0,
    quantity: a.total_quantity,
  }));

  const totalPortfolioValue = chartData.reduce(
    (acc, curr) => acc + curr.value,
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alokasi Portofolio Aset</DialogTitle>
        </DialogHeader>

        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Belum ada aset yang dimiliki dalam portofolio.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => {
                      const numericValue = Array.isArray(value)
                        ? Number(value[0] ?? 0)
                        : Number(value ?? 0);

                      return [
                        currency === "IDR"
                          ? convertToIDR(numericValue)
                          : `$${numericValue.toLocaleString()}`,
                        "Nilai",
                      ] as [string, string];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {chartData.map((item, index) => {
                const percentage =
                  totalPortfolioValue > 0
                    ? ((item.value / totalPortfolioValue) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/20"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.quantity} unit)
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{percentage}%</p>
                      <p className="text-xs text-muted-foreground">
                        {currency === "IDR"
                          ? convertToIDR(item.value)
                          : `$${item.value.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
