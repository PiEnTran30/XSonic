import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JobStatusClient } from "./job-status-client";

export default async function JobStatusPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch job data
  const { data: job, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !job) {
    redirect("/dashboard");
  }

  // Check if user owns this job
  if (job.user_id !== user.id) {
    redirect("/dashboard");
  }

  return <JobStatusClient job={job} />;
}

