"use client";

import {
  AlertTriangleIcon,
  GalleryVerticalEndIcon,
  HomeIcon,
  RefreshCcwIcon,
} from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ErrorPageShellProps = {
  onRetry?: () => void;
  requestId?: string;
};

export function ErrorPageShell({ onRetry, requestId }: ErrorPageShellProps) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);

  return (
    <main className="grid min-h-svh place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex w-fit items-center gap-2 font-medium">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </span>
          Expensesman
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangleIcon className="size-5" />
            </div>
            <CardTitle>{t.serverErrorTitle}</CardTitle>
            <CardDescription>{t.serverErrorDescription}</CardDescription>
          </CardHeader>
          {requestId ? (
            <CardContent>
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {t.requestIdLabel}
                </p>
                <p className="mt-1 break-all font-mono text-xs">{requestId}</p>
              </div>
            </CardContent>
          ) : null}
          <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
              href="/"
            >
              <HomeIcon />
              {t.goHome}
            </Link>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                if (onRetry) {
                  onRetry();
                  return;
                }

                window.location.reload();
              }}
            >
              <RefreshCcwIcon />
              {t.tryAgain}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
