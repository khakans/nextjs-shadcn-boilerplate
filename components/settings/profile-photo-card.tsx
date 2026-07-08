"use client";

import * as React from "react";
import { CameraIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deleteAvatar,
  uploadAvatar,
} from "@/features/profile/api/profile-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

import { getUserInitials, type ProfileSettingsUser } from "./settings-utils";

const maxAvatarSize = 5 * 1024 * 1024;
const allowedAvatarTypes = new Set(["image/jpeg", "image/png"]);

type ProfilePhotoCardProps = {
  onUserChange: (user: ProfileSettingsUser) => void;
  user: ProfileSettingsUser;
};

export function ProfilePhotoCard({
  onUserChange,
  user,
}: ProfilePhotoCardProps) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!allowedAvatarTypes.has(file.type)) {
      toast.error(t.avatarInvalidType);
      input.value = "";
      return;
    }

    if (file.size > maxAvatarSize) {
      toast.error(t.avatarMaxSize);
      input.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return objectUrl;
    });
    setIsPending(true);

    try {
      const payload = await uploadAvatar(file);
      onUserChange(payload.user);
      toast.success(t.avatarChanged);
    } catch (error) {
      setPreviewUrl(null);
      toast.error(getApiErrorMessage(error, t.avatarChangeFailed));
    } finally {
      setIsPending(false);
      input.value = "";
    }
  }

  async function handleRemovePhoto() {
    setIsPending(true);

    try {
      const payload = await deleteAvatar();
      setPreviewUrl(null);
      onUserChange(payload.user);
      toast.success(t.avatarRemoved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.avatarRemoveFailed));
    } finally {
      setIsPending(false);
    }
  }

  const avatarSrc = previewUrl ?? user.avatarUrl ?? "";

  return (
    <Card id="profile-photo">
      <CardHeader>
        <CardTitle>{t.profilePhotoTitle}</CardTitle>
        <CardDescription>
          {t.profilePhotoDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar className="size-28 text-3xl">
              <AvatarImage src={avatarSrc} alt={user.name} />
              <AvatarFallback className="text-3xl">
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              size="icon"
              className="absolute right-0 bottom-0 rounded-full shadow-sm"
              aria-label={t.uploadProfilePhoto}
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              <CameraIcon />
            </Button>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="break-words text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
              >
                <UploadIcon />
                {isPending ? t.uploading : t.upload}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending || (!user.avatarUrl && !previewUrl)}
                onClick={handleRemovePhoto}
              >
                <Trash2Icon />
                {t.remove}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.avatarFileHelp}
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
