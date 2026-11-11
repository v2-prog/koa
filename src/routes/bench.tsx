import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AttachedCaptures, AttachedCount } from "@/components/attached";
import { OutLink } from "@/components/out-link";
import { Card, Chip, GeneralInfo, Heading, Screen } from "@/components/ui";
import { ENTRIES, KIND_LABEL, PATTERNS, REGIONS, type Kind, type Region } from "@/data/bench";
import { attachValue } from "@/lib/captures";

export const Route = createFileRoute("/bench")({ component: Bench });

const KINDS: Kind[] = ["fund", "governance", "cooperative", "currency", "public"];

function Bench() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const words = query.trim().toLowerCase();
    return ENTRIES.filter((entry) => {
      if (kind !== "all" && !entry.kinds.includes(kind)) return false;
      if (region !== "all" && entry.region !== region) return false;
      if (!words) return true;
      return [entry.name, entry.place, entry.briefing, entry.original, entry.englishLine, entry.borrow].join(" ").toLowerCase().includes(words);
    }).sort((a, b) => b.relevance - a.relevance || a.name.localeCompare(b.name));
  }, [query, kind, region]);

  return (
    <Screen
      side="community"
      kicker="Bench"
      title="Community-fund and co-operative models"
      intro={`${ENTRIES.length} models from public sources, each briefed in English with what to take and what not to take. Translations are editorial, not certified.`}
    >
      <Heading>Patterns that repeat</Heading>
      <div className="mt-3 grid gap-3">
        {PATTERNS.map((pattern) => (
          <Card key={pattern.title} className="bg-river-soft border-river">
            <h3 className="text-lg font-semibold text-ink">{pattern.title}</h3>
            <p className="mt-1 text-base leading-relaxed text-ink">{pattern.body}</p>
          </Card>
        ))}
      </div>

      <Heading>The models</Heading>
      <label className="relative mt-3 block">
        <span className="sr-only">Search the models</span>
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a place, a rule or a language" className="block min-h-12 w-full rounded-2xl border border-ink/50 bg-card py-3 pr-4 pl-12 text-base text-ink outline-none focus:ring-2 focus:ring-ink" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Kind">
        <Chip on={kind === "all"} onClick={() => setKind("all")}>All kinds</Chip>
        {KINDS.map((item) => (
          <Chip key={item} on={kind === item} onClick={() => setKind(item)}>{KIND_LABEL[item]}</Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Region">
        <Chip on={region === "all"} onClick={() => setRegion("all")}>All regions</Chip>
        {REGIONS.map((item) => (
          <Chip key={item} on={region === item} onClick={() => setRegion(item)}>{item}</Chip>
        ))}
      </div>
      <p className="mt-3 text-base text-muted" aria-live="polite">{list.length} shown</p>

      <ul className="mt-3 grid gap-3">
        {list.map((entry) => {
          const isOpen = open === entry.id;
          return (
            <li key={entry.id}>
              <Card>
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : entry.id)} className="w-full text-left">
                  <span className="block text-lg font-semibold text-ink">{entry.name}</span>
                  <span className="block text-base text-muted">{entry.place}, {entry.originalLang}</span>
                  <span className="mt-1 block text-base leading-relaxed text-ink">{entry.englishLine}</span>
                </button>
                <AttachedCount target={attachValue("bench", entry.id)} />
                {isOpen && (
                  <div className="mt-3 grid gap-3 text-base leading-relaxed text-ink">
                    <p lang="und" className="text-muted">Original: {entry.original}</p>
                    <p>{entry.briefing}</p>
                    <p><span className="font-semibold">Take: </span>{entry.borrow}</p>
                    <p><span className="font-semibold">Do not take: </span>{entry.caution}</p>
                    <p><span className="font-semibold">Public support: </span>{entry.publicSupport}</p>
                    <p><OutLink href={entry.sourceUrl}>{entry.sourceLabel}</OutLink></p>
                    <AttachedCaptures target={attachValue("bench", entry.id)} action="Attach a note or a capture" className="" />
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      <GeneralInfo>Figures on the bench belong to the named source. Check them before a grant, a constitution or a regulator.</GeneralInfo>
    </Screen>
  );
}
