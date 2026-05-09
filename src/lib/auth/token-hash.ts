import { createHmac } from "crypto";

const envSecret = process.env.AUTH_SECRET;
if (!envSecret) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("AUTH_SECRET environment variable is required");
  }
  console.warn("[auth] AUTH_SECRET is not set — using insecure dev fallback");
}
const secret = envSecret ?? "dev-secret-change-in-production";

export function hashVerificationToken(token: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
