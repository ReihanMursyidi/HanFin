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

const PASTEL_COLORS = [
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
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

  const renderCustomLabel = ({
    cx = 0,
    cy = 0,
    midAngle = 0,
    innerRadius = 0,
    outerRadius = 0,
    percent = 0,
    index = 0,
  }) => {
    if (percent < 0.01) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[11px] font-semibold select-none drop-shadow-xs"
      >
        <tspan x={x} dy="-0.6em">
          {chartData[index]?.name}
        </tspan>
        <tspan x={x} dy="1.2em" className="font-bold">
          {`${(percent * 100).toFixed(0)}%`}
        </tspan>
      </text>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/40 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold tracking-tight">
            Alokasi Aset Portofolio
          </DialogTitle>
        </DialogHeader>

        {chartData.length === 0 ? (
          <p className="text-center py-8 text-xs text-muted-foreground">
            Belum ada aset dalam portofolio.
          </p>
        ) : (
          <div className="space-y-4 pt-1">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={95}
                    paddingAngle={1.5}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PASTEL_COLORS[index % PASTEL_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [
                      currency === "IDR"
                        ? convertToIDR(Number(val))
                        : `$${Number(val).toLocaleString()}`,
                      "Nilai",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {chartData.map((item, index) => {
                const percentage =
                  totalPortfolioValue > 0
                    ? ((item.value / totalPortfolioValue) * 100).toFixed(1)
                    : "0";

                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border/40 bg-muted/10 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            PASTEL_COLORS[index % PASTEL_COLORS.length],
                        }}
                      />
                      <span className="font-semibold">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({item.quantity} unit)
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-medium text-muted-foreground">
                        {currency === "IDR"
                          ? convertToIDR(item.value)
                          : `$${item.value.toLocaleString()}`}
                      </span>
                      <span className="font-bold text-foreground w-12 text-right">
                        {percentage}%
                      </span>
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
