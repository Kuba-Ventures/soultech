/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // v1 is the product. Keep old /portal/* and retired v4 root routes alive
    // (no dead bookmarks) by pointing them at their v1 homes.
    return [
      { source: "/portal", destination: "/profile", permanent: false },
      { source: "/portal/onboarding", destination: "/welcome", permanent: false },
      { source: "/portal/chat", destination: "/talk", permanent: false },
      { source: "/portal/reflect", destination: "/talk", permanent: false },
      { source: "/portal/upload", destination: "/import", permanent: false },
      { source: "/portal/memories", destination: "/profile", permanent: false },
      { source: "/portal/settings", destination: "/settings", permanent: false },
      { source: "/portal/:path*", destination: "/profile", permanent: false },
      // Retired v4 root routes → v1 equivalents.
      { source: "/learn", destination: "/profile", permanent: false },
      { source: "/overview", destination: "/profile", permanent: false },
      { source: "/memory", destination: "/profile", permanent: false },
      { source: "/plugin", destination: "/settings", permanent: false },
      { source: "/sources", destination: "/import", permanent: false },
      { source: "/chat", destination: "/talk", permanent: false },
    ];
  },
};

export default nextConfig;
