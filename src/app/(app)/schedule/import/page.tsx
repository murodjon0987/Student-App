import type { Metadata } from "next";
import { verifySession } from "@/lib/auth/dal";
import { ImportView } from "@/features/student-tools/components/import-view";
export const metadata: Metadata = { title: "Jadval importi" };
export default async function Page() { await verifySession(); return <ImportView />; }
