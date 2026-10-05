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
        <IdleTimer timeoutMinutes={15} />
        <ProfileGuard />
        <AppSidebar />

        <ScrollArea className="flex-1 h-screen bg-background">
          <div className="p-4">
            <SidebarTrigger className="mb-2 md:hidden" />
            {children}
            <ChatbotDrawer />
          </div>
        </ScrollArea>
      </SidebarProvider>
    </TooltipProvider>
  );
}
