import { useEffect } from "react";
import { validateAuth } from "./auth";

/**
 * React hook to require authentication on a page
 * Redirects to home if user is not authenticated
 * @param {Object} router - Next.js router instance from useRouter()
 * @returns {void}
 */
export function useRequireAuth(router) {
  useEffect(() => {
    validateAuth(router);
  }, [router]);
}
