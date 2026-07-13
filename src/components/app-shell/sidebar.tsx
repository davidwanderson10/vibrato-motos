"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { navItems } from "./nav";
import { logoutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { canAccess } from "@/lib/permissoes";

export function Sidebar({
  usuarioNome,
  locadoraNome,
  cargo,
  permissoes,
}: {
  usuarioNome: string;
  locadoraNome: string;
  cargo: string;
  permissoes: string[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const itensVisiveis = navItems.filter((item) =>
    canAccess({ id: "", cargo, permissoes }, item.key),
  );

  const nav = (
    <nav className="flex-1 space-y-1 px-3">
      {itensVisiveis.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand text-brand-fg"
                : "text-gray-300 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-4.5 w-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const content = (
    <div className="flex h-full flex-col bg-[#14181f] py-4">
      <div className="px-5 pb-5">
        <Image
          src="/logo-vibrato-branca.png"
          alt="Vibrato Motos"
          width={120}
          height={120}
          priority
          className="h-20 w-auto"
        />
        <p className="mt-1 truncate text-xs text-gray-400">{locadoraNome}</p>
      </div>
      {nav}
      <div className="mt-auto border-t border-white/10 px-3 pt-3">
        <p className="px-3 pb-2 text-xs text-gray-400">
          Olá, <span className="text-gray-200">{usuarioNome}</span>
        </p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar mobile */}
      <div className="flex items-center justify-between border-b border-border bg-[#14181f] px-4 py-3 md:hidden">
        <Image
          src="/logo-vibrato-branca.png"
          alt="Vibrato Motos"
          width={100}
          height={40}
          className="h-9 w-auto"
        />
        <button
          onClick={() => setOpen(true)}
          className="text-white"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 md:block">{content}</aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64">
            <button
              onClick={() => setOpen(false)}
              className="absolute -right-10 top-3 text-white"
              aria-label="Fechar menu"
            >
              <X className="h-6 w-6" />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
