import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The authenticated app surface (v4 root routes + legacy /portal redirects).
const isProtectedRoute = createRouteMatcher([
  "/learn(.*)",
  "/plugin(.*)",
  "/chat(.*)",
  "/overview(.*)",
  "/memory(.*)",
  "/sources(.*)",
  "/settings(.*)",
  "/import(.*)",
  "/portal(.*)",
]);

// The per-user MCP server authenticates with its own connection token, not a
// Clerk session, so it must never be Clerk-protected.
const isMcpRoute = createRouteMatcher(["/api/mcp(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isMcpRoute(req)) return;
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
