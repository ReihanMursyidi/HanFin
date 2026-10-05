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
      <DialogContent className="sm:max-w-125 max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Konteks AI & Personalisasi</DialogTitle>
          <DialogDescription>
            Beritahu AI kondisi keuanganmu agar HanFin bisa memberikan analisis
            yang akurat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] px-6">
          <form
            id="profile-form"
            onSubmit={handleSubmit}
            className="space-y-4 py-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Profesi</Label>
                <Input
                  required
                  value={formData.profession}
                  onChange={(e) =>
                    handleInputChange("profession", e.target.value)
                  }
                  placeholder="Misal: Freelance Developer"
                />
              </div>
              <div className="space-y-2">
                <Label>Mata Uang</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status Pernikahan</Label>
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
              <div className="space-y-2">
                <Label>Jumlah Tanggungan</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={formData.dependents}
                  onChange={(e) =>
                    handleInputChange("dependents", e.target.value)
                  }
                />
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Berapa banyak orang yang hidupnya bergantung pada gajimu?
                  (Istri, anak, orang tua, dll).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rata-rata Pendapatan Bulanan</Label>
              <Input
                type="number"
                required
                value={formData.monthly_income}
                onChange={(e) =>
                  handleInputChange("monthly_income", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label>Tujuan Keuangan (Spesifik)</Label>
              <Input
                required
                value={formData.financial_goal}
                onChange={(e) =>
                  handleInputChange("financial_goal", e.target.value)
                }
                placeholder="Misal: Beli rumah 3 tahun lagi"
              />
            </div>

            <div className="space-y-2 p-3 bg-primary/10 rounded-lg border border-primary/20 transition-all">
              <Label className="flex items-center gap-2 text-primary">
                <Sparkles
                  className={`size-4 ${isAutoCalculating ? "animate-spin" : ""}`}
                />
                Rekomendasi Profil Risiko (Otomatis)
              </Label>
              {/* Yang ini tetap pakai setFormData biasa karena manual override dari user */}
              <Select
                value={formData.risk_profile}
                onValueChange={(val) =>
                  setFormData({ ...formData, risk_profile: val })
                }
              >
                <SelectTrigger className="bg-background">
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
              <p className="text-xs text-muted-foreground">
                Dihitung otomatis saat kamu mengubah form di atas. Kamu tetap
                bisa mengubahnya manual jika dirasa kurang pas.
              </p>
            </div>
          </form>
        </ScrollArea>

        <div className="p-6 pt-2 border-t mt-2">
          <Button
            type="submit"
            form="profile-form"
            className="w-full"
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
