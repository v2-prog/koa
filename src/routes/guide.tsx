import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, GeneralInfo, Heading, primaryLink, QUIET_LINK, Screen, Verify } from "@/components/ui";
import { KOA_IN_SHORT, STAGE_GUIDES } from "@/data/guide";
import { STAGE_NAME } from "@/lib/rings";

export const Route = createFileRoute("/guide")({ component: Guide });

function Guide() {
  return (
    <Screen
      side="personal"
      kicker="A guide for every age"
      title="What to notice, and who to ask"
      intro="Short notes for each stage of life, from childhood to later life. Nothing here works anything out. Each stage ends with a question and the person who can answer it."
    >
      <Link to="/rings" {...primaryLink("mt-5")}>
        Draw the rings
      </Link>

      <nav aria-label="Life stages" className="mt-6 flex flex-wrap gap-2">
        {STAGE_GUIDES.map((guide) => (
          <a key={guide.id} href={`#${guide.id}`} className="min-h-11 rounded-full border border-ink/50 bg-card px-4 py-2 text-base font-medium text-ink">
            {STAGE_NAME[guide.id]}
          </a>
        ))}
      </nav>

      <ol className="mt-6 grid gap-4">
        {STAGE_GUIDES.map((guide) => (
          <li key={guide.id} id={guide.id} className="scroll-mt-24">
            <Card>
              <p className="text-base font-semibold text-muted">{guide.ages}</p>
              <h2 className="font-display text-3xl font-medium text-ink">{STAGE_NAME[guide.id]}</h2>
              <p className="mt-1 text-lg leading-relaxed text-ink">{guide.line}</p>
              <ul className="mt-3 grid list-disc gap-1.5 pl-6 text-base leading-relaxed text-ink">
                {guide.notice.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 rounded-2xl bg-paper-deep px-4 py-3 text-base leading-relaxed text-ink">
                <span className="font-semibold">A question worth asking: </span>
                {guide.ask.question}
              </p>
              <Verify who={guide.ask.who} />
              <Link to={guide.start.to} className={`${QUIET_LINK} mt-4`}>
                {guide.start.label}
              </Link>
            </Card>
          </li>
        ))}
      </ol>

      <Heading>koa in short</Heading>
      <div className="mt-3 grid gap-3">
        {KOA_IN_SHORT.map((item) => (
          <Card key={item.title}>
            <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
            <p className="mt-1 text-base leading-relaxed text-ink">{item.body}</p>
          </Card>
        ))}
      </div>
      <GeneralInfo />
    </Screen>
  );
}
