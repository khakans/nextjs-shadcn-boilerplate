import { redirect } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEndIcon, LinkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getGoogleLinkRequest } from "@/lib/auth/google";

export default async function LinkGooglePage() {
  const linkRequest = await getGoogleLinkRequest();

  if (!linkRequest) {
    redirect("/login?authError=google");
  }

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <div className="flex justify-center gap-2 md:justify-start">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          Expensesman
        </Link>
      </div>
      <main className="flex flex-1 items-center justify-center">
        <section className="w-full max-w-sm space-y-6 rounded-lg border bg-background p-6 shadow-sm">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LinkIcon className="size-5" />
            </div>
            <h1 className="text-2xl font-bold">Tautkan akun Google?</h1>
            <p className="text-sm text-muted-foreground">
              Email <span className="font-medium text-foreground">{linkRequest.email}</span>{" "}
              sudah terdaftar. Apakah Anda ingin menautkan akun ini ke Google?
            </p>
          </div>
          <div className="grid gap-2">
            <form action="/api/auth/google/link" method="post">
              <input type="hidden" name="intent" value="link" />
              <Button type="submit" className="w-full">
                Ya, tautkan dan masuk
              </Button>
            </form>
            <form action="/api/auth/google/link" method="post">
              <input type="hidden" name="intent" value="cancel" />
              <Button type="submit" variant="outline" className="w-full">
                Batal
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
