import {
  LayoutDashboard,
  Folder,
  MessageSquare,
  BookOpen,
  Ticket,
  BarChart2,
  Users,
  FileText,
  Settings
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const ALL_ROLES = ["owner", "admin", "agent", "viewer"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { name: "Overview", href: "/overview", icon: LayoutDashboard, roles: ALL_ROLES },
      { name: "Projects", href: "/projects", icon: Folder, roles: ALL_ROLES },
    ]
  },
  {
    label: "Support",
    items: [
      { name: "Chat", href: "/chat", icon: MessageSquare, roles: ALL_ROLES },
      { name: "Tickets", href: "/tickets", icon: Ticket, roles: ALL_ROLES },
      { name: "Knowledge Base", href: "/knowledge-base", icon: BookOpen, roles: ALL_ROLES },
    ]
  },
  {
    label: "Insights",
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart2, roles: ALL_ROLES },
    ]
  },
  {
    label: "Admin",
    items: [
      { name: "Team", href: "/team", icon: Users, roles: ["owner", "admin"] },
      { name: "Audit Logs", href: "/audit-log", icon: FileText, roles: ["owner", "admin"] },
      { name: "Settings", href: "/settings/profile", icon: Settings, roles: ALL_ROLES },
    ]
  }
];