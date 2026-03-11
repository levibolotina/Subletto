/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@subletto/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};
export default nextConfig;
