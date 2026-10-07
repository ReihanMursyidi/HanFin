"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteIcon,
  BitcoinIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  CoinsIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "../ui/sidebar";
import { ModeToggle } from "../mode-toggle";
import { UserProfile } from "../user-profile";

// CONFIG & TYPES
interface SidebarSubItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  subItems?: SidebarSubItem[];
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/home/dashboard",
    icon: <LayoutDashboardIcon className="size-5" />,
  },
  {
    label: "Transaction",
    href: "/home/transaction",
    icon: <BanknoteIcon className="size-5" />,
  },
  {
    label: "Financial Market",
    icon: <LandmarkIcon className="size-5" />,
    subItems: [
      {
        label: "Stocks",
        href: "/home/financial-market/stocks",
        icon: <BriefcaseIcon className="size-4" />,
      },
      {
        label: "Crypto",
        href: "/home/financial-market/crypto",
        icon: <BitcoinIcon className="size-4" />,
      },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="floating">
      {/* HEADER */}
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:gap-4 group-data-[collapsible=icon]:pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2">
              <CoinsIcon className="size-5 text-primary group-data-[collapsible=icon]:hidden" />
              <h1 className="text-2xl font-bold text-primary group-data-[collapsible=icon]:hidden">
                HanFin
              </h1>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarTrigger />
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {SIDEBAR_ITEMS.map((item) => {
              if (item.subItems) {
                const isSubActive = item.subItems.some((sub) =>
                  pathname.startsWith(sub.href),
                );

                return (
                  <Collapsible
                    key={item.label}
                    asChild
                    defaultOpen={isSubActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.label}
                          className={cn(
                            "px-5 py-6 text-md",
                            isSubActive && "font-semibold text-primary",
                          )}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems.map((sub) => (
                            <SidebarMenuSubItem key={sub.label}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === sub.href}
                                className="py-4 text-sm"
                              >
                                <Link href={sub.href}>
                                  {sub.icon}
                                  <span>{sub.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              }

              const isActive = pathname === item.href;

              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    className={cn(
                      "px-5 py-6 text-md transition-colors",
                      isActive &&
                        "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground",
                    )}
                  >
                    <Link href={item.href || "#"}>
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="flex flex-col gap-2 p-2">
        <div className="flex w-full justify-end group-data-[collapsible=icon]:justify-center">
          <UserProfile />
        </div>
        <div className="flex w-full justify-end group-data-[collapsible=icon]:justify-center">
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
