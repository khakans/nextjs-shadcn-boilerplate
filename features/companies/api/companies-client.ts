import { apiRequest } from "@/lib/api/http-client";

export type CompanyStatus = "ACTIVE" | "INACTIVE";

export type Company = {
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

export type CompanyInput = {
  name: string;
  email: string | null;
  phone: string | null;
  logo: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  taxNumber: string | null;
  status: CompanyStatus;
};

type CompanyResponse = {
  company: Company | null;
};

export function getCompany() {
  return apiRequest<CompanyResponse>("/companies");
}

export function saveCompany(input: CompanyInput) {
  return apiRequest<CompanyResponse>("/companies", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}
