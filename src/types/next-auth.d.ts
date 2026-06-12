import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      /** The user's role: user, admin, superadmin */
      role: string;
      /** The user's subscription plan: free, pro, ultra, enterprise */
      plan: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
    plan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: string;
    plan?: string;
  }
}
