import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeftRight, Camera, FolderOpen, House, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RingsMark } from "@/components/rings-mark";

type Room = { to: "/" | "/transfer" | "/capture" | "/folders" | "/community"; label: string; icon: LucideIcon; under: string[] };

/**
 * The five rooms. Everything else is reached from the Home map, and belongs
 * to the room it is listed under so the right tab stays lit.
 */
const ROOMS: Room[] = [
  { to: "/", label: "Home", icon: House, under: [] },
  { to: "/transfer", label: "Ledger", icon: ArrowLeftRight, under: ["/transfer"] },
  { to: "/capture", label: "Capture", icon: Camera, under: ["/capture"] },
  { to: "/folders", label: "Folders", icon: FolderOpen, under: ["/folders", "/captures"] },
  {
    to: "/community",
    label: "Community",
    icon: Users,
    under: ["/community", "/fund", "/minutes", "/bench", "/structures", "/rooms"],
  },
];

function activeRoom(path: string): Room {
  return ROOMS.find((room) => room.under.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) ?? ROOMS[0];
}

export function Shell({ side = "both", children }: { side?: "personal" | "community" | "both"; children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const current = activeRoom(path);

  return (
    <div className="min-h-dvh pb-24 sm:pb-0">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to the content
      </a>
      <header className="sticky top-0 z-20 bg-paper">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-2.5 font-display text-2xl font-medium text-ink">
            <RingsMark className="size-8" />
            koa
          </Link>
          <nav aria-label="Rooms" className="hidden gap-1 sm:flex">
            {ROOMS.map((room) => (
              <Link
                key={room.to}
                to={room.to}
                aria-current={room === current ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full px-4 text-base font-semibold ${
                  room === current ? "bg-ink text-paper" : "text-ink hover:bg-paper-deep"
                }`}
              >
                {room.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className={`h-1.5 selvedge-${side}`} aria-hidden="true" />
      </header>

      <div id="content">{children}</div>

      <footer className="mx-auto max-w-4xl px-4 pt-4 pb-8 text-base leading-relaxed text-muted sm:px-6">
        Australia only. General information, not tax, legal or financial advice. koa is a demo mark in this
        browser, not a bank and not a chain. Nothing here is lodged with anyone, and what you write stays on this
        device. Woods is the shelf. The intended host is tax.koa.au.
      </footer>

      <nav
        aria-label="Rooms"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/20 bg-paper pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {ROOMS.map((room) => {
            const active = room === current;
            return (
              <li key={room.to}>
                <Link
                  to={room.to}
                  aria-current={active ? "page" : undefined}
                  className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-ink"
                >
                  <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-ink text-paper" : ""}`}>
                    <room.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className={`text-[0.8rem] leading-none ${active ? "font-bold" : "font-medium"}`}>{room.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
