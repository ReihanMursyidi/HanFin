"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	getFinancialProfile,
	upsertFinancialProfile,
} from "@/features/profile/action";

import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface ProfileModalProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	mustComplete?: boolean;
}

export function FinancialProfileModal({
	isOpen,
	onOpenChange,
	mustComplete = false,
}: ProfileModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		currency: "IDR",
		monthly_income: "",
		financial_goal: "saving",
		risk_profile: "medium",
	});

	// Ambil data profil saat modal dibuka
	useEffect(() => {
		if (isOpen) {
			getFinancialProfile().then((data) => {
				if (data) {
					setFormData({
						currency: data.currency || "IDR",
						monthly_income: data.monthly_income?.toString() || "",
						financial_goal: data.financial_goal || "saving",
						risk_profile: data.risk_profile || "medium",
					});
				}
			});
		}
	}, [isOpen]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			await upsertFinancialProfile({
				currency: formData.currency,
				monthly_income: Number(formData.monthly_income),
				financial_goal: formData.financial_goal,
				risk_profile: formData.risk_profile,
			});
			toast.success("Konteks AI berhasil diperbarui!");
			onOpenChange(false);
		} catch (error) {
			toast.error("Gagal menyimpan profil");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (mustComplete && !open) return;
				onOpenChange(open);
			}}
		>
			<DialogContent className="sm:max-w-106.25">
				<DialogHeader>
					<DialogTitle>Konteks AI & Personalisasi</DialogTitle>
					<DialogDescription>
						Beritahu AI kondisi keuanganmu agar HanFin bisa memberikan analisis
						yang akurat.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Mata Uang</Label>
						<Select
							value={formData.currency}
							onValueChange={(val) =>
								setFormData({ ...formData, currency: val })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Pilih mata uang" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="IDR">Rupiah (IDR)</SelectItem>
								<SelectItem value="USD">US Dollar (USD)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Rata-rata Pendapatan Bulanan</Label>
						<Input
							type="number"
							required
							value={formData.monthly_income}
							onChange={(e) =>
								setFormData({ ...formData, monthly_income: e.target.value })
							}
							placeholder="Contoh: 15000000"
						/>
					</div>

					<div className="space-y-2">
						<Label>Tujuan Keuangan</Label>
						<Select
							value={formData.financial_goal}
							onValueChange={(val) =>
								setFormData({ ...formData, financial_goal: val })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Pilih tujuan" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="debt_payoff">Melunasi Utang</SelectItem>
								<SelectItem value="saving">Menabung</SelectItem>
								<SelectItem value="investment">Investasi</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Button type="submit" className="w-full" disabled={loading}>
						{loading
							? "Menyimpan..."
							: mustComplete
								? "Mulai Gunakan HanFin"
								: "Simpan Perubahan"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
