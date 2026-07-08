import { apiRequest } from "@/lib/api/http-client";
import type { PaginationMeta } from "@/lib/pagination";

export type AuditTrailItem = {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  userSessionId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  status: string;
  before: unknown;
  after: unknown;
  changedFields: string[];
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
};

export type AuditTrailUserDetail = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
};

export type AuditTrailSessionDetail = {
  id: string;
  sessionId: string;
  browser: string | null;
  operatingSystem: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  loginAt: string;
  lastActiveAt: string;
  logoutAt: string | null;
  expiredAt: string;
  status: string;
};

export type AuditTrailDetailItem = AuditTrailItem & {
  actorUser: AuditTrailUserDetail | null;
  targetUser: AuditTrailUserDetail | null;
  session: AuditTrailSessionDetail | null;
  request: {
    ipAddress: string | null;
    requestId: string | null;
    userAgent: string | null;
  };
};

type AuditTrailResponse = {
  auditTrails: AuditTrailItem[];
  pagination: PaginationMeta;
};

type AuditTrailDetailResponse = {
  auditTrail: AuditTrailDetailItem;
};

export function getAuditTrails(page = 1, pageSize = 10) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiRequest<AuditTrailResponse>(`/audit-trails?${params.toString()}`);
}

export function getAuditTrail(auditTrailId: string) {
  return apiRequest<AuditTrailDetailResponse>(`/audit-trails/${auditTrailId}`);
}
