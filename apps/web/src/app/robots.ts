import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://subletto.co";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listings", "/waitlist"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/onboarding/",
          "/sign-in/",
          "/sign-up/",
          "/access-denied/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
