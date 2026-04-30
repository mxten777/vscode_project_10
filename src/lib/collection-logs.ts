import type { SupabaseClient } from "@supabase/supabase-js";

export type CollectionJobType =
  | "tenders"
  | "awards"
  | "backfill_awards"
  | "analysis_rebuild"
  | "alerts"
  | "participants"
  | "cleanup";

type CollectionJobUpdate = {
  status?: "running" | "success" | "failed";
  finished_at?: string;
  records_collected?: number;
  total_pages?: number;
  last_page_no?: number;
  error_message?: string;
};

export async function startCollectionJob(
  supabase: SupabaseClient,
  jobType: CollectionJobType
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("collection_logs")
      .insert({ job_type: jobType, status: "running" })
      .select("id")
      .single();

    return data?.id ?? null;
  } catch {
    return null;
  }
}

export async function finishCollectionJob(
  supabase: SupabaseClient,
  logId: string | null,
  recordsCollected = 0,
  extraUpdates?: Omit<CollectionJobUpdate, "status" | "finished_at" | "error_message">
) {
  if (!logId) return;

  try {
    await updateCollectionJob(supabase, logId, {
        status: "success",
        finished_at: new Date().toISOString(),
        records_collected: recordsCollected,
        ...extraUpdates,
      });
  } catch {
    // Logging must not break the cron job itself.
  }
}

export async function failCollectionJob(
  supabase: SupabaseClient,
  logId: string | null,
  errorMessage: string,
  extraUpdates?: Omit<CollectionJobUpdate, "status" | "finished_at" | "records_collected">
) {
  if (!logId) return;

  try {
    await updateCollectionJob(supabase, logId, {
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: errorMessage,
        ...extraUpdates,
      });
  } catch {
    // Logging must not break the cron job itself.
  }
}

export async function updateCollectionJob(
  supabase: SupabaseClient,
  logId: string | null,
  updates: CollectionJobUpdate
) {
  if (!logId) return;

  await supabase.from("collection_logs").update(updates).eq("id", logId);
}