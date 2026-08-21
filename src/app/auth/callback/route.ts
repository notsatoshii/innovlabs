// OAuth (Kakao / Google) PKCE callback: exchange the auth code for a session,
// then land on /register?step=finalize to seed the profile.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/register?step=finalize", url.origin));
    }
  }
  return NextResponse.redirect(new URL("/register?error=auth", url.origin));
}
