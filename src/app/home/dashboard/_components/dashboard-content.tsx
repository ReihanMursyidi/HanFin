"use client";

import { useQuery } from "@tanstack/react-query";

import { getBalanceSummary } from "@/features/transaction/action";
import { BalanceCards } from "./balance_cards";
import GenerativeContent from "./generative-content";
import WizardInput from "./wizard-input";

export default function DashboardContent() {
	const { refetch } = useQuery({
		queryKey: ["balance"],
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
