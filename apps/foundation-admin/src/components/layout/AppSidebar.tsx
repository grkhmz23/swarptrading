import React from "react";
import { useMenu, useLogout, useGetIdentity } from "@refinedev/core";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  UsersIcon,
  WalletIcon,
  CurrencyDollarIcon,
  ChartBarSquareIcon,
  ArrowLeftStartOnRectangleIcon,
  Squares2X2Icon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import type { AdminIdentity } from "@/auth/session";

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  dashboard: ChartBarSquareIcon,
  user: UsersIcon,
  wallet: WalletIcon,
  transaction: CurrencyDollarIcon,
  "launchpad-project": RocketLaunchIcon,
};

const roleLabel: Record<AdminIdentity["role"], string> = {
  superadmin: "Super admin",
  admin: "Admin",
  viewer: "Read-only",
};

export const AppSidebar: React.FC = () => {
  const { menuItems } = useMenu();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<AdminIdentity | null>();
  const location = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h1 className="text-xl font-bold text-sidebar-primary">Swarp Foundation Admin</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = iconMap[item.name] ?? Squares2X2Icon;
                // Highlight the resource for its list route and its show/edit pages.
                const isActive =
                  item.route === "/"
                    ? location.pathname === "/"
                    : Boolean(item.route) &&
                      (location.pathname === item.route || location.pathname.startsWith(`${item.route}/`));

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                    >
                      <Link to={item.route || "#"} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {identity && (
          <div className="px-2 pb-2 text-xs text-muted-foreground">
            {identity.email && <p className="truncate">{identity.email}</p>}
            <p>{roleLabel[identity.role]}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => logout()}>
              <ArrowLeftStartOnRectangleIcon className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};