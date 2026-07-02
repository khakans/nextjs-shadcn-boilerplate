"use client"

import { GlobeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getMessages } from "@/lib/i18n"
import {
  useLanguagePreference,
  type LanguagePreference,
} from "@/lib/theme"
import { cn } from "@/lib/utils"

const options: {
  label: string
  value: LanguagePreference
}[] = [
  {
    label: "EN",
    value: "en",
  },
  {
    label: "ID",
    value: "id",
  },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguagePreference()
  const t = getMessages(language)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border bg-background p-1",
        className
      )}
      aria-label={t.language}
    >
      <GlobeIcon className="mx-1 size-4 text-muted-foreground" />
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="xs"
          variant={language === option.value ? "default" : "ghost"}
          onClick={() => setLanguage(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
