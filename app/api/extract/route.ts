// POST /api/extract — temporary mock until real extraction is wired
// Simulates processing delay and returns success so the UI can advance.

import { NextResponse } from "next/server";

export async function POST() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return NextResponse.json({ ok: true });
}
