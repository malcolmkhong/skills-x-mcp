import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Don't expose Supabase error messages to the client
      console.error("[Auth/Logout] Supabase signOut error:", error.message);
      return NextResponse.json(
        { error: "Failed to sign out. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Auth/Logout] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during sign out" },
      { status: 500 }
    );
  }
}
