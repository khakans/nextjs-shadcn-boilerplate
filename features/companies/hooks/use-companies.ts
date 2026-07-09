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
import type { getMessages } from "@/lib/i18n";

type Messages = ReturnType<typeof getMessages>;

export function useCompanies(t: Messages) {
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
          setError(getApiErrorMessage(loadError, t.companyLoadFailed));
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
  }, [t.companyLoadFailed]);

  async function loadCompany() {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await getCompany();
      setCompany(payload.company);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, t.companyLoadFailed));
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

      toast.success(t.companyInfoSaved);

      return payload.company;
    } catch (saveError) {
      toast.error(
        getApiErrorMessage(saveError, t.companySaveFailed),
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
