import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { verifySession } from "@/lib/auth/dal";
import { getSearchDetail, safeExternalUrl } from "@/features/search/detail";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Qidiruv natijasi", robots: { index: false, follow: false } };

export default async function SearchDetailPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { userId } = await verifySession();
  const { kind, id } = await params;
  const item = await getSearchDetail(userId, kind, id);
  if (!item) notFound();
  const url = safeExternalUrl(item.url);
  return (
    <div className="space-y-6">
      <Link href="/search" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Qidiruvga qaytish</Link>
      <PageHeader title={item.title}>
        <Link href={item.section} className={buttonVariants({ variant: "outline" })}>Bo'limni ochish</Link>
      </PageHeader>
      <Card><CardContent className="space-y-6 pt-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          {item.fields.map((field) => <div key={field.label}><dt className="text-sm text-muted-foreground">{field.label}</dt><dd className="mt-1 break-words font-medium">{field.value}</dd></div>)}
        </dl>
        {item.content && <p className="whitespace-pre-wrap break-words leading-relaxed">{item.content}</p>}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}><ExternalLink className="size-4" /> Manbani ochish</a>}
      </CardContent></Card>
      {item.entries?.map((entry, index) => <Card key={index}><CardContent className="space-y-2 pt-6"><h2 className="break-words font-semibold">{entry.title}</h2><p className="whitespace-pre-wrap break-words text-muted-foreground">{entry.content}</p></CardContent></Card>)}
    </div>
  );
}
