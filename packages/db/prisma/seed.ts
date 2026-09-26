import { PrismaClient, MembershipRole } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const club = await prisma.club.create({ data: { name: "Riverside Football Club" } });

  const redLions = await prisma.team.create({
    data: { name: "Red Lions", clubId: club.id },
  });
  const blueEagles = await prisma.team.create({
    data: { name: "Blue Eagles", clubId: club.id },
  });

  const playersData = [
    { name: "Alex Carter", email: "alex@example.com", position: "GOALKEEPER", team: redLions, number: 1 },
    { name: "Sam Diaz", email: "sam@example.com", position: "DEFENDER", team: redLions, number: 4 },
    { name: "Jordan Blake", email: "jordan@example.com", position: "MIDFIELDER", team: redLions, number: 8 },
    { name: "Taylor Reed", email: "taylor@example.com", position: "FORWARD", team: redLions, number: 9 },
    { name: "Morgan Lee", email: "morgan@example.com", position: "GOALKEEPER", team: blueEagles, number: 1 },
    { name: "Casey Nolan", email: "casey@example.com", position: "DEFENDER", team: blueEagles, number: 5 },
    { name: "Riley Cruz", email: "riley@example.com", position: "MIDFIELDER", team: blueEagles, number: 10 },
    { name: "Drew Ellis", email: "drew@example.com", position: "FORWARD", team: blueEagles, number: 11 },
  ] as const;

  for (const p of playersData) {
    const account = await prisma.account.create({
      data: { email: p.email, passwordHash: hashPassword("password123") },
    });
    const player = await prisma.playerProfile.create({
      data: {
        accountId: account.id,
        displayName: p.name,
        primaryPosition: p.position,
        status: "ACTIVE",
      },
    });
    await prisma.teamMembership.create({
      data: {
        playerId: player.id,
        teamId: p.team.id,
        role: MembershipRole.PLAYER,
        status: "ACTIVE",
      },
    });
  }

  const venue = await prisma.venue.create({
    data: { name: "Riverside Community Pitch", location: "Ground 1" },
  });

  await prisma.match.create({
    data: {
      homeTeamId: redLions.id,
      awayTeamId: blueEagles.id,
      venueId: venue.id,
      status: "SCHEDULED",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete:");
  console.log(`  Club: ${club.name}`);
  console.log(`  Teams: ${redLions.name}, ${blueEagles.name}`);
  console.log(`  Players: ${playersData.length} (login with any seeded email + password123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
