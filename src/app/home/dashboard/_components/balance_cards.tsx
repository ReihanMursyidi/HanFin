"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";

import { TextDots } from "@/components/text-dots";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBalanceSummary } from "@/features/transaction/action";
import { convertToIDR } from "@/lib/format";

// Prop interface utk komponen Card internal
interface BalanceCardItemProps {
  title: string;
  amount?: number;
  icon: React.ReactNode;
  footerText: string;
  isLoading: boolean;
}

function BalanceCardItem({
  title,
  amount,
  icon,
  footerText,
  isLoading,
}: BalanceCardItemProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-lg font-semibold lg:text-2xl text-secondary-foreground">
          {isLoading ? (
            <TextDots>Calculating</TextDots>
          ) : amount !== undefined ? (
            convertToIDR(Number(amount || 0))
          ) : (
            "No data available"
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter className="text-sm text-muted-foreground">
        {footerText}
      </CardFooter>
    </Card>
  );
}

export function BalanceCards() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["balance"],
    queryFn: () => getBalanceSummary(),
  });

  // 3. Tampilkan UI Error
  if (error) {
    return (
      <div className="w-full p-4 mb-8 text-sm font-medium border rounded-lg border-destructive/50 text-destructive bg-destructive/10">
        Failed to load balance summary. Please try refreshing the page.
      </div>
    );
  }

  // 4. Konfigurasi data untuk di-map
  const cardsConfig = [
    {
      title: "Savings",
      amount: data?.savings,
      icon: <WalletIcon className="text-yellow-500 size-4" />,
      footerText: "Savings for all time",
    },
    {
      title: "Incomes",
      amount: data?.totalIncome,
      icon: <TrendingUpIcon className="text-green-500 size-4" />,
      footerText: "Total Incomes for all time",
    },
    {
      title: "Expenses",
      amount: data?.totalExpense,
      icon: <TrendingDownIcon className="text-red-500 size-4" />,
      footerText: "Total expenses for all time",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
      {cardsConfig.map((card, index) => (
        <BalanceCardItem
          key={index}
          title={card.title}
          amount={card.amount}
          icon={card.icon}
          footerText={card.footerText}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
