import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { sendMagicLink } from "@/lib/email";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      maxAge: 15 * 60,
      sendVerificationRequest: ({ identifier, url }) => sendMagicLink(identifier, url),
    },
  ],
  pages: { signIn: "/signin", verifyRequest: "/signin/check", error: "/signin" },
  trustHost: true,
});

/** For server components and actions: the signed-in user's id, or a redirect to sign-in. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user.id;
}
