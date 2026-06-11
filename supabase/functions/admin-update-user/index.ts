import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });

    // Perform the update
    const { targetUserId, email, password } = await req.json();
    if (!targetUserId) return new Response(JSON.stringify({ error: "targetUserId required" }), { status: 400, headers: corsHeaders });

    const updates: { email?: string; password?: string } = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, updates);
    if (updateError) throw new Error(updateError.message);

    // Also update email in profiles table if email changed
    if (email) {
      await supabaseAdmin.from("profiles").update({ email }).eq("id", targetUserId);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" }), { status: 500, headers: corsHeaders });
  }
});
