import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { ExplainThis } from "@/components/explain";
import { OutLink } from "@/components/out-link";
import { Card, GeneralInfo, Screen, Verify, Warn } from "@/components/ui";
import { STRUCTURES } from "@/data/structures";
import { attachValue } from "@/lib/captures";
import { changesForStructure, stageBadge } from "@/lib/tax";

export const Route = createFileRoute("/structures")({ component: Structures });

function Structures() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Screen
      side="community"
      kicker="Structure list"
      title={`${STRUCTURES.length} Australian structures`}
      intro="A reading list for a conversation with a solicitor. Each one says who controls it and whether its assets are locked. Nothing here picks one for you."
    >
      <Warn className="mt-5">A charity or community land trust with an asset lock cannot stand in for a family trust.</Warn>
      <ol className="mt-5 grid gap-3">
        {STRUCTURES.map((item, index) => {
          const isOpen = open === item.id;
          return (
            <li key={item.id}>
              <Card>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : item.id)} className="block min-h-12 w-full text-left">
                  <span className="block text-lg font-semibold text-ink">
                    <span className="text-muted">{index + 1}. </span>
                    {item.name}
                  </span>
                  <span className="mt-0.5 block text-base leading-relaxed text-ink">{item.what}</span>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-sm font-semibold text-ink ${item.lock === "No" ? "border border-ink/60" : "bg-paper-deep"}`}>
                    Asset lock: {item.lock.toLowerCase()}
                  </span>
                  <span className="mt-1 block text-base font-semibold text-ink underline decoration-2 underline-offset-4">
                    {isOpen ? "Hide the detail" : "Show the detail"}
                  </span>
                </button>
                <AttachedCount target={attachValue("structure", item.id)} />
                {isOpen && (
                  <div className="mt-3">
                    <dl className="grid gap-2 text-base">
                      <div>
                        <dt className="font-semibold text-ink">Who controls it</dt>
                        <dd className="leading-relaxed text-ink">{item.control}</dd>
                      </div>
                      {item.lockNote && (
                        <div>
                          <dt className="font-semibold text-ink">About the lock</dt>
                          <dd className="leading-relaxed text-ink">{item.lockNote}</dd>
                        </div>
                      )}
                    </dl>
                    <ExplainThis>{item.explain}</ExplainThis>
                    {item.verify && <Verify who={item.verify.who}>{item.verify.what}</Verify>}
                    {changesForStructure(item.id).map((change) => (
                      <p key={change.id} className="mt-3 text-base leading-relaxed text-ink">
                        <span className="mr-2 inline-block rounded-full border border-ink px-2 py-0.5 text-sm font-bold">{stageBadge(change.stage)}</span>
                        {change.title}. <OutLink href={change.source.url}>Read the ATO page</OutLink>
                      </p>
                    ))}
                    <AttachedCaptures target={attachValue("structure", item.id)} action="Attach a deed, constitution or note" />
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
      <Verify who="a solicitor in your state or territory" className="mt-6">
        Which structure suits a family or a group, and how it is set up.
      </Verify>
      <GeneralInfo />
    </Screen>
  );
}
