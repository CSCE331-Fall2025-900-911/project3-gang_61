/**
 * Logout utility function
 * Clears all session-related sessionStorage items and optionally redirects
 * @param {Object} router - Next.js router instance (optional)
 * @param {string} redirectPath - Path to redirect to after logout (default: "/")
 */
export function logout(router = null, redirectPath = "/") {
  // Clear all session-related sessionStorage items
  const sessionKeys = ["authToken", "user"];

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
 * Role-based access control configuration
 * Defines which roles can access which pages
 */
const ROLE_ACCESS = {
  manager: {
    allowedPages: ["/manager", "/cashier", "/kiosk"],
    description: "Managers can access all pages",
  },
  cashier: {
    allowedPages: ["/cashier", "/kiosk"],
    description: "Cashiers can access all pages except manager page",
  },
  member: {
    allowedPages: ["/kiosk"],
    description: "Members can only access kiosk page",
  },
  guest: {
    allowedPages: ["/kiosk"],
    description: "Guests can only access kiosk page",
  },
};

/**
 * Validates user authentication and role-based access by checking authToken, user, and page access
 * @param {Object} router - Next.js router instance
 * @param {string} currentPath - Current page path (e.g., "/manager", "/cashier", "/kiosk")
 * @returns {Object|null} User data if authenticated and authorized, null otherwise
 */
export function validateAuth(router, currentPath = null) {
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

  // If currentPath is provided, check role-based access
  if (currentPath) {
    const userRole = userData.role?.toLowerCase() || "guest";
    const roleConfig = ROLE_ACCESS[userRole];

    // If role is not defined in ROLE_ACCESS, deny access
    if (!roleConfig) {
      alert(
        `Access Denied\n\nYour account has an unrecognized role (${userRole}). Please contact support for assistance.`
      );
      if (router) {
        router.push("/");
      }
      return null;
    }

    // Check if user's role allows access to the current page
    if (!roleConfig.allowedPages.includes(currentPath)) {
      const pageName =
        currentPath === "/manager"
          ? "Manager"
          : currentPath === "/cashier"
          ? "Cashier"
          : currentPath === "/kiosk"
          ? "Kiosk"
          : currentPath;

      alert(
        `Access Denied\n\nYou do not have permission to access the ${pageName} page.\n\n${roleConfig.description}\n\nYou will be redirected to an allowed page.`
      );
      // Redirect to the first allowed page for their role, or home if none
      const redirectPath = roleConfig.allowedPages[0] || "/";
      if (router) {
        router.push(redirectPath);
      }
      return null;
    }
  }

  return userData;
}
