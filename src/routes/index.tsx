import { createFileRoute, Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { ExpiryRing } from "@/components/rings-mark";
import { GeneralInfo, Heading, primaryLink, Rows, Screen, SideTag } from "@/components/ui";
import { markedDocs } from "@/lib/bequest";
import type { Side } from "@/lib/captures";
import { GIFT_WINDOW_DAYS, inCirculation } from "@/lib/ledger-core";
import { isFilled } from "@/lib/rings";
import { useBequest, useLedger, useLibrary, useMinutes, useRings, useTax } from "@/lib/stores";
import { markedCount, TAX_FLAGS } from "@/lib/tax";

export const Route = createFileRoute("/")({ component: Home });

/** One place on the map: a full-width row that says where it leads and whose it is. */
function MapRow({ to, title, about, side, state }: { to: LinkProps["to"]; title: string; about: string; side: Side; state?: ReactNode }) {
  return (
    <li>
      <Link to={to} className="flex min-h-16 items-center gap-3 px-4 py-3.5 hover:bg-paper-deep">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-lg font-semibold text-ink">{title}</span>
            <SideTag side={side} className="py-0.5 text-xs" />
          </span>
          <span className="mt-0.5 block text-base leading-snug text-muted">{about}</span>
          {state ? <span className="mt-1 block text-base font-medium text-ink">{state}</span> : null}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function Home() {
  const { ledger, daysLeft } = useLedger();
  const { bequest } = useBequest();
  const { tax } = useTax();
  const { minutes } = useMinutes();
  const { slots } = useRings();
  const { captures, folders } = useLibrary();

  const open = ledger.proposals.filter((item) => item.status === "open").length;
  const people = slots.filter(isFilled).length;
  const units = (value: number) => `${value.toLocaleString("en-AU")} Q`;

  return (
    <Screen
      side="both"
      back={false}
      kicker="Home"
      title="Your papers and your community's, on this device"
      intro="A map to everything. The units below are a practice ledger: one unit stands for one Australian dollar held in reserve, and no real money moves."
    >
      <section className="mt-6 rounded-card border border-ink bg-card p-5" aria-label="Units in circulation">
        <p className="text-base font-semibold text-muted">Units in circulation</p>
        <p className="mt-1 font-display text-6xl leading-none font-medium text-ink">{units(inCirculation(ledger))}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-paper px-4 py-3">
            <dt className="text-base text-muted">Purchasing</dt>
            <dd className="font-display text-3xl font-medium text-ink">{units(ledger.purchasing)}</dd>
          </div>
          <div className="rounded-2xl bg-paper px-4 py-3">
            <dt className="text-base text-muted">Gifting</dt>
            <dd className="font-display text-3xl font-medium text-ink">{units(ledger.gifting)}</dd>
          </div>
        </dl>
        {daysLeft !== null ? (
          <div className="mt-4 flex items-center gap-4 rounded-2xl border border-brass bg-brass-soft px-4 py-3">
            <ExpiryRing daysLeft={daysLeft} className="size-14 shrink-0" />
            <p className="text-base leading-snug text-ink">
              <span className="block font-display text-2xl font-medium">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left
              </span>
              Idle gifting units leave circulation after {GIFT_WINDOW_DAYS} days. A gift restarts the count.
            </p>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-brass bg-brass-soft px-4 py-3 text-base leading-snug text-ink">
            There are no gifting units on this device. They were given on or have expired. The ledger screen can
            reset the demo.
          </p>
        )}
      </section>

      <Link to="/transfer" search={{ mode: "gift" }} {...primaryLink("mt-5")}>
        Gift
      </Link>

      <Heading>Four jobs</Heading>
      <Rows className="mt-3">
        <MapRow
          to="/transfer"
          side="personal"
          title="Device ledger"
          about="Record a spend or a gift and read the receipt."
          state={plural(ledger.receipts.length, "receipt", "receipts")}
        />
        <MapRow
          to="/bequest"
          side="personal"
          title="Bequest support pack"
          about="Which documents exist beside a will."
          state={`${markedDocs(bequest)} of 10 documents marked`}
        />
        <MapRow
          to="/tax"
          side="personal"
          title="Tax questions"
          about="Five flags, each sent to the ATO page or a tax agent."
          state={`${markedCount(tax)} of ${TAX_FLAGS.length} flags marked`}
        />
        <MapRow
          to="/fund"
          side="community"
          title="Community proposals"
          about="Asks that can only come from reserve interest."
          state={`${plural(open, "open ask", "open asks")}, ${units(ledger.reserveInterest)} of reserve interest`}
        />
      </Rows>

      <Heading>Capture and keep</Heading>
      <Rows className="mt-3">
        <MapRow
          to="/capture"
          side="personal"
          title="Capture a receipt or document"
          about="Photograph it. koa reads it on this device and you check what it read."
        />
        <MapRow
          to="/folders"
          side="personal"
          title="Folders"
          about="The shoebox and the folders you make, for you or for a group."
          state={`${plural(captures.length, "capture", "captures")} in ${plural(folders.length, "folder", "folders")}`}
        />
      </Rows>

      <Heading>People, at every age</Heading>
      <Rows className="mt-3">
        <MapRow
          to="/rings"
          side="personal"
          title="Life-stage rings"
          about="One person in the middle, then family, then community."
          state={people === 0 ? "Empty" : `${plural(people, "slot", "slots")} filled`}
        />
        <MapRow to="/guide" side="personal" title="A guide for every age" about="What to notice and who to ask, from childhood to later life." />
      </Rows>

      <Heading>The community shelf</Heading>
      <Rows className="mt-3">
        <MapRow to="/community" side="community" title="Community" about="Reserve interest, open asks and the latest minutes in one place." />
        <MapRow
          to="/minutes"
          side="community"
          title="Meeting minutes"
          about="Who was present, what was asked and what passed."
          state={plural(minutes.length, "set of minutes", "sets of minutes")}
        />
        <MapRow to="/structures" side="community" title="Structure list" about="Ten Australian structures to read about before seeing a solicitor." />
        <MapRow to="/bench" side="community" title="Bench" about="Nineteen community-fund and co-operative models from public sources." />
        <MapRow to="/rooms" side="community" title="Rooms" about="How koa sits beside Q units and the rest of the Woods shelf." />
      </Rows>

      <Heading>This device</Heading>
      <Rows className="mt-3">
        <MapRow to="/device" side="personal" title="What stays on this device" about="See what is stored, save a copy, or erase everything." />
      </Rows>

      <GeneralInfo>Demo mark held in this browser. Not a bank and not a chain. Holders earn no yield.</GeneralInfo>
    </Screen>
  );
}
