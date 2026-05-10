import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "GROQ_API_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

type HealthState = "ok" | "degraded";
type CheckState = "ok" | "error" | "missing_vars";

async function checkDb(): Promise<"ok" | "error"> {
  if (!process.env.DATABASE_URL) return "error";

  try {
    const dbCheck = (async () => {
      const { db } = await import("@/db");
      await db.execute(sql`SELECT 1`);
    })();

    await Promise.race([
      dbCheck,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB health check timed out")), 3_000)
      ),
    ]);

    return "ok";
  } catch (error) {
    console.error("[health] DB check failed:", error);
    return "error";
  }
}

export async function GET() {
  const missingVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
  const env: CheckState = missingVars.length === 0 ? "ok" : "missing_vars";
  const db = await checkDb();
  const status: HealthState = env === "ok" && db === "ok" ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      db,
      env,
      missingVars,
      ts: new Date().toISOString(),
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
