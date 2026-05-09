import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, authAccounts, authVerificationTokens } from "@/db/schema";
import { authConfig } from "@/auth.config";
import { hashVerificationToken } from "@/lib/auth/token-hash";

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: authAccounts,
  verificationTokensTable: authVerificationTokens,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: {
    ...baseAdapter,
    async createVerificationToken(verificationToken) {
      if (!baseAdapter.createVerificationToken) {
        throw new Error("Adapter does not support createVerificationToken");
      }
      return baseAdapter.createVerificationToken({
        ...verificationToken,
        token: hashVerificationToken(verificationToken.token),
      });
    },
    async useVerificationToken({ identifier, token }) {
      if (!baseAdapter.useVerificationToken) {
        throw new Error("Adapter does not support useVerificationToken");
      }
      return baseAdapter.useVerificationToken({
        identifier,
        token: hashVerificationToken(token),
      });
    },
  },
});
