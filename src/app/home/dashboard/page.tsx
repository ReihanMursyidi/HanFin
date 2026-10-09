import type { Metadata } from "next";
import DashboardContent from "./_components/dashboard-content";

export const metadata: Metadata = {
  title: "HanFin - Dashboard",
  description: "Your personal financial dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-4 custom-scrollbar">
      <section id="header" className="space-y-1.5 px-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl text-primary">
          Dashboard
        </h1>
        <p className="text-sm md:text-base">
          Dapatkan wawasan tentang pengeluaran Anda, lacak pengeluaran, dan
          kelola keuangan Anda.
        </p>
      </section>
      <DashboardContent />
    </div>
  );
}
