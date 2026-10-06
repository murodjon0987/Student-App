import { redirect } from "next/navigation";

import { decrypt, getSessionToken } from "@/lib/auth/session";

export default async function Home() {
  const token = await getSessionToken();
  const session = await decrypt(token);
  redirect(session?.userId ? "/dashboard" : "/login");
}
