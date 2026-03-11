import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isEduEmail } from "@subletto/shared";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/access-denied(.*)",
  "/listings(.*)",       // public browse + detail + confirm
  "/waitlist(.*)",       // pre-launch waitlist page
  "/testimonial(.*)",    // public testimonial submission
  "/flyer(.*)",          // print-ready campus flyer
  "/api/webhooks(.*)",
  "/api/waitlist(.*)",   // public waitlist API
  "/api/testimonial(.*)",// public testimonial API
  "/api/cron(.*)",       // secured by CRON_SECRET, not Clerk
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, sessionClaims } = await auth();

  // Not signed in — redirect to sign-in
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // .edu gate — check email from session claims
  const email = (sessionClaims?.email as string | undefined) ?? "";
  if (email && !isEduEmail(email)) {
    return NextResponse.redirect(new URL("/access-denied", req.url));
  }

  // Admin route guard — role checked server-side in the page itself
  // (middleware doesn't have DB access; the page will redirect non-admins)
  void isAdminRoute; // explicitly unused here; guarded in page
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
