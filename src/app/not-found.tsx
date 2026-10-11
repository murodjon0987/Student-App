import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-bold">Sahifa yoki yozuv topilmadi</h1>
      <p className="text-muted-foreground">Havola eskirgan, yozuv o'chirilgan yoki sizga tegishli bo'lmasligi mumkin.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/search" className={buttonVariants()}>Qidiruvga qaytish</Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>Bosh sahifa</Link>
      </div>
    </div>
  );
}
