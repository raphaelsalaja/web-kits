import { NextResponse } from "next/server";
import { getPatchJson, patches } from "@/lib/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return patches.map(({ name }) => ({ name }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const json = getPatchJson(name);
  if (!json) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(json);
}
