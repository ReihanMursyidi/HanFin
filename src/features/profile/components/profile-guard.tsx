"use client";

import { useEffect, useState } from "react";
import { getFinancialProfile } from "../action";
import { FinancialProfileModal } from "./financial-profile-modal";

export function ProfileGuard() {
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      try {
        const profile = await getFinancialProfile();

        if (!profile || !profile.is_onboarded) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Gagal mengecek profil pengguna:", error);
      } finally {
        setIsChecking(false);
      }
    }
    checkProfile();
  }, []);

  // Kondisi selama pengecekan
  if (isChecking) return null;

  return (
    <FinancialProfileModal
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      mustComplete={true}
    />
  );
}
