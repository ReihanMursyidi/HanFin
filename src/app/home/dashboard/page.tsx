import type { Metadata } from "next";
import DashboardContent from "./_components/dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your personal financial dashboard",
};

export default function DashboardPage() {
  return (
    <div className="space-y-4 custom-scrollbar">
      <section id="header" className="space-y-1.5 px-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
          Dashboard
        </h1>
        <p className="text-xs sm:text-sm md:text-base">
          Pantau arus kas, dapatkan ringkasan wawasan keuangan, dan kelola
          kesehatan finansial Anda secara terpusat.
        </p>
      </section>
      <DashboardContent />
    </div>
  );
}
