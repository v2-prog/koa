import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { GeneralInfo, Heading, primaryLink, Rows, Screen } from "@/components/ui";
import { ENTRIES } from "@/data/bench";
import { STRUCTURES } from "@/data/structures";
import { formatDate } from "@/lib/dates";
import { useLedger, useLibrary, useMinutes } from "@/lib/stores";

export const Route = createFileRoute("/community")({ component: Community });

function Row({ to, title, about }: { to: LinkProps["to"]; title: string; about: string }) {
  return (
    <li>
      <Link to={to} className="flex min-h-16 items-center gap-3 px-4 py-3.5 hover:bg-paper-deep">
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-base leading-snug text-muted">{about}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Community() {
  const { ledger } = useLedger();
  const { minutes } = useMinutes();
  const { folders, captures } = useLibrary();
  const open = ledger.proposals.filter((item) => item.status === "open");
  const latest = [...minutes].sort((a, b) => b.date.localeCompare(a.date))[0];
  const groupFolders = folders.filter((folder) => folder.side === "community");
  const groupPapers = captures.filter((capture) => groupFolders.some((folder) => folder.id === capture.folderId)).length;

  return (
    <Screen
      side="community"
      kicker="Community"
      title="What the group decides together"
      intro="Community money is kept apart from personal money. Everything on this side is marked Community and edged in river blue."
    >
      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-river bg-river-soft p-4">
          <dt className="text-base text-river">Reserve interest</dt>
          <dd className="font-display text-3xl font-medium text-ink">{ledger.reserveInterest.toLocaleString("en-AU")} Q</dd>
        </div>
        <div className="rounded-card border border-river bg-river-soft p-4">
          <dt className="text-base text-river">Open asks</dt>
          <dd className="font-display text-3xl font-medium text-ink">{open.length}</dd>
        </div>
      </dl>
      {latest && (
        <p className="mt-3 text-base text-muted">
          Latest minutes: {latest.meeting}, {formatDate(latest.date)}.
        </p>
      )}

      <Link to="/fund" {...primaryLink("mt-5")}>
        Open the proposals
      </Link>

      <Heading>Records</Heading>
      <Rows className="mt-3">
        <Row to="/minutes" title="Meeting minutes" about="Who was present, what was asked and what passed." />
        <Row
          to="/folders"
          title="Community folders"
          about={groupFolders.length === 0 ? "Make a folder marked Community for a group's quotes and invoices." : `${groupFolders.length} folders, ${groupPapers} papers`}
        />
      </Rows>

      <Heading>Reading</Heading>
      <Rows className="mt-3">
        <Row to="/structures" title="Structure list" about={`${STRUCTURES.length} Australian structures, each with who controls it and whether assets are locked.`} />
        <Row to="/bench" title="Bench" about={`${ENTRIES.length} community-fund and co-operative models, briefed in English.`} />
        <Row to="/rooms" title="Rooms" about="Q units, Concentric Circles, ARC, Friends SMF, Structure Lab and Woods." />
      </Rows>
      <GeneralInfo />
    </Screen>
  );
}
