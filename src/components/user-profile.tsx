"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getCurrentUser, logoutUser } from "@/features/auth/action";
import { FinancialProfileModal } from "./financial-profile-modal";
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
	const [isLogingOut, setIsLogingOut] = useState(false);
	const [username, setUsername] = useState("Loading...");

	// State untuk mengontrol buka-tutup modal
	const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

	useEffect(() => {
		async function fetchUser() {
			const name = await getCurrentUser();
			if (name) setUsername(name);
		}
		fetchUser();
	}, []);

	const handleLogout = async () => {
		try {
			setIsLogingOut(true);
			await logoutUser();
			queryClient.removeQueries();
			toast.success("Logout Success");

			router.push("/");
		} catch {
			toast.error("Logout Failed");
			setIsLogingOut(false);
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
					>
						<UserCircle className="size-6 text-muted-foreground hover:text-primary" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="w-1/2">
					<DropdownMenuLabel className="truncate capitalize">
						{username}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />

					{/* Tombol Personalisasi AI */}
					<DropdownMenuItem
						onClick={() => setIsProfileModalOpen(true)}
						className="cursor-pointer"
					>
						<Settings className="mr-1 size-4" />
						<span>Personalisasi</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />

					{/* Tombol Logout */}
					<DropdownMenuItem
						onClick={handleLogout}
						disabled={isLogingOut}
						className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
					>
						<LogOut className="mr-1 size-4" />
						{isLogingOut ? "Logging out..." : "Logout"}
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
