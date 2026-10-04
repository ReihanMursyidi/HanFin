"use server";

import { createClient } from "@/lib/supabase/server";

type FinancialProfileInput = {
	currency?: string;
	monthly_income?: number;
	financial_goal?: string | null;
	risk_profile?: string | null;
};

export async function getFinancialProfile() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) return null;

	const { data, error } = await supabase
		.from("user_profiles")
		.select("*")
		.eq("id", user.id)
		.single();

	// Kondisi belum first login
	if (error && error.code === "PGRST116") return null;
	if (error) throw new Error(error.message);

	return data;
}

export async function upsertFinancialProfile(formData: FinancialProfileInput) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) throw new Error("Unauthorized");

	const { error } = await supabase.from("user_profiles").upsert({
		id: user.id,
		...formData,
		is_onboarded: true,
		updated_at: new Date().toISOString(),
	});

	if (error) throw new Error(error.message);
	return "Profil keuangan berhasil diperbarui!";
}
