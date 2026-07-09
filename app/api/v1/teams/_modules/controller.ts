import { ApiError, apiCreated, apiOk } from "@/lib/api-response";
import { assertSameOriginOrBearerRequest } from "@/lib/auth/csrf";
import {
  assertApiRateLimit,
  assertGlobalApiRateLimit,
} from "@/lib/auth/rate-limit";

import {
  parseTeamAvailableUserQuery,
  parseTeamListQuery,
  parseTeamMemberRequest,
  parseTeamMemberUpdateRequest,
  parseTeamRequest,
  readJsonBody,
} from "./request";
import {
  addTeamMemberService,
  createTeamService,
  deactivateTeamService,
  getTeamDetailService,
  listTeamAvailableUsersService,
  listTeamsService,
  removeTeamMemberService,
  updateTeamMemberService,
  updateTeamService,
} from "./service";

type TeamRouteContext = {
  params: Promise<{
    teamId: string;
  }>;
};

type TeamMemberRouteContext = {
  params: Promise<{
    memberId: string;
    teamId: string;
  }>;
};

export async function listTeamsController(request: Request) {
  assertGlobalApiRateLimit(request);

  const query = parseTeamListQuery(request);
  const result = await listTeamsService(query, request);

  return apiOk(result);
}

export async function createTeamController(request: Request) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "teams:mutation");

  const body = await readJsonBody(request);
  const parsed = parseTeamRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await createTeamService(parsed.data, request);

  return apiCreated(result);
}

export async function getTeamDetailController(
  request: Request,
  context: TeamRouteContext,
) {
  assertGlobalApiRateLimit(request);

  const { teamId } = await context.params;
  const result = await getTeamDetailService(teamId, request);

  return apiOk(result);
}

export async function listTeamAvailableUsersController(
  request: Request,
  context: TeamRouteContext,
) {
  assertGlobalApiRateLimit(request);

  const { teamId } = await context.params;
  const query = parseTeamAvailableUserQuery(request);
  const result = await listTeamAvailableUsersService(teamId, query, request);

  return apiOk(result);
}

export async function updateTeamController(
  request: Request,
  context: TeamRouteContext,
) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "teams:mutation");

  const { teamId } = await context.params;
  const body = await readJsonBody(request);
  const parsed = parseTeamRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await updateTeamService(teamId, parsed.data, request);

  return apiOk(result);
}

export async function deactivateTeamController(
  request: Request,
  context: TeamRouteContext,
) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "teams:mutation");

  const { teamId } = await context.params;
  const result = await deactivateTeamService(teamId, request);

  return apiOk(result);
}

export async function addTeamMemberController(
  request: Request,
  context: TeamRouteContext,
) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "teams:mutation");

  const { teamId } = await context.params;
  const body = await readJsonBody(request);
  const parsed = parseTeamMemberRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await addTeamMemberService(teamId, parsed.data, request);

  return apiCreated(result);
}

export async function updateTeamMemberController(
  request: Request,
  context: TeamMemberRouteContext,
) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "teams:mutation");

  const { memberId, teamId } = await context.params;
  const body = await readJsonBody(request);
  const parsed = parseTeamMemberUpdateRequest(body);

  if (!parsed.ok) {
    throw new ApiError(parsed.error, 400);
  }

  const result = await updateTeamMemberService(
    teamId,
    memberId,
    parsed.data,
    request,
  );

  return apiOk(result);
}

export async function removeTeamMemberController(
  request: Request,
  context: TeamMemberRouteContext,
) {
  assertSameOriginOrBearerRequest(request);
  assertGlobalApiRateLimit(request);
  assertApiRateLimit(request, "teams:mutation");

  const { memberId, teamId } = await context.params;
  const result = await removeTeamMemberService(teamId, memberId, request);

  return apiOk(result);
}
