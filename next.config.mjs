/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // The portal IA moved to root-level routes in the v4 rebuild. Keep old
    // /portal/* links alive (no dead bookmarks; app stays deployable).
    return [
      { source: "/portal", destination: "/learn", permanent: false },
      { source: "/portal/chat", destination: "/chat", permanent: false },
      { source: "/portal/reflect", destination: "/chat", permanent: false },
      { source: "/portal/upload", destination: "/sources?tab=upl", permanent: false },
      { source: "/portal/memories", destination: "/memory", permanent: false },
      { source: "/portal/settings", destination: "/settings", permanent: false },
      { source: "/portal/onboarding", destination: "/learn", permanent: false },
      // Anything else under /portal lands on the new home.
      { source: "/portal/:path*", destination: "/learn", permanent: false },
    ];
  },
};

export default nextConfig;
