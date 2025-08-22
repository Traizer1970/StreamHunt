// /src/guards/redirect-if-logged.js
import { supabase } from "@/lib/supabase";

export async function redirectIfLoggedToApp() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    const onLanding =
      !location.hash || location.hash === "#/" || location.hash === "#";
    if (session && onLanding) {
      location.replace("#/hunts");
    }
  } catch {
    // silencioso
  }
}
