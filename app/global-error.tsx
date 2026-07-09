"use client";

import * as React from "react";

import { ErrorPageShell } from "@/components/error-page-shell";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorPageShell onRetry={reset} requestId={error.digest} />
      </body>
    </html>
  );
}
