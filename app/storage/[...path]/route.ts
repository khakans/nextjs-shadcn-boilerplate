import { readPublicFile } from "@/lib/storage";

export const runtime = "nodejs";

type StorageRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: Request, context: StorageRouteContext) {
  const { path } = await context.params;
  const file = await readPublicFile(path.join("/"));

  if (!file) {
    return new Response("Not found.", {
      status: 404,
    });
  }

  return new Response(file.buffer, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": file.contentType,
    },
  });
}
