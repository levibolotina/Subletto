import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-[calc(100vh-60px)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Join Subletto
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            CU Boulder students only — a <strong>.edu</strong> email is
            required.
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-sm border border-slate-200 rounded-2xl",
              formButtonPrimary:
                "bg-indigo-600 hover:bg-indigo-700 text-sm normal-case font-semibold rounded-xl",
              formFieldInput:
                "rounded-xl border-slate-300 focus:ring-indigo-500 focus:border-indigo-500",
            },
          }}
        />
      </div>
    </main>
  );
}
