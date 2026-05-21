import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink px-6 py-12">
      <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/portal" />
    </main>
  );
}
