import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-6 py-12">
      <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/portal" />
    </main>
  );
}
