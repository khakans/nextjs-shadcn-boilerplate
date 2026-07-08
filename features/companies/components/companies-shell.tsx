"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  Building2Icon,
  RefreshCcwIcon,
  SaveIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type {
  Company,
  CompanyInput,
  CompanyStatus,
} from "@/features/companies/api/companies-client";
import { useCompanies } from "@/features/companies/hooks/use-companies";
import type { AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

const maxLogoSize = 5 * 1024 * 1024;
const allowedLogoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const companySchema = z.object({
  address: z
    .string()
    .trim()
    .max(1000, "Address must be 1000 characters or fewer."),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Currency must use a 3-letter ISO code."),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Email is invalid.",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters.")
    .max(150, "Company name must be 150 characters or fewer."),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[+0-9\s().-]{6,30}$/.test(value),
      "Phone number is invalid.",
    ),
  taxNumber: z
    .string()
    .trim()
    .max(80, "Tax number must be 80 characters or fewer."),
  timezone: z.string().trim().min(1, "Timezone is required."),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompaniesShell({ user }: { user: AuthUser }) {
  const companies = useCompanies();

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <PageBreadcrumb items={[{ label: "Companies" }]} />
          </div>
          <div className="ml-auto px-4">
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Company Information
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage the company profile used by this expense
              management workspace.
            </p>
          </div>

          {companies.isLoading ? (
            <CompanyFormSkeleton />
          ) : companies.error ? (
            <CompanyErrorState
              message={companies.error}
              onRetry={companies.loadCompany}
            />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <CompanyForm
                company={companies.company}
                isSaving={companies.isSaving}
                onSave={companies.saveCompanyInfo}
              />
              <CompanySummary company={companies.company} />
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CompanyForm({
  company,
  isSaving,
  onSave,
}: {
  company: Company | null;
  isSaving: boolean;
  onSave: (input: CompanyInput) => Promise<Company | null>;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logo, setLogo] = React.useState<string | null>(company?.logo ?? null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: getCompanyDefaultValues(company),
    mode: "onBlur",
  });
  const {
    formState: { errors, isDirty },
    register,
    reset,
  } = form;
  const companyLogo = company?.logo ?? null;

  React.useEffect(() => {
    reset(getCompanyDefaultValues(company));
  }, [company, reset]);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLogo(companyLogo);
      setLogoError(null);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [companyLogo]);

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    setLogoError(null);

    if (!allowedLogoTypes.has(file.type)) {
      setLogoError("Logo must be JPG, PNG, or WEBP.");
      event.currentTarget.value = "";
      return;
    }

    if (file.size > maxLogoSize) {
      setLogoError("Logo must be 5 MB or smaller.");
      event.currentTarget.value = "";
      return;
    }

    setLogo(await readFileAsDataUrl(file));
    event.currentTarget.value = "";
  }

  async function submitForm(values: CompanyFormValues) {
    await onSave({
      address: values.address.trim() || null,
      currency: values.currency.trim().toUpperCase(),
      email: values.email.trim() || null,
      logo,
      name: values.name.trim(),
      phone: values.phone.trim() || null,
      status: company?.status ?? "ACTIVE",
      taxNumber: values.taxNumber.trim() || null,
      timezone: values.timezone.trim(),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {company ? "Company details" : "Create company information"}
        </CardTitle>
        <CardDescription>
          {company
            ? "Update company identity, tax, and operating defaults."
            : "No company record exists yet. Save this form to create it."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(submitForm)}>
        <CardContent>
          <FieldGroup>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <LogoMark
                logo={logo}
                name={form.getValues("name") || company?.name || "Company"}
                className="size-16 text-lg"
              />
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon />
                  Upload logo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!logo}
                  onClick={() => setLogo(null)}
                >
                  <XIcon />
                  Remove
                </Button>
              </div>
            </div>
            {logoError ? <FieldError>{logoError}</FieldError> : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="company-name">Name</FieldLabel>
                <Input
                  id="company-name"
                  autoComplete="organization"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="company-email">Email</FieldLabel>
                <Input
                  id="company-email"
                  type="email"
                  autoComplete="email"
                  placeholder="finance@example.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                <FieldError>{errors.email?.message}</FieldError>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.phone)}>
                <FieldLabel htmlFor="company-phone">Phone</FieldLabel>
                <Input
                  id="company-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+62 21 555 0100"
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />
                <FieldError>{errors.phone?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.taxNumber)}>
                <FieldLabel htmlFor="company-tax-number">Tax number</FieldLabel>
                <Input
                  id="company-tax-number"
                  placeholder="NPWP / VAT ID"
                  aria-invalid={Boolean(errors.taxNumber)}
                  {...register("taxNumber")}
                />
                <FieldError>{errors.taxNumber?.message}</FieldError>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={Boolean(errors.timezone)}>
                <FieldLabel htmlFor="company-timezone">Timezone</FieldLabel>
                <Input
                  id="company-timezone"
                  placeholder="Asia/Jakarta"
                  aria-invalid={Boolean(errors.timezone)}
                  {...register("timezone")}
                />
                <FieldDescription>
                  Use an IANA timezone, for example Asia/Jakarta.
                </FieldDescription>
                <FieldError>{errors.timezone?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.currency)}>
                <FieldLabel htmlFor="company-currency">Currency</FieldLabel>
                <Input
                  id="company-currency"
                  placeholder="IDR"
                  maxLength={3}
                  aria-invalid={Boolean(errors.currency)}
                  {...register("currency")}
                />
                <FieldDescription>
                  Use ISO 4217, for example IDR.
                </FieldDescription>
                <FieldError>{errors.currency?.message}</FieldError>
              </Field>
            </div>

            <Field data-invalid={Boolean(errors.address)}>
              <FieldLabel htmlFor="company-address">Address</FieldLabel>
              <Textarea
                id="company-address"
                autoComplete="street-address"
                placeholder="Company billing address"
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
              <FieldError>{errors.address?.message}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            type="submit"
            disabled={isSaving || (!isDirty && logo === companyLogo)}
          >
            <SaveIcon />
            {isSaving ? "Saving..." : "Save company"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function CompanySummary({ company }: { company: Company | null }) {
  return (
    <aside className="grid gap-4 xl:self-start">
      <Card>
        <CardHeader>
          <CardTitle>Your company</CardTitle>
          <CardDescription>
            {company
              ? "This is the company profile used by this workspace."
              : "No company record exists yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <LogoMark logo={company?.logo ?? null} name={company?.name ?? "Company"} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {company?.name ?? "Not configured"}
              </p>
              <p className="text-sm text-muted-foreground">
                {company ? (
                  <CompanyStatusBadge status={company.status} />
                ) : (
                  "Save the form to create it."
                )}
              </p>
            </div>
          </div>
          <SummaryItem label="Currency" value={company?.currency ?? "-"} />
          <SummaryItem label="Timezone" value={company?.timezone ?? "-"} />
          <SummaryItem label="Email" value={company?.email ?? "-"} />
          <SummaryItem label="Phone" value={company?.phone ?? "-"} />
          <SummaryItem label="Tax number" value={company?.taxNumber ?? "-"} />
        </CardContent>
      </Card>
    </aside>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t pt-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm">{value}</dd>
    </div>
  );
}

function LogoMark({
  className,
  logo,
  name,
}: {
  className?: string;
  logo: string | null;
  name: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-sm font-semibold text-muted-foreground",
        className,
      )}
      style={
        logo
          ? {
              backgroundImage: `url("${logo}")`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {logo ? (
        <span className="sr-only">{name}</span>
      ) : (
        initials || <Building2Icon />
      )}
    </span>
  );
}

function CompanyStatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "ACTIVE"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}

function CompanyFormSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Skeleton className="h-[620px] rounded-lg" />
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

function CompanyErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-destructive sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <h2 className="text-sm font-medium">Unable to load company</h2>
          <p className="mt-1 text-sm">{message}</p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RefreshCcwIcon />
        Retry
      </Button>
    </div>
  );
}

function getCompanyDefaultValues(company: Company | null): CompanyFormValues {
  return {
    address: company?.address ?? "",
    currency: company?.currency ?? "IDR",
    email: company?.email ?? "",
    name: company?.name ?? "",
    phone: company?.phone ?? "",
    taxNumber: company?.taxNumber ?? "",
    timezone: company?.timezone ?? "Asia/Jakarta",
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read logo file."));
      }
    });
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}
