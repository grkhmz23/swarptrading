import React from "react";
import { useMenu, useLogout } from "@refinedev/core";
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
  ShoppingCartIcon,
  PhotoIcon,
  TagIcon,
  RectangleStackIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  TruckIcon,
  StarIcon,
  CurrencyDollarIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  BuildingLibraryIcon,
  ChartBarSquareIcon,
  ArrowLeftStartOnRectangleIcon,
  CubeIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

const iconMap: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  "dashboard": ChartBarSquareIcon,
  "user": UsersIcon,
  "launchpad-project": RocketLaunchIcon,
  "products": CubeIcon,
  "order": ShoppingCartIcon,
  "productimage": PhotoIcon,
  "categories": RectangleStackIcon,
  "businesstypes": BuildingOffice2Icon,
  "materials": TagIcon,
  "sellers": BuildingStorefrontIcon,
  "buyers": UserGroupIcon,
  "riders": TruckIcon,
  "productreviews": StarIcon,
  "sellerreviews": StarIcon,
  "transactions": CurrencyDollarIcon,
  "notifications": BellIcon,
  "chats": ChatBubbleLeftRightIcon,
  "messages": EnvelopeIcon,
  "banks": BuildingLibraryIcon,
};

export const AppSidebar: React.FC = () => {
  const { menuItems } = useMenu();
  const { mutate: logout } = useLogout();
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
                const Icon = iconMap[item.key] || iconMap[item.name] || Squares2X2Icon;
                // Exact matching - only highlight if exact route or detail/edit pages (not sub-resources)
                let isActive = false;
                if (item.route === "/") {
                  isActive = location.pathname === "/";
                } else if (item.route) {
                  // Exact match or detail/edit pages, but NOT other routes like /sellers/pending
                  isActive = location.pathname === item.route ||
                    (location.pathname.startsWith(item.route + "/") &&
                     (location.pathname.includes("/show/") ||
                      location.pathname.includes("/edit/") ||
                      location.pathname.includes("/create")));
                }

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