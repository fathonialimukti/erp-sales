// =============================================
// USERS — DSD SALES FORCE (Luzon Foods Corp.)
// =============================================
// 1 MD + 1 Finance Manager + 1 Trade Marketing Manager
// + 4 Area Managers (one per region) + 8 Route Supervisors (2 per region)
// + 24 Route Reps (each owns ~12 outlets). All invented PH names.

import { hashSync } from "bcrypt";
import { prisma } from "../../lib/prisma.js";
import { AREAS } from "./regions.js";

const PASSWORD = hashSync("password", 10);

type UserSeed = {
  email: string;
  name: string;
  role: string;
  areaCode?: string;
};

const EXECUTIVES: UserSeed[] = [
  { email: "md@luzonfoods.ph", name: "Ramon Gokongwei Jr.", role: "System Admin" },
  { email: "finance@luzonfoods.ph", name: "Lourdes Tan", role: "System Admin" },
  { email: "trade@luzonfoods.ph", name: "Miguel Santos", role: "System Admin" },
];

const AREA_MANAGERS: UserSeed[] = [
  { email: "am.mnl@luzonfoods.ph", name: "Cristina Ramos", role: "System Admin", areaCode: "MNL-MLA" },
  { email: "am.qcr@luzonfoods.ph", name: "Paolo Villanueva", role: "System Admin", areaCode: "QCR-QC" },
  { email: "am.cam@luzonfoods.ph", name: "Dennis Mercado", role: "System Admin", areaCode: "CAM-CLC" },
  { email: "am.smd@luzonfoods.ph", name: "Angela Bautista", role: "System Admin", areaCode: "SMD-MKT" },
];

const SUPERVISOR_NAMES = [
  "Rodel Pascual", "Maricel Domingo", "Joel Fernandez", "Cynthia Reyes",
  "Arnel Cruz", "Divina Ocampo", "Raffy Lim", "Gina Navarro",
];

const REP_NAMES = [
  "Alvin Santos", "Bong Rivera", "Carlo Mendoza", "Dennis Garcia", "Edgar Flores",
  "Ferdie Torres", "Gilbert Ramos", "Hector Villar", "Ian Salazar", "Jerome Castro",
  "Kevin Aquino", "Leo Bautista", "Marco Dela Cruz", "Nico Santiago", "Omar Gutierrez",
  "Paolo Mercado", "Quinn Fernandez", "Rico Domingo", "Sam Pascual", "Tito Reyes",
  "Uriel Lim", "Vince Navarro", "Willy Ocampo", "Xander Cruz",
];

function buildSupervisors(): UserSeed[] {
  const supervisors: UserSeed[] = [];
  const regionAreas: Record<string, string[]> = {
    MNL: ["MNL-MLA"],
    QCR: ["QCR-QC", "QCR-PTG", "QCR-MRK", "QCR-PSG", "QCR-SJU", "QCR-MDL"],
    CAM: ["CAM-CLC", "CAM-MLB", "CAM-NVT", "CAM-VLZ"],
    SMD: ["SMD-MKT", "SMD-TGG", "SMD-PRQ", "SMD-PSY", "SMD-LPN", "SMD-MTL"],
  };

  let idx = 0;
  for (const [region, areaCodes] of Object.entries(regionAreas)) {
    for (let i = 0; i < 2; i++) {
      const name = SUPERVISOR_NAMES[idx % SUPERVISOR_NAMES.length]!;
      supervisors.push({
        email: `sup.${region.toLowerCase()}.${i + 1}@luzonfoods.ph`,
        name,
        role: "System Admin",
        areaCode: areaCodes[i % areaCodes.length],
      });
      idx += 1;
    }
  }
  return supervisors;
}

function buildReps(): UserSeed[] {
  const reps: UserSeed[] = [];
  // Assign reps round-robin across areas, weighted by outlet count
  const weightedAreas: string[] = [];
  for (const area of AREAS) {
    for (let i = 0; i < Math.ceil(area.outlets / 12); i++) {
      weightedAreas.push(area.code);
    }
  }

  REP_NAMES.forEach((name, idx) => {
    reps.push({
      email: `rep.${name.toLowerCase().replace(/[^a-z]/g, "")}@luzonfoods.ph`,
      name,
      role: "System Admin",
      areaCode: weightedAreas[idx % weightedAreas.length],
    });
  });
  return reps;
}

export async function seedUsers(): Promise<{ userIds: Record<string, string>; repIds: string[] }> {
  console.log("👥 Seeding DSD sales force...");

  const allUsers = [...EXECUTIVES, ...AREA_MANAGERS, ...buildSupervisors(), ...buildReps()];
  const userIds: Record<string, string> = {};
  const repIds: string[] = [];

  for (const user of allUsers) {
    const area = user.areaCode ? await prisma.area.findUnique({ where: { code: user.areaCode } }) : null;
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: PASSWORD,
        areaId: area?.id ?? null,
      },
      create: {
        email: user.email,
        name: user.name,
        password: PASSWORD,
        areaId: area?.id ?? null,
      },
    });
    userIds[user.email] = created.id;
    if (user.email.startsWith("rep.")) repIds.push(created.id);
  }

  console.log(`✓ ${allUsers.length} users (${repIds.length} route reps)`);
  return { userIds, repIds };
}