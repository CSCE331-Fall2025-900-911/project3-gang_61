/**
 * Logout utility function
 * Clears all session-related sessionStorage items and optionally redirects
 * @param {Object} router - Next.js router instance (optional)
 * @param {string} redirectPath - Path to redirect to after logout (default: "/")
 */
export function logout(router = null, redirectPath = "/") {
  // Clear all session-related sessionStorage items
  const sessionKeys = [
    "authToken",
    "user",
  ];

  sessionKeys.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from sessionStorage:`, error);
    }
  });

  // Redirect if router is provided
  if (router) {
    router.push(redirectPath);
  }
}

/**
 * Validates user authentication by checking authToken and user in sessionStorage
 * @param {Object} router - Next.js router instance
 * @returns {Object|null} User data if authenticated, null otherwise
 */
export function validateAuth(router) {
  // Check for authToken first (more secure)
  const authToken = sessionStorage.getItem("authToken");
  const storedUser = sessionStorage.getItem("user");

  // Both authToken and user must be present
  if (!authToken || !storedUser) {
    if (router) {
      router.push("/");
    }
    return null;
  }

  // Parse user object
  let userData = null;
  try {
    userData = JSON.parse(storedUser);
  } catch (e) {
    console.error("Error parsing user data from sessionStorage:", e);

    if (router) {
      router.push("/");
    }
    return null;
  }

  return userData;
}
