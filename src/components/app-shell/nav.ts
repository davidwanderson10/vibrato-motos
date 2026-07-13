import {
  LayoutDashboard,
  FileText,
  Bike,
  CalendarCheck,
  Wallet,
  Wrench,
  Users,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Screen } from "@/lib/permissoes";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  key: Screen;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/locacoes", label: "Locações", icon: FileText, key: "locacoes" },
  { href: "/frota", label: "Frota", icon: Bike, key: "frota" },
  { href: "/checklist", label: "Checklist", icon: CalendarCheck, key: "checklist" },
  { href: "/financas", label: "Finanças", icon: Wallet, key: "financas" },
  { href: "/manutencoes", label: "Manutenções", icon: Wrench, key: "manutencoes" },
  { href: "/clientes", label: "Clientes", icon: Users, key: "clientes" },
  { href: "/usuarios", label: "Usuários", icon: UserCog, key: "usuarios" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, key: "configuracoes" },
];
