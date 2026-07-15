import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The authenticated v1 app surface. Legacy /portal and old v4 routes are
// redirected to their v1 homes in next.config.mjs.
const isProtectedRoute = createRouteMatcher([
  "/profile(.*)",
  "/import(.*)",
  "/welcome(.*)",
  "/talk(.*)",
  "/settings(.*)",
  "/portal(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
