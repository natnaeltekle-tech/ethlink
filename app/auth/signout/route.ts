import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

async function handleSignOut(req: NextRequest) {
    const redirectUrl = new URL("/auth/login", req.url);

    try {
        const supabase = await createClient();

        // Check if user is logged in
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            await supabase.auth.signOut();
        }
    } catch (err) {
        // Log but never block — the redirect MUST happen
        console.warn("[signout/route] Error during sign out:", err);
    } finally {
        // Always purge the server-side cache
        try {
            revalidatePath("/", "layout");
        } catch {
            // revalidatePath can fail in edge cases, don't block redirect
        }
    }

    // GUARANTEED redirect — even if everything above failed
    return NextResponse.redirect(redirectUrl, { status: 302 });
}

export async function GET(req: NextRequest) {
    return handleSignOut(req);
}

export async function POST(req: NextRequest) {
    return handleSignOut(req);
}
