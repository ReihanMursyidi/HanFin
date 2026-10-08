"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFinancialProfile, upsertFinancialProfile } from "../action";
import { calculateDynamicRiskProfile } from "../risk-logic"; // Import logikanya
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FinancialProfileData } from "../types";

interface ProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mustComplete?: boolean;
}

const INITIAL_FORM_STATE = {
  currency: "IDR",
  monthly_income: "",
  financial_goal: "",
  risk_profile: "Konservatif",
  marital_status: "Lajang",
  dependents: "0",
  current_emergency_fund: "",
  profession: "",
};

export function FinancialProfileModal({
  isOpen,
  onOpenChange,
  mustComplete = false,
}: ProfileModalProps) {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading: isFetching } = useQuery({
    queryKey: ["financialProfile"],
    queryFn: async () => await getFinancialProfile(),
    enabled: isOpen,
  });

  // Mutation untuk menyimpan data profil keuangan
  const { mutateAsync: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: async (formData: typeof INITIAL_FORM_STATE) => {
      return await upsertFinancialProfile({
        ...formData,
        monthly_income: Number(formData.monthly_income) || 0,
        dependents: Number(formData.dependents) || 0,
        current_emergency_fund: Number(formData.current_emergency_fund) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financialProfile"] });
      toast.success("Konteks AI berhasil diperbarui!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("[Save Profile Error]:", error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan profil",
      );
    },
  });

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (mustComplete && !open) return;
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 border-b bg-muted/10">
          <DialogTitle className="text-xl">
            Konteks AI & Personalisasi
          </DialogTitle>
          <DialogDescription className="mt-1.5">
            Beritahu AI kondisi keuanganmu agar HanFin bisa memberikan analisis
            yang akurat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isFetching ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground">
              <Loader2 className="size-6 animate-spin mr-2 text-primary" />
              <span>Memuat data profil...</span>
            </div>
          ) : (
            <ProfileFormContent
              key={profileData?.id || (isOpen ? "open" : "closed")}
              initialData={profileData}
              isSaving={isSaving}
              mustComplete={mustComplete}
              onSubmit={(formData) => saveProfile(formData)}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// SUB-COMPONENT: FORM CONTENT (Zero useEffect)
interface ProfileFormContentProps {
  initialData?: FinancialProfileData | null;
  isSaving: boolean;
  mustComplete: boolean;
  onSubmit: (formData: typeof INITIAL_FORM_STATE) => void;
}

function ProfileFormContent({
  initialData,
  isSaving,
  mustComplete,
  onSubmit,
}: ProfileFormContentProps) {
  const [formData, setFormData] = useState(() => ({
    currency: initialData?.currency || "IDR",
    monthly_income: initialData?.monthly_income?.toString() || "",
    financial_goal: initialData?.financial_goal || "",
    risk_profile: initialData?.risk_profile || "Konservatif",
    marital_status: initialData?.marital_status || "Lajang",
    dependents: initialData?.dependents?.toString() || "0",
    current_emergency_fund:
      initialData?.current_emergency_fund?.toString() || "",
    profession: initialData?.profession || "",
  }));

  const [isAutoCalculating, setIsAutoCalculating] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const updatedForm = { ...formData, [field]: value };

    const riskAffectingFields = [
      "monthly_income",
      "current_emergency_fund",
      "dependents",
      "marital_status",
    ];

    if (riskAffectingFields.includes(field) && updatedForm.monthly_income) {
      const calculatedRisk = calculateDynamicRiskProfile(
        Number(updatedForm.monthly_income) || 0,
        Number(updatedForm.current_emergency_fund) || 0,
        Number(updatedForm.dependents) || 0,
        updatedForm.marital_status,
      );

      updatedForm.risk_profile = calculatedRisk;

      setIsAutoCalculating(true);
      setTimeout(() => setIsAutoCalculating(false), 500);
    }

    setFormData(updatedForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <>
      <form id="profile-form" onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Profesi</Label>
            <Input
              required
              disabled={isSaving}
              value={formData.profession}
              onChange={(e) => handleInputChange("profession", e.target.value)}
              placeholder="Misal: Software Developer"
            />
          </div>
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Mata Uang</Label>
            <Select
              disabled={isSaving}
              value={formData.currency}
              onValueChange={(val) => handleInputChange("currency", val)}
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Status Pernikahan</Label>
            <Select
              disabled={isSaving}
              value={formData.marital_status}
              onValueChange={(val) => handleInputChange("marital_status", val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lajang">Lajang</SelectItem>
                <SelectItem value="Berkeluarga">Berkeluarga</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-medium">Jumlah Tanggungan</Label>
            <Input
              type="number"
              min="0"
              required
              disabled={isSaving}
              value={formData.dependents}
              onChange={(e) => handleInputChange("dependents", e.target.value)}
            />
            <p className="text-xs text-muted-foreground leading-snug">
              Jumlah orang yang bergantung pada gajimu (Istri, anak, dll).
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-medium">
            Rata-rata Pendapatan Bulanan
          </Label>
          <Input
            type="number"
            required
            disabled={isSaving}
            value={formData.monthly_income}
            onChange={(e) =>
              handleInputChange("monthly_income", e.target.value)
            }
            placeholder="Contoh: 15000000"
          />
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-medium">
            Total Dana Darurat Saat Ini
          </Label>
          <Input
            type="number"
            required
            disabled={isSaving}
            value={formData.current_emergency_fund}
            onChange={(e) =>
              handleInputChange("current_emergency_fund", e.target.value)
            }
            placeholder="Isi 0 jika belum ada"
          />
        </div>

        <div className="space-y-2.5">
          <Label className="text-sm font-medium">
            Tujuan Keuangan (Spesifik)
          </Label>
          <Input
            required
            disabled={isSaving}
            value={formData.financial_goal}
            onChange={(e) =>
              handleInputChange("financial_goal", e.target.value)
            }
            placeholder="Misal: Beli rumah 3 tahun lagi"
          />
        </div>

        <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/20 transition-all">
          <Label className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles
              className={`size-4 ${isAutoCalculating ? "animate-spin" : ""}`}
            />
            Rekomendasi Profil Risiko
          </Label>
          <Select
            disabled={isSaving}
            value={formData.risk_profile}
            onValueChange={(val) =>
              setFormData((prev) => ({ ...prev, risk_profile: val }))
            }
          >
            <SelectTrigger className="shadow-sm border-primary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Konservatif">
                Konservatif (Rendah Risiko)
              </SelectItem>
              <SelectItem value="Moderat">Moderat (Risiko Menengah)</SelectItem>
              <SelectItem value="Agresif">Agresif (Siap Rugi)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground/80 leading-snug">
            Dihitung otomatis saat kamu mengubah form di atas. Kamu bisa
            mengubahnya manual jika dirasa kurang pas.
          </p>
        </div>
      </form>

      <div className="p-4 sm:p-4 border-t bg-muted/10 flex justify-end">
        <Button
          type="submit"
          form="profile-form"
          className="w-full sm:w-auto font-medium"
          size="lg"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Menyimpan...
            </>
          ) : mustComplete ? (
            "Mulai Gunakan HanFin"
          ) : (
            "Simpan Perubahan"
          )}
        </Button>
      </div>
    </>
  );
}
