/**
 * Logout utility function
 * Clears all session-related localStorage items and optionally redirects
 * @param {Object} router - Next.js router instance (optional)
 * @param {string} redirectPath - Path to redirect to after logout (default: "/")
 */
export function logout(router = null, redirectPath = "/") {
  // Clear all session-related localStorage items
  const sessionKeys = [
    "authToken",
    "user",
    "user_role",
    "member_id",
    "user_id",
    "employee_id",
  ];

  sessionKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  });

  // Redirect if router is provided
  if (router) {
    router.push(redirectPath);
  }
}
