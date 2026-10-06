"use client";

import { BalanceCards } from "./balance_cards";
import GenerativeContent from "./generative-content";
import WizardInput from "./wizard-input";

export default function DashboardContent() {
  return (
    <section id="content" className="space-y-4 custom-scrollbar">
      <WizardInput />
      <BalanceCards />
      <GenerativeContent />
    </section>
  );
}
