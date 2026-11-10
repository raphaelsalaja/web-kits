import { NextResponse } from "next/server";
import { patches } from "@/lib/registry";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    patches.map((patch) => ({
      name: patch.name,
      file: `${patch.name}.json`,
      author: patch.author,
      description: patch.description,
      soundCount: patch.sounds.length,
    })),
  );
}
