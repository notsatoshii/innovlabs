// /app has no content of its own; the profile tab is the home screen.

import { redirect } from "next/navigation";

export default function AppIndexPage() {
  redirect("/app/profile");
}
