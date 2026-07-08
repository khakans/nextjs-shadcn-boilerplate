export type AuditTrailQuery = {
  action?: string;
  entityType?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

export function parseAuditTrailQuery(request: Request): AuditTrailQuery {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = parsePageSize(
    url.searchParams.get("pageSize") ?? url.searchParams.get("limit"),
  );

  return {
    action: normalizeQueryValue(url.searchParams.get("action")),
    entityType: normalizeQueryValue(url.searchParams.get("entityType")),
    status: normalizeQueryValue(url.searchParams.get("status")),
    dateFrom: parseDate(url.searchParams.get("dateFrom")),
    dateTo: parseDate(url.searchParams.get("dateTo")),
    page,
    pageSize,
  };
}

function normalizeQueryValue(value: string | null) {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : undefined;
}

function parsePage(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(Math.trunc(parsed), 1);
}

function parsePageSize(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

function parseDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}
