import { ErrorPageShell } from "@/components/error-page-shell";

type ServerErrorPageProps = {
  searchParams: Promise<{
    requestId?: string;
  }>;
};

export default async function ServerErrorPage({
  searchParams,
}: ServerErrorPageProps) {
  const { requestId } = await searchParams;

  return <ErrorPageShell requestId={requestId} />;
}
