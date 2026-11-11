import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExplainThis } from "@/components/explain";
import { Card, Chip, ConfirmClear, GeneralInfo, Heading, INPUT, NoteExport, Primary, Problem, Quiet, QUIET_LINK, Screen } from "@/components/ui";
import { guideFor } from "@/data/guide";
import {
  AGE_BANDS,
  initials,
  isFilled,
  MAX_SLOT_LABEL,
  RING_RADIUS,
  RING_VIEW,
  RINGS,
  ringsText,
  shiftBand,
  slotPosition,
  slotProblem,
  STAGE_NAME,
  stageForBand,
  stageMoves,
  type RingId,
  type Slot,
} from "@/lib/rings";
import { useRings } from "@/lib/stores";

export const Route = createFileRoute("/rings")({ component: RingsPage });

const SLOT_R: Record<RingId, number> = { focus: 34, family: 22, community: 20 };

function RingPicture({ slots, selected, later, onSelect }: { slots: Slot[]; selected: string | null; later: boolean; onSelect: (id: string) => void }) {
  const centre = RING_VIEW / 2;
  return (
    <svg viewBox={`0 0 ${RING_VIEW} ${RING_VIEW}`} className="mx-auto mt-5 block w-full max-w-[26rem]" role="group" aria-label="Life-stage rings">
      <circle cx={centre} cy={centre} r={RING_RADIUS.community} fill="var(--color-river-soft)" stroke="var(--color-river)" strokeWidth="1.5" strokeDasharray="5 5" />
      <circle cx={centre} cy={centre} r={RING_RADIUS.family + 30} fill="var(--color-paper)" />
      <circle cx={centre} cy={centre} r={RING_RADIUS.family} fill="none" stroke="var(--color-ink)" strokeWidth="1.5" />
      {slots.map((slot) => {
        const { x, y } = slotPosition(slot);
        const filled = isFilled(slot);
        const band = later && slot.band ? shiftBand(slot.band, 1) : slot.band;
        const moved = later && slot.band && stageForBand(slot.band) !== stageForBand(band);
        const ring = RINGS.find((item) => item.id === slot.ring);
        const label = filled ? `${slot.label}${band ? `, ${band}` : ""}${moved ? ", changes life stage" : ""}` : `Empty ${ring?.name.toLowerCase()} slot`;
        const isSelected = selected === slot.id;
        const r = SLOT_R[slot.ring];
        const community = slot.ring === "community";
        return (
          <g key={slot.id} role="button" tabIndex={0} aria-label={label} aria-pressed={isSelected} onClick={() => onSelect(slot.id)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && (event.preventDefault(), onSelect(slot.id))} className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-[4]">
            <circle cx={x} cy={y} r={r + (isSelected ? 4 : 0)} fill={filled ? (community ? "var(--color-river)" : "var(--color-ink)") : "var(--color-card)"} stroke={moved ? "var(--color-brass)" : community ? "var(--color-river)" : "var(--color-ink)"} strokeWidth={moved || isSelected ? 3.5 : 1.5} strokeDasharray={filled ? undefined : "3 3"} />
            <text x={x} y={y + (slot.ring === "focus" ? 7 : 5)} textAnchor="middle" fontSize={slot.ring === "focus" ? 20 : 14} fontWeight="700" fill={filled ? "var(--color-paper)" : "var(--color-muted)"} fontFamily="var(--font-sans)" aria-hidden="true">
              {filled ? initials(slot.label) : "+"}
            </text>
            {filled && band && slot.ring !== "community" && (
              <text x={x} y={y + r + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={moved ? "var(--color-brass-deep)" : "var(--color-ink)"} fontFamily="var(--font-sans)" aria-hidden="true">
                {band}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SlotEditor({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const { slots, setSlots } = useRings();
  const ring = RINGS.find((item) => item.id === slot.ring) ?? RINGS[0];
  const [label, setLabel] = useState(slot.label);
  const [band, setBand] = useState(slot.band);
  const [problem, setProblem] = useState<string | null>(null);

  function save() {
    const reason = slotProblem({ label, band });
    if (reason) {
      setProblem(reason);
      return;
    }
    const wrote = setSlots(slots.map((item) => (item.id === slot.id ? { ...item, label: label.trim(), band } : item)));
    if (!wrote.ok) {
      setProblem(wrote.reason);
      return;
    }
    onClose();
  }

  return (
    <Card className={`mt-5 ${slot.ring === "community" ? "border-river" : "border-ink"}`}>
      <h2 className="font-display text-2xl font-medium text-ink">{ring.name}</h2>
      <p className="mt-1 text-base leading-relaxed text-muted">{ring.hint}</p>
      <label className="mt-4 block text-base font-semibold text-ink" htmlFor="slot-label">
        First name or role
      </label>
      <input id="slot-label" value={label} maxLength={MAX_SLOT_LABEL} autoComplete="off" onChange={(event) => { setLabel(event.target.value); setProblem(null); }} className={INPUT} />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Suggested roles">
        {ring.roles.map((role) => (
          <Chip key={role} on={label === role} onClick={() => setLabel(role)} className="min-h-10 px-3 py-1.5 text-sm">
            {role}
          </Chip>
        ))}
      </div>
      <label className="mt-4 block text-base font-semibold text-ink" htmlFor="slot-band">
        Age band
      </label>
      <p className="text-base leading-relaxed text-muted">Two-year bands, never a birth date. Leave it empty for a group.</p>
      <select id="slot-band" value={band} onChange={(event) => setBand(event.target.value)} className={INPUT}>
        <option value="">No age band</option>
        {AGE_BANDS.map((item) => {
          const stage = stageForBand(item);
          return (
            <option key={item} value={item}>
              {item} ({stage ? STAGE_NAME[stage] : ""})
            </option>
          );
        })}
      </select>
      <Problem>{problem}</Problem>
      <Primary className="mt-5" onClick={save}>
        Save this slot
      </Primary>
      <div className="mt-3 flex flex-wrap gap-2">
        <Quiet onClick={onClose}>Cancel</Quiet>
        {isFilled(slot) && (
          <Quiet
            onClick={() => {
              setSlots(slots.map((item) => (item.id === slot.id ? { ...item, label: "", band: "" } : item)));
              onClose();
            }}
          >
            Empty this slot
          </Quiet>
        )}
      </div>
    </Card>
  );
}

function RingsPage() {
  const { slots, clear } = useRings();
  const [selected, setSelected] = useState<string | null>(null);
  const [later, setLater] = useState(false);
  const [exporting, setExporting] = useState(false);
  const slot = slots.find((item) => item.id === selected) ?? null;
  const focus = slots.find((item) => item.ring === "focus");
  const focusStage = focus && isFilled(focus) && focus.band ? stageForBand(later ? shiftBand(focus.band, 1) : focus.band) : null;
  const moves = stageMoves(slots, 1);
  const filled = slots.filter(isFilled).length;

  return (
    <Screen
      side="personal"
      kicker="Life-stage rings"
      title="One person in the middle, then the people around them"
      intro="First names or roles only, and ages as two-year bands. Tap a circle to fill it."
    >
      <div className="mt-5 flex gap-2" role="group" aria-label="When">
        <Chip on={!later} onClick={() => setLater(false)} className="flex-1">
          Today
        </Chip>
        <Chip on={later} onClick={() => setLater(true)} className="flex-1">
          Two years on
        </Chip>
      </div>

      <RingPicture slots={slots} selected={selected} later={later} onSelect={(id) => setSelected(id === selected ? null : id)} />
      <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-base text-ink">
        <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-ink" aria-hidden="true" />Family, solid ring</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-river" aria-hidden="true" />Community, dashed ring</li>
        {later && <li className="flex items-center gap-2"><span className="size-3 rounded-full border-2 border-brass" aria-hidden="true" />Changes life stage</li>}
      </ul>

      {slot && <SlotEditor key={slot.id} slot={slot} onClose={() => setSelected(null)} />}

      {later && (
        <Card className="mt-5">
          <h2 className="text-lg font-semibold text-ink">Who changes life stage in two years</h2>
          {moves.length === 0 ? (
            <p className="mt-1 text-base text-muted">Nobody with an age band crosses into a new stage.</p>
          ) : (
            <ul className="mt-2 grid gap-1 text-base text-ink">
              {moves.map((move) => (
                <li key={move.label}>
                  {move.label}: {STAGE_NAME[move.from]} to {STAGE_NAME[move.to]}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {focusStage && (
        <Card className="mt-5">
          <p className="text-base font-semibold text-muted">For {focus?.label}, {later ? "in two years" : "now"}</p>
          <h2 className="mt-1 font-display text-2xl font-medium text-ink">{STAGE_NAME[focusStage]}</h2>
          <p className="mt-1 text-base leading-relaxed text-ink">{guideFor(focusStage).line}</p>
          <ul className="mt-2 grid list-disc gap-1 pl-6 text-base leading-relaxed text-ink">
            {guideFor(focusStage).notice.slice(0, 2).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <Link to="/guide" hash={focusStage} className={`${QUIET_LINK} mt-3`}>
            Read the guide for this stage
          </Link>
        </Card>
      )}

      <Heading>The three rings</Heading>
      {RINGS.map((ring) => (
        <div key={ring.id} className="mt-4">
          <h3 className="text-lg font-semibold text-ink">{ring.name}</h3>
          <p className="text-base leading-relaxed text-muted">{ring.hint}</p>
          <ExplainThis className="mt-2">{ring.explain}</ExplainThis>
        </div>
      ))}

      <Heading>Take the rings to a family conversation</Heading>
      {slot ? (
        <p className="mt-3 text-base text-muted">Save or cancel the slot above first.</p>
      ) : exporting ? (
        <NoteExport text={ringsText(slots)} filename="life-stage-rings.txt" />
      ) : (
        <Primary className="mt-3" disabled={filled === 0} onClick={() => setExporting(true)}>
          Show the rings as a note
        </Primary>
      )}
      <ConfirmClear ask="Empty all the rings" body="This removes every name, role and age band from this device." confirm="Empty the rings" onConfirm={() => { clear(); setExporting(false); }} />
      <GeneralInfo>Life stages here are broad and the same for everyone. They are a prompt for a conversation, not a plan.</GeneralInfo>
    </Screen>
  );
}
