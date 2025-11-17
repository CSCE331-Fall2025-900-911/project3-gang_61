import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { validateAuth } from "./auth";

/**
 * React hook to require authentication and role-based access on a page
 * Redirects to home if user is not authenticated or doesn't have access
 * @param {Object} router - Next.js router instance from useRouter()
 * @returns {void}
 */
export function useRequireAuth(router) {
  const pathname = usePathname();

  useEffect(() => {
    // Pass the current pathname for role-based access control
    validateAuth(router, pathname);
  }, [router, pathname]);
}
