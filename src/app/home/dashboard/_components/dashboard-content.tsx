"use client";

import { BalanceCards } from './balance_cards';
import WizardInput from './wizard-input';
import { useQuery } from '@tanstack/react-query';
import { getBalanceSummary } from '@/features/transaction/action';
import GenerativeContent from './generative-content';

export default function DashboardContent() {
   const { refetch } = useQuery({
      queryKey: ['balance'],
      queryFn: () => getBalanceSummary(),
   });

   return (
      <section id="content" className="custom-scrollbar space-y-4">
         <WizardInput refetch={refetch} />
         <BalanceCards />
         <GenerativeContent />
      </section>
   );
}