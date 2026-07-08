"use client";

import * as React from "react";
import { BellIcon, CreditCardIcon, ShieldIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldTitle } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

type NotificationPreferences = {
  securityAlerts: boolean;
  productUpdates: boolean;
  monthlySummary: boolean;
};

type PrivacyPreferences = {
  profileDiscoverable: boolean;
  activityVisible: boolean;
};

type BillingSummary = {
  planName: string;
  renewalLabel: string | null;
  status: "active" | "trialing" | "free";
};

const mockNotificationPreferences: NotificationPreferences = {
  securityAlerts: true,
  productUpdates: false,
  monthlySummary: true,
};

const mockPrivacyPreferences: PrivacyPreferences = {
  profileDiscoverable: true,
  activityVisible: false,
};

const mockBillingSummary: BillingSummary = {
  planName: "Free",
  renewalLabel: null,
  status: "free",
};

export function NotificationsCard() {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const [preferences, setPreferences] = React.useState(
    mockNotificationPreferences,
  );

  return (
    <Card id="notifications">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellIcon className="size-4 text-muted-foreground" />
          {t.notifications}
        </CardTitle>
        <CardDescription>
          {t.notificationsDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PreferenceSwitch
          checked={preferences.securityAlerts}
          description={t.securityAlertsDescription}
          disabled
          label={t.securityAlerts}
          onCheckedChange={(checked) =>
            setPreferences((current) => ({
              ...current,
              securityAlerts: checked,
            }))
          }
        />
        <Separator />
        <PreferenceSwitch
          checked={preferences.productUpdates}
          description={t.productUpdatesDescription}
          label={t.productUpdates}
          onCheckedChange={(checked) =>
            setPreferences((current) => ({
              ...current,
              productUpdates: checked,
            }))
          }
        />
        <Separator />
        <PreferenceSwitch
          checked={preferences.monthlySummary}
          description={t.monthlySummaryDescription}
          label={t.monthlySummary}
          onCheckedChange={(checked) =>
            setPreferences((current) => ({
              ...current,
              monthlySummary: checked,
            }))
          }
        />
      </CardContent>
    </Card>
  );
}

export function PrivacyCard() {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const [preferences, setPreferences] = React.useState(mockPrivacyPreferences);

  return (
    <Card id="privacy">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldIcon className="size-4 text-muted-foreground" />
          {t.privacy}
        </CardTitle>
        <CardDescription>
          {t.privacyDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <PreferenceSwitch
          checked={preferences.profileDiscoverable}
          description={t.discoverableProfileDescription}
          label={t.discoverableProfile}
          onCheckedChange={(checked) =>
            setPreferences((current) => ({
              ...current,
              profileDiscoverable: checked,
            }))
          }
        />
        <Separator />
        <PreferenceSwitch
          checked={preferences.activityVisible}
          description={t.visibleActivityDescription}
          label={t.visibleActivity}
          onCheckedChange={(checked) =>
            setPreferences((current) => ({
              ...current,
              activityVisible: checked,
            }))
          }
        />
      </CardContent>
    </Card>
  );
}

export function BillingCard() {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const billing = mockBillingSummary;

  return (
    <Card id="billing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="size-4 text-muted-foreground" />
          {t.billing}
        </CardTitle>
        <CardDescription>
          {t.billingDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">
                {t.freePlan} {t.plan}
              </h3>
              <Badge variant="secondary">{t[billing.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {billing.renewalLabel ?? t.freePlanDescription}
            </p>
          </div>
          <Button type="button" variant="outline" disabled>
            {t.manageBilling}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferenceSwitch({
  checked,
  description,
  disabled,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled ? true : undefined}>
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
