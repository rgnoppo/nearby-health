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

    // Cheap up-front check purely so a normal (non-race) second visit gets a
    // clear error without creating an auth user first. The real guarantee
    // against two concurrent bootstraps both succeeding is the atomic
    // grant_first_admin() call below, not this check.
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

    // Atomic (locked) check-and-insert — see grant_first_admin() migration.
    // If two bootstrap requests race, only one of these calls succeeds; the
    // loser's freshly-created auth user is deleted below so it doesn't sit
    // around with no role attached.
    const { error: roleError } = await supabaseAdmin.rpc("grant_first_admin", {
      _user_id: created.user.id,
    });
    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {
        // Best-effort cleanup — if this also fails, an orphaned auth user
        // with no admin role remains, which is inert (can't sign in to
        // anything privileged) rather than unsafe.
      });
      throw new Error("An admin account already exists");
    }

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