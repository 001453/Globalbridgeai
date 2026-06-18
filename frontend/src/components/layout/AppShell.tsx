"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  HelpCircle,
  History,
  Languages,
  MessageSquare,
  Moon,
  Radio,
  ScrollText,
  Shield,
  Sun,
} from "lucide-react";

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  live,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  live?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("gb-menu-item", active && "active", live && active && "gb-menu-item-live")}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && <span className="text-[0.6rem] opacity-70">{badge}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [showGuide, setShowGuide] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="gb-app">
      {/* Parley tarzı sol menü */}
      <aside className="gb-sidebar">
        <div className="gb-sidebar-brand">
          <div className="flex items-center gap-2">
            <span className="text-2xl text-[var(--gb-accent)]">⬡</span>
            <div>
              <div className="font-semibold leading-tight">GlobalBridge AI</div>
              <div className="text-xs text-[var(--gb-muted)]">Cihazda çeviri</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="gb-badge gb-badge-accent">
              <Shield className="mr-1 inline h-3 w-3" />
              Yerel
            </span>
            <span className="gb-badge">QVAC</span>
          </div>
        </div>

        {/* Parley: Control tips / Getting started / Glossary / History */}
        <div className="gb-sidebar-section">
          <div className="gb-sidebar-label">Yardım</div>
          <button type="button" className="gb-menu-item" onClick={() => setShowGuide(true)}>
            <HelpCircle className="h-4 w-4" />
            Başlangıç
          </button>
          <Link href="/glossary" className={cn("gb-menu-item", isActive("/glossary") && "active")}>
            <BookOpen className="h-4 w-4" />
            Sözlük
          </Link>
          <Link href="/?history=1" className={cn("gb-menu-item", pathname === "/" && "active")}>
            <History className="h-4 w-4" />
            Geçmiş
          </Link>
        </div>

        {/* Parley: Translate / Conversation / Live captions */}
        <div className="gb-sidebar-section flex-1">
          <div className="gb-sidebar-label">Mod</div>
          <NavItem href="/" icon={Languages} label="Çeviri" active={isActive("/")} badge="mic" />
          <NavItem href="/conversation" icon={MessageSquare} label="Konuşma" active={isActive("/conversation")} badge="mic" />
          <NavItem
            href="/live"
            icon={Radio}
            label="Canlı Altyazı"
            active={isActive("/live")}
            live
            badge="mic"
          />
        </div>

        <div className="gb-sidebar-section">
          <div className="gb-sidebar-label">Belge</div>
          <NavItem href="/document" icon={ScrollText} label="Belge çevirisi" active={isActive("/document")} />
          <NavItem href="/pdf" icon={FileText} label="PDF" active={isActive("/pdf")} />
        </div>

        <div className="gb-sidebar-section mt-auto">
          <button type="button" className="gb-menu-item w-full" onClick={toggle}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === "dark" ? "Açık tema" : "Koyu tema"}
          </button>
          <p className="mt-2 px-2 text-[0.65rem] text-[var(--gb-muted)]">
            Mikrofon: Çeviri, Konuşma ve Canlı Altyazı ekranlarında.
          </p>
        </div>
      </aside>

      <div className="gb-main">{children}</div>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div className="gb-card max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Başlangıç</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--gb-muted)]">
              <li>Türkçe ↔ English hazır — doğrudan çevirin.</li>
              <li>Başka dil için o çifti etkinleştirin (isteğe bağlı).</li>
              <li>Çeviri ve konuşmada <strong>mikrofonla dikte</strong>; canlı toplantı için <strong>Canlı Altyazı</strong>.</li>
              <li>Veriler cihazınızda kalır, buluta gitmez.</li>
            </ol>
            <button type="button" className="gb-btn-primary mt-4" onClick={() => setShowGuide(false)}>
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
