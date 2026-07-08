"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDownIcon, SaveIcon } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/profile/api/profile-client";
import {
  defaultPhoneCountryCode,
  formatMobileNumber,
  phoneCountryCodes,
  splitMobileNumber,
} from "@/features/profile/lib/phone-country-codes";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

import type { ProfileSettingsUser } from "./settings-utils";

function getPersonalInfoSchema(t: ReturnType<typeof getMessages>) {
  return z.object({
    birthDate: z
      .string()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        t.birthDateValidation,
      ),
    birthPlace: z.string().trim().max(100, t.birthPlaceMax),
    countryCode: z
      .string()
      .refine(
        (value) => phoneCountryCodes.some((option) => option.code === value),
        t.phoneCountryCode,
      ),
    mobileNumber: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^[0-9\s().-]+$/.test(value),
        t.mobileNumberValidation,
      ),
    name: z
      .string()
      .trim()
      .min(2, t.fullNameMin)
      .max(100, t.fullNameMax),
    username: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^[a-zA-Z0-9_]{3,30}$/.test(value),
        t.usernameValidation,
      ),
  });
}

type PersonalInfoFormValues = z.infer<
  ReturnType<typeof getPersonalInfoSchema>
>;

type PersonalInfoFormProps = {
  onUserChange: (user: ProfileSettingsUser) => void;
  user: ProfileSettingsUser;
};

export function PersonalInfoForm({
  onUserChange,
  user,
}: PersonalInfoFormProps) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const personalInfoSchema = React.useMemo(() => getPersonalInfoSchema(t), [t]);
  const form = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: getDefaultValues(user),
    mode: "onBlur",
  });

  React.useEffect(() => {
    form.reset(getDefaultValues(user));
  }, [form, user]);

  async function onSubmit(values: PersonalInfoFormValues) {
    try {
      const payload = await updateProfile({
        birthDate: values.birthDate || null,
        birthPlace: values.birthPlace.trim() || null,
        mobileNumber: formatMobileNumber(
          values.countryCode,
          values.mobileNumber,
        ),
        name: values.name.trim(),
        username: values.username.trim()
          ? values.username.trim().toLowerCase()
          : null,
      });
      onUserChange(payload.user);
      form.reset(getDefaultValues(payload.user));
      toast.success(t.profileChangesSaved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.profileChangesSaveFailed));
    }
  }

  const {
    formState: { errors, isDirty, isSubmitting },
    setValue,
    control,
    register,
  } = form;
  const countryCode = useWatch({
    control,
    name: "countryCode",
  });
  const selectedCountryCode =
    phoneCountryCodes.find((option) => option.code === countryCode)?.code ??
    defaultPhoneCountryCode;

  return (
    <Card id="personal-info">
      <CardHeader>
        <CardTitle>{t.personalInfo}</CardTitle>
        <CardDescription>
          {t.personalInfoDescription}
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="profile-name">{t.fullName}</FieldLabel>
                <Input
                  id="profile-name"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.username)}>
                <FieldLabel htmlFor="profile-username">{t.username}</FieldLabel>
                <Input
                  id="profile-username"
                  autoComplete="username"
                  placeholder={t.usernamePlaceholder}
                  aria-invalid={Boolean(errors.username)}
                  {...register("username")}
                />
                <FieldError>{errors.username?.message}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.birthDate)}>
                <FieldLabel htmlFor="profile-birth-date">
                  {t.birthDate}
                </FieldLabel>
                <Input
                  id="profile-birth-date"
                  type="date"
                  aria-invalid={Boolean(errors.birthDate)}
                  {...register("birthDate")}
                />
                <FieldError>{errors.birthDate?.message}</FieldError>
              </Field>
              <Field data-invalid={Boolean(errors.birthPlace)}>
                <FieldLabel htmlFor="profile-birth-place">
                  {t.birthPlace}
                </FieldLabel>
                <Input
                  id="profile-birth-place"
                  autoComplete="address-level2"
                  placeholder={t.birthPlacePlaceholder}
                  aria-invalid={Boolean(errors.birthPlace)}
                  {...register("birthPlace")}
                />
                <FieldError>{errors.birthPlace?.message}</FieldError>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                data-invalid={Boolean(
                  errors.countryCode || errors.mobileNumber,
                )}
              >
                <FieldLabel htmlFor="profile-mobile-number">
                  {t.mobileNumber}
                </FieldLabel>
                <div className="grid grid-cols-[104px_minmax(0,1fr)]">
                  <input type="hidden" {...register("countryCode")} />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between rounded-r-none border-r-0"
                          aria-label={t.phoneCountryCode}
                        />
                      }
                    >
                      {selectedCountryCode}
                      <ChevronDownIcon data-icon="inline-end" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72">
                      <DropdownMenuRadioGroup
                        value={selectedCountryCode}
                        onValueChange={(value) =>
                          setValue("countryCode", value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        {phoneCountryCodes.map((option) => (
                          <DropdownMenuRadioItem
                            key={option.code}
                            value={option.code}
                          >
                            <span className="min-w-12 font-medium">
                              {option.code}
                            </span>
                            <span className="truncate text-muted-foreground">
                              {option.country}
                            </span>
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Input
                    id="profile-mobile-number"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={t.mobileNumberPlaceholder}
                    className="rounded-l-none border-l"
                    aria-invalid={Boolean(errors.mobileNumber)}
                    {...register("mobileNumber")}
                  />
                </div>
                <FieldDescription>
                  {t.phoneStoredWithCountryCode}
                </FieldDescription>
                <FieldError>
                  {errors.countryCode?.message ?? errors.mobileNumber?.message}
                </FieldError>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            <SaveIcon />
            {isSubmitting ? t.saveProfileDetailsPending : t.saveChanges}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function getDefaultValues(user: ProfileSettingsUser): PersonalInfoFormValues {
  const mobileNumber = splitMobileNumber(user.mobileNumber);

  return {
    birthDate: user.birthDate ?? "",
    birthPlace: user.birthPlace ?? "",
    countryCode: mobileNumber.countryCode,
    mobileNumber: mobileNumber.localNumber,
    name: user.name,
    username: user.username ?? "",
  };
}
