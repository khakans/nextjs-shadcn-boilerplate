"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  getCompany,
  saveCompany,
  type Company,
  type CompanyInput,
} from "@/features/companies/api/companies-client";
import { getApiErrorMessage } from "@/lib/api/http-client";

export function useCompanies() {
  const [company, setCompany] = React.useState<Company | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function loadInitialCompany() {
      try {
        const payload = await getCompany();

        if (isMounted) {
          setCompany(payload.company);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, "Failed to load company."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialCompany();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadCompany() {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await getCompany();
      setCompany(payload.company);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Failed to load company."));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCompanyInfo(input: CompanyInput) {
    setIsSaving(true);

    try {
      const payload = await saveCompany(input);

      if (payload.company) {
        setCompany(payload.company);
      }

      toast.success("Company information saved.");

      return payload.company;
    } catch (saveError) {
      toast.error(
        getApiErrorMessage(saveError, "Failed to save company information."),
      );
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    company,
    error,
    isLoading,
    isSaving,
    loadCompany,
    saveCompanyInfo,
  };
}
