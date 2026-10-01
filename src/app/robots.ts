import type { MetadataRoute } from "next";

// robots.txt for the app domain (app.innovlab.me). Only the landing page and
// the fork screen are meant to be found by search; everything after that is
// a personal flow or sits behind sign-in (review P2-33). The marketing site
// (innovlab.me) has its own robots.txt and sitemap.
//
// A Disallow value is a path prefix: "/app" covers every tab under it, and
// "/hagwon" covers /hagwon/result.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/survey",
        "/teaser",
        "/register",
        "/report",
        "/app",
        "/hagwon",
        "/login",
        "/api",
        // Also flow routes: the two waitlist stubs and the OAuth callback.
        "/solo",
        "/student",
        "/auth",
      ],
    },
  };
}
