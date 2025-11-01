import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ Supabase env vars missing:", {
      hasUrl: !!url,
      hasKey: !!key,
      url: url?.substring(0, 20) + "...",
    });
    throw new Error(
      `Supabase configuration missing. URL: ${!!url}, Key: ${!!key}`
    );
  }

  return createBrowserClient(url, key);
};

