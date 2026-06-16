import { NextResponse } from "next/server";
import { z } from "zod";

import { isParseError, scanConfig } from "@/lib/scanner";

export const runtime = "nodejs";

const scanRequestSchema = z.object({
  config: z.string().min(1, "Config must not be empty.").max(200_000),
  format: z
    .enum(["claude-desktop", "cursor", "vscode", "unknown", "auto"])
    .optional()
    .default("auto"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const result = scanConfig(parsed.data.config, parsed.data.format);
    return NextResponse.json(result);
  } catch (err) {
    if (isParseError(err)) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json(
      { error: "Unexpected error while scanning the config." },
      { status: 500 },
    );
  }
}
