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
  logoFile?: File | null;
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
  return apiRequest<CompanyResponse>("/company");
}

export function saveCompany(input: CompanyInput) {
  const formData = new FormData();

  appendNullableFormValue(formData, "address", input.address);
  appendNullableFormValue(formData, "email", input.email);
  appendNullableFormValue(formData, "logo", input.logo);
  appendNullableFormValue(formData, "phone", input.phone);
  appendNullableFormValue(formData, "taxNumber", input.taxNumber);
  formData.append("currency", input.currency);
  formData.append("name", input.name);
  formData.append("status", input.status);
  formData.append("timezone", input.timezone);

  if (input.logoFile) {
    formData.append("logoFile", input.logoFile);
  }

  return apiRequest<CompanyResponse>("/company", {
    method: "PATCH",
    body: formData,
  });
}

function appendNullableFormValue(
  formData: FormData,
  key: string,
  value: string | null,
) {
  formData.append(key, value ?? "");
}
