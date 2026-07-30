import { readDoc, writeDoc } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const memory = await readDoc("profile", {});
    return Response.json({ success: true, memory });
  } catch {
    return Response.json({ success: false, memory: {} });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const memory = await readDoc<Record<string, any>>("profile", {});
    const updated = { ...memory, ...body };
    await writeDoc("profile", updated);
    return Response.json({ success: true, memory: updated });
  } catch {
    return Response.json({ success: false });
  }
}
