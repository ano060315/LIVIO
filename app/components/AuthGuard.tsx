"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

const publicPaths = ["/login", "/register"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(publicPaths.includes(pathname));

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (publicPaths.includes(pathname)) {
      setAllowed(true);
      return;
    }

    if (!token) {
      setAllowed(false);
      router.replace("/login");
      return;
    }

    apiRequest<{ user: { id: number } }>("/api/auth/me")
      .then(() => setAllowed(true))
      .catch(() => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        setAllowed(false);
        router.replace("/login");
      });
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
