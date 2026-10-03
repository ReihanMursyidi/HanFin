'use client';

import { TextDots } from '@/components/text-dots';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getBalanceSummary } from '@/features/transaction/action';
import { convertToIDR } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from 'lucide-react';

export function BalanceCards() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: () => getBalanceSummary(),
  });

  if (error) {
    return (
      <div className="w-full p-4 text-sm border rounded-lg border-destructive/50 text-destructive bg-destructive/10">
        Failed to get balance
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <WalletIcon className="size-4 text-yellow-500" />
            Savings
          </CardTitle>
          <CardDescription className="text-lg lg:text-2xl font-semibold text-secondary-foreground">
            {isLoading ? (
              <TextDots>
                Calculating
              </TextDots>
            ) : data ? (
              convertToIDR(Number(data.savings || 0))
            ) : (
              'No data available'
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-sm">Savings for all time</CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUpIcon className="size-4 text-green-500" />
            Incomes
          </CardTitle>
          <CardDescription className="text-lg lg:text-2xl font-semibold text-secondary-foreground">
            {isLoading ? (
              <TextDots>
                Calculating
              </TextDots>
            ) : data ? (
              convertToIDR(Number(data.totalIncome || 0))
            ) : (
              'No data available'
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-sm">Total Incomes for all time</CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingDownIcon className="size-4 text-red-500" />
            Expenses
          </CardTitle>
          <CardDescription className="text-lg lg:text-2xl font-semibold text-secondary-foreground">
            {isLoading ? (
              <TextDots>
                Calculating
              </TextDots>
            ) : data ? (
              convertToIDR(Number(data.totalExpense || 0))
            ) : (
              'No data available'
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter className="text-sm">Total expenses for all time</CardFooter>
      </Card>
    </div>
  );
}