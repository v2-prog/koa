import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { TEXT_LINK } from "@/components/ui";

/**
 * A link to a public page, such as the ATO's. It opens only when pressed, in
 * a new tab, and sends no referrer. Nothing from koa goes with it.
 */
export function OutLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${TEXT_LINK} inline-flex items-center gap-1 ${className}`}>
      {children}
      <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">(opens a public page in a new tab)</span>
    </a>
  );
}
