"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/features/profile/api/profile-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

import type { ProfileSettingsUser } from "./settings-utils";

export function DangerZoneCard({ user }: { user: ProfileSettingsUser }) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const confirmationTarget = user.username ?? user.email;
  const canDelete = confirmation === confirmationTarget;

  async function handleDeleteAccount() {
    if (!canDelete) {
      return;
    }

    setIsPending(true);

    try {
      await deleteAccount();
      toast.success(t.accountDeletedLogout);
      setIsOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.deleteAccountFailed));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card id="danger-zone" className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2Icon className="size-4" />
          {t.profileNavDangerZone}
        </CardTitle>
        <CardDescription>
          {t.dangerZoneDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium">{t.deleteAccount}</h3>
            <p className="text-sm text-muted-foreground">
              {t.deleteAccountDescription}
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            className="w-fit"
            onClick={() => {
              setConfirmation("");
              setIsOpen(true);
            }}
          >
            <Trash2Icon />
            {t.deleteAccount}
          </Button>
        </div>

        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteAccountQuestion}</AlertDialogTitle>
              <AlertDialogDescription>
                {t.deleteAccountTypeToConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Field>
              <FieldLabel htmlFor="delete-account-confirmation">
                {t.typeValue} {confirmationTarget}
              </FieldLabel>
              <Input
                id="delete-account-confirmation"
                value={confirmation}
                autoComplete="off"
                disabled={isPending}
                onChange={(event) => setConfirmation(event.target.value)}
              />
              <FieldDescription>
                {t.deleteAccountExactMatch}
              </FieldDescription>
            </Field>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={!canDelete || isPending}
                onClick={handleDeleteAccount}
              >
                {isPending ? t.deleteAccountPending : t.deleteAccount}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
