"use client";

import * as React from "react";

import { ErrorPageShell } from "@/components/error-page-shell";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorPageShell onRetry={reset} requestId={error.digest} />;
}
