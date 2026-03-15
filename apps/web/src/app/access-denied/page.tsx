import { Lock } from "lucide-react";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-4 py-16 text-center">
      <Lock className="h-12 w-12 text-slate-400" />
      <h1 className="mt-6 text-3xl font-extrabold text-slate-900">
        Access Denied
      </h1>
      <p className="mt-3 max-w-sm text-slate-500">
        Subletto is exclusively for students with a valid{" "}
        <strong>.edu</strong> email address. Please sign up with your
        university email to continue.
      </p>
      <a
        href="/sign-up"
        className="mt-8 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Sign up with .edu email →
      </a>
    </main>
  );
}
