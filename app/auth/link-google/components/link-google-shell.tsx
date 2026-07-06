"use client"

import { GalleryVerticalEndIcon, LinkIcon } from "lucide-react"
import Link from "next/link"

import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { apiPath } from "@/lib/api-paths"
import { getMessages } from "@/lib/i18n"
import { useLanguagePreference } from "@/lib/theme"

export function LinkGoogleShell({ email }: { email: string }) {
  const { language } = useLanguagePreference()
  const t = getMessages(language)

  return (
    <div className="flex min-h-svh flex-col gap-4 p-6 md:p-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          Expensesman
        </Link>
        <LanguageSwitcher />
      </div>
      <main className="flex flex-1 items-center justify-center">
        <section className="w-full max-w-sm space-y-6 rounded-lg border bg-background p-6 shadow-sm">
          <div className="space-y-2 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LinkIcon className="size-5" />
            </div>
            <h1 className="text-2xl font-bold">{t.linkGoogleTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {t.linkGoogleDescriptionBefore}{" "}
              <span className="font-medium text-foreground">{email}</span>{" "}
              {t.linkGoogleDescriptionAfter}
            </p>
          </div>
          <div className="grid gap-2">
            <form action={apiPath("/auth/google/link")} method="post">
              <input type="hidden" name="intent" value="link" />
              <Button type="submit" className="w-full">
                {t.linkGoogleButton}
              </Button>
            </form>
            <form action={apiPath("/auth/google/link")} method="post">
              <input type="hidden" name="intent" value="cancel" />
              <Button type="submit" variant="outline" className="w-full">
                {t.linkGoogleCancel}
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}
