import { LoginForm } from "@/components/login-form"
import { GalleryVerticalEndIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

type LoginPageProps = {
  searchParams: Promise<{
    authError?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { authError } = await searchParams

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEndIcon className="size-4" />
            </div>
            Expensesman
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm authError={authError} />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/window.svg"
          alt=""
          fill
          priority
          className="object-contain p-20 opacity-70 dark:invert"
        />
      </div>
    </div>
  )
}
