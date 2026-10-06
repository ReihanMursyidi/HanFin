import type { ReactNode } from "react";
import { IdleTimer } from "@/components/idle-timer";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProfileGuard } from "@/features/profile/components/profile-guard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import ChatbotDrawer from "./dashboard/_components/chatbot-drawer";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* 1. Global Utilities & Guards */}
        <IdleTimer timeoutMinutes={15} />
        <ProfileGuard />

        {/* 2. Navigasi Samping */}
        <AppSidebar />

        {/* 3. Area Konten Utama */}
        <ScrollArea className="flex-1 h-screen bg-background">
          <main className="p-4 md:p-6 lg:p-8">
            <SidebarTrigger className="mb-4 md:hidden" />
            {children}
          </main>
        </ScrollArea>

        {/* 4. Floating UI */}
        <ChatbotDrawer />
      </SidebarProvider>
    </TooltipProvider>
  );
}
