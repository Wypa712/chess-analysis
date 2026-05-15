import Groq from "groq-sdk";

// P0-3: module-level client so HTTP connections are reused across warm serverless invocations
export const groq = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;
