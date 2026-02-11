import { NextRequest, NextResponse } from "next/server";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.xai.local") });

const XAI_API_KEY = process.env.XAI_API_KEY ?? "";
const GROK_URL = "https://api.x.ai/v1/responses";
const MODEL = "grok-4-1-fast-reasoning";

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  const output = data.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output) && output.length > 0) {
    const content = output[0].content as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(content)) {
      const parts = content
        .map((c) => (typeof c.text === "string" ? c.text : ""))
        .filter(Boolean);
      if (parts.length > 0) return parts.join("");
    }
  }
  const choices = data.choices as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(choices) && choices.length > 0) {
    const msg = choices[0].message as Record<string, unknown> | undefined;
    if (msg && typeof msg.content === "string") return msg.content;
  }
  return "";
}

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json({ error: "Missing XAI_API_KEY" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const payload = {
      model: MODEL,
      input: [
        {
          role: "system",
          content: "You are Grok, a highly intelligent, helpful AI assistant.",
        },
        ...messages,
      ],
    };

    const res = await fetch(GROK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error ?? "Grok request failed" }, { status: res.status });
    }

    const text = extractText(data);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Grok API error:", err);
    return NextResponse.json({ error: "Failed to reach Grok" }, { status: 500 });
  }
}
