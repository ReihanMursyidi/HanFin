'use client';

import { usePathname } from "next/navigation";
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
  SidebarTrigger
} from "../ui/sidebar";
import Link from 'next/link';
import { BanknoteIcon, BitcoinIcon, Briefcase, ChevronRightIcon, CoinsIcon, LandmarkIcon, LayoutDashboardIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeToggle } from "../mode-toggle";
import { UserProfile } from "../user-profile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

const sidebarItems = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboardIcon />,
    href: '/home/dashboard',
  },
  {
    label: 'Transaction',
    icon: <BanknoteIcon />,
    href: '/home/transaction',
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const FinancialMarketActive = pathname.startsWith('/home/financial-market');

  return (
    <Sidebar collapsible="icon" variant="floating">
      
      <SidebarHeader
        className="flex items-center justify-between gap-2 flex-row
                    group-data-[collapsible=icon]:flex-col-reverse
                    group-data-[collapsible=icon]:gap-4 
                    group-data-[collapsible=icon]:pt-2"
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2">
              <CoinsIcon className="text-primary size-5! group-data-[collapsible=icon]:hidden" />
              <h1 className="text-2xl font-bold text-primary group-data-[collapsible=icon]:hidden">
                HanFin
              </h1>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {sidebarItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.label}
                  className={cn(
                    'py-6 px-5 text-md',
                    pathname === item.href
                      ? 'bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground'
                      : '',
                  )}
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            <Collapsible
              asChild
              defaultOpen={FinancialMarketActive}
              className='group/collapsible'
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip='Financial Market'
                    className={cn(
                      'py-6 px-5 text-md',
                      FinancialMarketActive ? 'font-semibold text-primary' : ''
                    )}
                  >
                    <LandmarkIcon />
                    <span>Financial Market</span>
                    <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton 
                      asChild 
                      isActive={pathname === '/home/financial-market/stocks'}
                      className="py-4 text-sm"
                    >
                      <Link href="/home/financial-market/stocks">
                        <Briefcase className="size-4" />
                        <span>Stocks</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                    
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton 
                        asChild 
                        isActive={pathname === '/home/financial-market/crypto'}
                        className="py-4 text-sm"
                      >
                        <Link href="/home/financial-market/crypto">
                          <BitcoinIcon className="size-4" />
                          <span>Crypto</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex w-full justify-end">
          <UserProfile />
        </div>
        <div className="flex w-full justify-end">
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};