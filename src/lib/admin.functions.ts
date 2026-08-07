import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bootstrapSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

/**
 * One-time admin bootstrap. Succeeds only while the directory has no admin
 * account yet, so it is not a public registration path.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bootstrapSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error("Could not verify admin state");
    if ((count ?? 0) > 0) throw new Error("An admin account already exists");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create admin");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "admin" });
    if (roleError) throw new Error("Could not grant admin role");

    return { ok: true };
  });

export const adminExists = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { exists: (count ?? 0) > 0 };
});