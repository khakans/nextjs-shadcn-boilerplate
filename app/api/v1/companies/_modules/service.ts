import { ApiError } from "@/lib/api-response";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";
import type { CompanyStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  deletePublicFile,
  parseImageDataUrl,
  savePublicFile,
} from "@/lib/storage";

import type { CompanyUpsertRequest } from "./request";

export type CompanyItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  taxNumber: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
};

export async function getCompanyService(request: Request) {
  await requireCompanyUser(request);

  const company = await findSingletonCompany();

  return {
    company: company ? toCompanyItem(company) : null,
  };
}

export async function saveCompanyService(
  input: CompanyUpsertRequest,
  request: Request,
) {
  await requireCompanyUser(request);

  const existingCompany = await findSingletonCompany();
  const preparedInput = await prepareCompanyStorageInput(input);
  let company: Awaited<ReturnType<typeof findSingletonCompany>>;

  try {
    company = existingCompany
      ? await auditAction(auditTrailActions.companyUpdated, () =>
          prisma.company.update({
            where: {
              id: existingCompany.id,
            },
            data: preparedInput,
          }),
        )
      : await auditAction(auditTrailActions.companyCreated, () =>
          prisma.company.create({
            data: preparedInput,
          }),
        );
  } catch (error) {
    if (preparedInput.logo !== input.logo) {
      await deletePublicFile(preparedInput.logo);
    }

    throw error;
  }

  if (existingCompany?.logo && existingCompany.logo !== preparedInput.logo) {
    await deletePublicFile(existingCompany.logo);
  }

  return {
    company: toCompanyItem(company),
  };
}

async function prepareCompanyStorageInput(input: CompanyUpsertRequest) {
  if (!input.logo?.startsWith("data:image/")) {
    return input;
  }

  const image = parseImageDataUrl(input.logo);

  if (!image) {
    return input;
  }

  const logo = await savePublicFile({
    buffer: image.buffer,
    contentType: image.contentType,
    directory: "company/logo",
  });

  return {
    ...input,
    logo,
  };
}

async function requireCompanyUser(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}

function findSingletonCompany() {
  return prisma.company.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });
}

function toCompanyItem(company: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  taxNumber: string | null;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}): CompanyItem {
  return {
    id: company.id,
    name: company.name,
    email: company.email,
    phone: company.phone,
    logo: company.logo,
    address: company.address,
    timezone: company.timezone,
    currency: company.currency,
    taxNumber: company.taxNumber,
    status: company.status,
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}
