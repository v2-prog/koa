import { Link } from "@tanstack/react-router";
import { Paperclip } from "lucide-react";
import { QUIET_LINK, TEXT_LINK } from "@/components/ui";
import { capturesFor } from "@/lib/captures";
import { formatDate } from "@/lib/dates";
import { useLibrary } from "@/lib/stores";

/**
 * The captures attached to one thing (a tax flag, a bequest item, a receipt,
 * a structure, a bench model, minutes or a proposal), and a way to capture
 * another one for it without losing your place.
 */
export function AttachedCaptures({
  target,
  action = "Capture a paper for this",
  className = "mt-3",
}: {
  /** `kind:id`, such as `tax:cgt`. */
  target: string;
  action?: string;
  className?: string;
}) {
  const { captures } = useLibrary();
  const attached = capturesFor(captures, target);
  return (
    <div className={className}>
      {attached.length > 0 && (
        <ul className="mb-3 grid gap-1.5">
          {attached.map((capture) => (
            <li key={capture.id} className="flex items-start gap-2 text-base text-ink">
              <Paperclip className="mt-1 size-4 shrink-0" aria-hidden="true" />
              <span>
                <Link to="/captures/$captureId" params={{ captureId: capture.id }} className={TEXT_LINK}>
                  {capture.title}
                </Link>{" "}
                <span className="text-muted">{formatDate(capture.date)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link to="/capture" search={{ attach: target }} className={QUIET_LINK}>
        <Paperclip className="size-5" aria-hidden="true" />
        {action}
      </Link>
    </div>
  );
}

/** A one-line count for list rows. Empty when nothing is attached. */
export function AttachedCount({ target }: { target: string }) {
  const { captures } = useLibrary();
  const count = capturesFor(captures, target).length;
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted">
      <Paperclip className="size-3.5" aria-hidden="true" />
      {count} {count === 1 ? "capture" : "captures"}
    </span>
  );
}
