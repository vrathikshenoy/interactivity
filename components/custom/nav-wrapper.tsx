// This is a Server Component
import { auth } from "@/app/(auth)/auth";

import { Navbar } from "./navbar"; // Import your client component

export async function NavWrapper() {
  // Get the session on the server
  const session = await auth();

  // Pass the user data to the client component
  return <Navbar user={session?.user || null} />;
}
