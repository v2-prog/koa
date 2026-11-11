import { createFileRoute } from "@tanstack/react-router";
import { OutLink } from "@/components/out-link";
import { Card, GeneralInfo, Heading, Screen } from "@/components/ui";
import { ROOMS, SHELF_STEPS } from "@/data/rooms";

export const Route = createFileRoute("/rooms")({ component: Rooms });

function Rooms() {
  return (
    <Screen
      side="community"
      kicker="Rooms"
      title="Where koa sits on the Woods shelf"
      intro="koa is a fork of Q units. It carries a small part of each neighbouring project so a household and a group can start in one place."
    >
      <Heading>The jobs, and where each one lives</Heading>
      <ol className="mt-3 grid gap-2">
        {SHELF_STEPS.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-line bg-card px-4 py-3">
            <p className="text-lg font-semibold text-ink">{index + 1}. {step.title}</p>
            <p className="text-base text-muted">Home: {step.where}. In koa: {step.inKoa}.</p>
          </li>
        ))}
      </ol>
      <Heading>The rooms</Heading>
      <ul className="mt-3 grid gap-3">
        {ROOMS.map((room) => (
          <li key={room.id}>
            <Card>
              <h3 className="font-display text-2xl font-medium text-ink">{room.name}</h3>
              <p className="text-base text-muted">{room.host}</p>
              <p className="mt-2 text-base leading-relaxed text-ink">{room.holds}</p>
              <p className="mt-2 text-base leading-relaxed text-muted">{room.rhyme}</p>
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {room.hostUrl !== room.repoUrl && <OutLink href={room.hostUrl}>Open the site</OutLink>}
                <OutLink href={room.repoUrl}>{room.repo}</OutLink>
              </p>
            </Card>
          </li>
        ))}
      </ul>
      <GeneralInfo>Hosts and repositories are the ones those projects name. A live site can move.</GeneralInfo>
    </Screen>
  );
}
