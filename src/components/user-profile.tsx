'use client';

import { getCurrentUser, logoutUser } from "@/features/auth/action";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { LogOut, UserCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function UserProfile() {
   const router = useRouter();
   const queryClient = useQueryClient();
   const [isLogingOut, setIsLogingOut] = useState(false);
   const [username, setUsername] = useState('Loading...');

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
         toast.success('Logout Success');

         router.push('/');
      } catch {
         toast.error('Logout Failed');
         setIsLogingOut(false);
      }
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               variant='ghost'
               size='icon'
               className='rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all'
            >
               <UserCircle className='size-6 text-muted-foreground hover:text-primary' />
            </Button>
         </DropdownMenuTrigger>

         <DropdownMenuContent align="end" className="w-1/2">
            <DropdownMenuLabel className="truncate capitalize">{username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
               onClick={handleLogout}
               disabled={isLogingOut}
               className='text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer'
            >
               <LogOut className='mr-2 size-4' />
               {isLogingOut ? 'Logging out...' : 'Logout'}
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   )
}