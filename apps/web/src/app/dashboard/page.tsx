import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user data
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: walletData } = await supabase
    .from("wallets")
    .select("balance_credits")
    .eq("user_id", user.id)
    .single();

  const { count: jobsCount } = await supabase
    .from("jobs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const credits = walletData?.balance_credits || 0;
  const isAdmin = userData?.role === "admin";
  const totalJobs = jobsCount || 0;

  return <DashboardClient user={user} userData={userData} credits={credits} isAdmin={isAdmin} jobsCount={totalJobs} />;
}

