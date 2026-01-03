import { NextResponse } from "next/server";
import {
  deleteTemplateRevision,
  listTemplateRevisions,
  listTemplateRevisionsFull,
} from "@/src/lib/templateRevisionStorage";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeFull = searchParams.get("full") === "1";
  const revisions = includeFull
    ? await listTemplateRevisionsFull()
    : await listTemplateRevisions();
  return NextResponse.json(revisions);
}

export async function DELETE(request: Request) {
  let payload: { id?: string } | null = null;
  try {
    payload = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON payload." },
      { status: 400 }
    );
  }

  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!id.trim()) {
    return NextResponse.json(
      { error: "Revisie id ontbreekt." },
      { status: 400 }
    );
  }

  try {
    const removed = await deleteTemplateRevision(id);
    if (!removed) {
      return NextResponse.json(
        { error: "Revisie niet gevonden." },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Revisie verwijderen mislukt.", error);
    return NextResponse.json(
      { error: "Revisie verwijderen mislukt." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
