import { promises as fs } from "fs";
import path from "path";
import { resolveProjectRoot } from "@/src/lib/projectPaths";

type ProjectPayload = {
  projectNumber: string;
  projectName: string;
  contractor: string;
  endCustomer: string;
  siteAddress: string;
};

const dataDir = path.join(resolveProjectRoot(), "data");
const dataFile = path.join(dataDir, "projects.json");

async function readProjects() {
  try {
    const file = await fs.readFile(dataFile, "utf-8");
    return JSON.parse(file);
  } catch (error) {
    return [];
  }
}

async function writeProjects(projects: unknown) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(projects, null, 2), "utf-8");
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ProjectPayload;

  if (
    !payload.projectNumber ||
    !payload.projectName ||
    !payload.contractor ||
    !payload.endCustomer ||
    !payload.siteAddress
  ) {
    return Response.json({ message: "Invalid payload." }, { status: 400 });
  }

  const projects = await readProjects();
  const nextEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...payload,
  };
  projects.push(nextEntry);
  await writeProjects(projects);

  return Response.json(nextEntry, { status: 201 });
}
