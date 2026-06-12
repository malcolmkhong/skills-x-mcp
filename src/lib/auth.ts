import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";

// Generate a stable NEXTAUTH_SECRET for development if not set
const nextAuthSecret =
  process.env.NEXTAUTH_SECRET ||
  "industryx-dev-secret-change-in-production-2024";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  providers: [
    // GitHub OAuth Provider
    GitHubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),

    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),

    // Demo Credentials Provider (for sandbox testing)
    CredentialsProvider({
      id: "demo",
      name: "Demo Account",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "demo@industryx.io",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Only allow the demo account
        if (
          credentials.email === "demo@industryx.io" &&
          credentials.password === "demo123"
        ) {
          const user = await db.user.findUnique({
            where: { email: "demo@industryx.io" },
          });

          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              role: user.role,
              plan: user.plan,
            };
          }

          throw new Error(
            "Demo user not found. Please run the database seeder first via POST /api/seed"
          );
        }

        throw new Error("Invalid demo credentials");
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  jwt: {
    secret: nextAuthSecret,
  },

  secret: nextAuthSecret,

  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all sign-ins
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // On sign in, add role and plan to the JWT
      if (user) {
        token.role = user.role || "user";
        token.plan = user.plan || "free";
      }

      // On session update, refresh role and plan from the database
      if (trigger === "update" && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.plan = dbUser.plan;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role || "user";
        session.user.plan = token.plan || "free";
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      // Default redirect after sign in
      return baseUrl;
    },
  },

  pages: {
    signIn: "/",
    error: "/",
  },

  debug: process.env.NODE_ENV === "development",
};

export default authOptions;
