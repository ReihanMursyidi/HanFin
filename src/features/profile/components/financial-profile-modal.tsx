"use client";

import { useState, useEffect } from "react";
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
import { Sparkles } from "lucide-react";

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
  const [isAutoCalculating, setIsAutoCalculating] = useState(false);
  const [formData, setFormData] = useState({
    currency: "IDR",
    monthly_income: "",
    financial_goal: "",
    risk_profile: "",
    marital_status: "Lajang",
    dependents: "0",
    current_emergency_fund: "",
    profession: "",
  });

  // Ambil data profil saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      getFinancialProfile().then((data) => {
        if (data) {
          setFormData({
            currency: data.currency || "IDR",
            monthly_income: data.monthly_income?.toString() || "",
            financial_goal: data.financial_goal || "",
            risk_profile: data.risk_profile || "Konservatif",
            marital_status: data.marital_status || "Lajang",
            dependents: data.dependents?.toString() || "0",
            current_emergency_fund:
              data.current_emergency_fund?.toString() || "",
            profession: data.profession || "",
          });
        }
      });
    }
  }, [isOpen]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      if (
        [
          "monthly_income",
          "current_emergency_fund",
          "dependents",
          "marital_status",
        ].includes(field)
      ) {
        if (newData.monthly_income) {
          const calculatedRisk = calculateDynamicRiskProfile(
            Number(newData.monthly_income),
            Number(newData.current_emergency_fund) || 0,
            Number(newData.dependents),
            newData.marital_status,
          );

          newData.risk_profile = calculatedRisk;

          setIsAutoCalculating(true);
          setTimeout(() => setIsAutoCalculating(false), 500);
        }
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await upsertFinancialProfile({
        ...formData,
        monthly_income: Number(formData.monthly_income),
        dependents: Number(formData.dependents),
        current_emergency_fund: Number(formData.current_emergency_fund),
      });
      toast.success("Konteks AI berhasil diperbarui!");
      onOpenChange(false);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <DialogContent className="sm:max-w-131.25 p-0 overflow-hidden gap-0">
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
          <form
            id="profile-form"
            onSubmit={handleSubmit}
            className="space-y-5 p-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">Profesi</Label>
                <Input
                  required
                  value={formData.profession}
                  onChange={(e) =>
                    handleInputChange("profession", e.target.value)
                  }
                  placeholder="Misal: Software Developer"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">Mata Uang</Label>
                <Select
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
                  value={formData.marital_status}
                  onValueChange={(val) =>
                    handleInputChange("marital_status", val)
                  }
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
                  value={formData.dependents}
                  onChange={(e) =>
                    handleInputChange("dependents", e.target.value)
                  }
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
                value={formData.monthly_income}
                onChange={(e) =>
                  handleInputChange("monthly_income", e.target.value)
                }
                placeholder="Contoh: 15000000"
              />
            </div>

            <div className="space-y-2.5">
              <Label>Total Dana Darurat Saat Ini</Label>
              <Input
                type="number"
                required
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
                value={formData.risk_profile}
                onValueChange={(val) =>
                  setFormData({ ...formData, risk_profile: val })
                }
              >
                <SelectTrigger className="shadow-sm border-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Konservatif">
                    Konservatif (Rendah Risiko)
                  </SelectItem>
                  <SelectItem value="Moderat">
                    Moderat (Risiko Menengah)
                  </SelectItem>
                  <SelectItem value="Agresif">Agresif (Siap Rugi)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground/80 leading-snug">
                Dihitung otomatis saat kamu mengubah form di atas. Kamu bisa
                mengubahnya manual jika dirasa kurang pas.
              </p>
            </div>
          </form>
        </ScrollArea>

        <div className="p-4 sm:p-4 border-t bg-muted/10 flex justify-end">
          <Button
            type="submit"
            form="profile-form"
            className="w-full sm:w-auto font-medium"
            size="lg"
            disabled={loading}
          >
            {loading
              ? "Menyimpan..."
              : mustComplete
                ? "Mulai Gunakan HanFin"
                : "Simpan Perubahan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
