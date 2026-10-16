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
      <SidebarProvider className="h-svh overflow-hidden">
        <IdleTimer timeoutMinutes={15} />
        <ProfileGuard />

        <AppSidebar />

        <ScrollArea className="flex-1 min-w-0 h-svh bg-background [&>div]:block!">
          <main className="p-4 md:p-6 lg:p-8 pb-20 md:pb-24 min-w-0">
            <SidebarTrigger className="mb-4 md:hidden" />
            {children}
          </main>
        </ScrollArea>

        <ChatbotDrawer />
      </SidebarProvider>
    </TooltipProvider>
  );
}
