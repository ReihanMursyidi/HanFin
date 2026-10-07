"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { getCurrentUser, logoutUser } from "@/features/auth/action";
import { FinancialProfileModal } from "../features/profile/components/financial-profile-modal";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function UserProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Integrasi TanStack Query
  const { data: username, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => getCurrentUser(),
  });

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const res = await logoutUser();

      if (res?.success) {
        queryClient.removeQueries();
        toast.success("Logout Success");

        router.push("/");
        router.refresh();
      } else {
        throw new Error("Gagal memproses permintaan keluar.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Logout Failed");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all"
            title="User Profile"
          >
            <UserCircle className="size-6 text-muted-foreground hover:text-primary transition-colors" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate capitalize font-medium">
            {isLoading ? "Loading..." : username || "User"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Tombol Personalisasi AI */}
          <DropdownMenuItem
            onClick={() => setIsProfileModalOpen(true)}
            className="cursor-pointer"
          >
            <Settings className="mr-2 size-4" />
            <span>Personalisasi</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Tombol Logout */}
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="mr-2 size-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FinancialProfileModal
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        mustComplete={false}
      />
    </>
  );
}
