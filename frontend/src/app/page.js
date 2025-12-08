"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { authenticateWithGoogle, authenticateWithGitHub } from "@/lib/api";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import styles from "./page.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null); // 'cashier' or 'manager'
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  /**
   * Handle role-based redirect after authentication
   * @param {object} user - The authenticated user object
   * @param {string} requestedRole - The role the user is trying to access ('cashier' or 'manager')
   * @returns {boolean} - Whether the redirect was successful
   */
  const handleRoleBasedRedirect = (user, requestedRole) => {
    const userRole = user.role;

    if (requestedRole === "manager") {
      // Only managers can access manager view
      if (userRole === "manager") {
        router.push("/manager");
        return true;
      } else {
        // Cashiers cannot access manager view
        setError("Access denied. You do not have manager privileges.");
        setIsLoading(false);
        return false;
      }
    } else if (requestedRole === "cashier") {
      // Both managers and cashiers can access cashier view
      if (userRole === "manager" || userRole === "cashier") {
        router.push("/cashier");
        return true;
      } else {
        setError("Access denied. You do not have staff privileges.");
        setIsLoading(false);
        return false;
      }
    }

    // Fallback - should not reach here
    setError("Invalid role selection.");
    setIsLoading(false);
    return false;
  };

  /**
   * Handle GitHub OAuth callback
   */
  useEffect(() => {
    const code = searchParams.get("code");
    const storedRole = sessionStorage.getItem("pendingRole");
    
    console.log("Search params:", {
      code: code,
      storedRole: storedRole,
      allParams: Array.from(searchParams.entries())
    });

    // Process GitHub callback if we have a code
    if (code) {
      console.log("GitHub callback detected with code:", code);
      handleGitHubCallback(code, storedRole);
    }
  }, [searchParams]);

  const handleGitHubCallback = async (code, requestedRole) => {
    console.log("Starting GitHub authentication with code:", code, "for role:", requestedRole);
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Calling authenticateWithGitHub API...");
      const authResponse = await authenticateWithGitHub(code);
      console.log("GitHub auth response:", authResponse);

      if (authResponse.success && authResponse.user) {
        if (authResponse.token) {
          sessionStorage.setItem("authToken", authResponse.token);
        }
        sessionStorage.setItem("user", JSON.stringify(authResponse.user));
        
        // Clean up pending role
        sessionStorage.removeItem("pendingRole");

        // Clean up URL before navigating
        window.history.replaceState({}, document.title, "/");

        // Handle role-based redirect
        if (requestedRole) {
          handleRoleBasedRedirect(authResponse.user, requestedRole);
        } else {
          // Fallback to default behavior if no role was stored
          const role = authResponse.user.role;
          if (role === "manager") {
            router.push("/manager");
          } else if (role === "cashier") {
            router.push("/cashier");
          } else {
            router.push("/kiosk");
          }
        }
      } else {
        throw new Error("Authentication response missing user data");
      }
    } catch (error) {
      console.error("GitHub Sign-In error details:", error);
      setError(error.message);
      // Remove code from URL
      window.history.replaceState({}, document.title, "/");
      sessionStorage.removeItem("pendingRole");
      setIsLoading(false);
    }
  };

  /**
   * Handle GitHub Sign-In button click
   */
  const handleGitHubSignIn = () => {
    // Store the selected role before redirecting to GitHub
    if (selectedRole) {
      sessionStorage.setItem("pendingRole", selectedRole);
    }
    
    const redirectUri = window.location.origin;
    console.log("Redirecting to GitHub with:", {
      clientId: githubClientId,
      redirectUri: redirectUri,
      selectedRole: selectedRole
    });
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    console.log("GitHub auth URL:", githubAuthUrl);
    window.location.href = githubAuthUrl;
  };

  /**
   * Handle Google Sign-In using One Tap
   */
  const handleGoogleSignIn = useCallback(
    async (response) => {
      if (!response.credential) {
        console.error("No credential in Google Sign-In response");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const authResponse = await authenticateWithGoogle(response.credential);

        if (authResponse.success && authResponse.user) {
          if (authResponse.token) {
            sessionStorage.setItem("authToken", authResponse.token);
          }
          sessionStorage.setItem("user", JSON.stringify(authResponse.user));

          // Get the selected role from state or session storage
          const requestedRole = selectedRole || sessionStorage.getItem("pendingRole");
          sessionStorage.removeItem("pendingRole");

          if (requestedRole) {
            handleRoleBasedRedirect(authResponse.user, requestedRole);
          } else {
            // Fallback to default behavior
            const role = authResponse.user.role;
            if (role === "manager") {
              router.push("/manager");
            } else if (role === "cashier") {
              router.push("/cashier");
            } else {
              router.push("/kiosk");
            }
          }
        } else {
          throw new Error("Authentication failed");
        }
      } catch (error) {
        console.error("Google Sign-In error:", error);
        setError("Sign-in failed. Please try again.");
        setIsLoading(false);
      }
    },
    [router, selectedRole]
  );

  /**
   * Handle custom Google button click - Use renderButton instead of prompt
   */
  const handleGoogleButtonClick = () => {
    // Store the selected role before triggering Google sign-in
    if (selectedRole) {
      sessionStorage.setItem("pendingRole", selectedRole);
    }
    
    console.log("Google button clicked, checking if Google is ready:", isGoogleReady);
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        // Create a temporary container for the Google button
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.top = '-9999px';
        document.body.appendChild(tempDiv);
        
        // Render the actual Google button which will trigger properly
        window.google.accounts.id.renderButton(tempDiv, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
        
        // Click the rendered button
        setTimeout(() => {
          const googleBtn = tempDiv.querySelector('div[role="button"]');
          if (googleBtn) {
            googleBtn.click();
          }
          // Clean up after a delay
          setTimeout(() => {
            if (document.body.contains(tempDiv)) {
              document.body.removeChild(tempDiv);
            }
          }, 1000);
        }, 100);
      } catch (error) {
        console.error("Error triggering Google sign-in:", error);
        setError("Failed to open Google sign-in. Please try again.");
      }
    } else {
      console.error("Google Sign-In not initialized");
      setError("Google Sign-In is not ready yet. Please wait a moment and try again.");
    }
  };

  /**
   * Initialize Google Sign-In
   */
  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("Google GSI script loaded");
      if (window.google && window.google.accounts) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false, // Disable FedCM
          });
          setIsGoogleReady(true);
          console.log("Google Sign-In initialized successfully");
        } catch (error) {
          console.error("Error initializing Google Sign-In:", error);
        }
      }
    };

    script.onerror = () => {
      console.error("Failed to load Google GSI script");
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId, handleGoogleSignIn]);

  const handleStaffButtonClick = (role) => {
    setSelectedRole(role);
    setShowStaffLogin(true);
    setError(null);
  };

  const handleBackToMain = () => {
    setShowStaffLogin(false);
    setSelectedRole(null);
    setError(null);
    sessionStorage.removeItem("pendingRole");
  };

  return (
    <div className={styles.page}>
      <div className={styles.accessibilityWrapper}>
        <AccessibilityMenu />
      </div>

      <main className={styles.container}>
        <div className={styles.loginCard}>
          <div className={styles.logoContainer}>
            <Image
              src="/sharetea.png"
              alt="ShareTea"
              width={200}
              height={80}
              className={styles.logo}
              priority
            />
          </div>

          {error && (
            <div className={styles.errorContainer}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Authenticating...</p>
            </div>
          ) : !showStaffLogin ? (
            /* Main selection screen */
            <>
              <p className={styles.subtitle}>
                Select how you would like to continue.
              </p>

              <button
                className={styles.kioskButton}
                onClick={() => {
                  sessionStorage.setItem("authToken", "guest-token");
                  sessionStorage.setItem(
                    "user",
                    JSON.stringify({ role: "guest", email: "guest@sharetea.com" })
                  );
                  router.push("/kiosk");
                }}
              >
                Order as Guest
              </button>

              <div className={styles.divider}>
                <span className={styles.dividerText}>Staff Login</span>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  className={styles.staffLoginButton}
                  style={{ flex: 1 }}
                  onClick={() => handleStaffButtonClick("cashier")}
                >
                  Cashier
                </button>
                <button
                  className={styles.staffLoginButton}
                  style={{ flex: 1 }}
                  onClick={() => handleStaffButtonClick("manager")}
                >
                  Manager
                </button>
              </div>
            </>
          ) : (
            /* Staff OAuth login screen */
            <>
              <p className={styles.subtitle}>
                Sign in to continue as <strong>{selectedRole}</strong>.
              </p>

              {/* Custom Google Sign-In Button */}
              {googleClientId && (
                <button
                  onClick={handleGoogleButtonClick}
                  disabled={!isGoogleReady}
                  className={styles.oauthButton}
                  style={{
                    width: "100%",
                    padding: "12px 24px",
                    backgroundColor: isGoogleReady ? "#ffffff" : "#f5f5f5",
                    color: isGoogleReady ? "#3c4043" : "#9ca3af",
                    border: "1px solid #dadce0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 500,
                    cursor: isGoogleReady ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    transition: "background-color 0.2s, box-shadow 0.2s",
                    marginBottom: "12px",
                    opacity: isGoogleReady ? 1 : 0.6,
                  }}
                  onMouseOver={(e) => {
                    if (isGoogleReady) {
                      e.currentTarget.style.backgroundColor = "#f8f9fa";
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (isGoogleReady) {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  {isGoogleReady ? "Sign in with Google" : "Loading Google..."}
                </button>
              )}

              {/* GitHub Sign-In Button */}
              {githubClientId && (
                <button
                  onClick={handleGitHubSignIn}
                  style={{
                    width: "100%",
                    padding: "12px 24px",
                    backgroundColor: "#24292e",
                    color: "#ffffff",
                    border: "1px solid #24292e",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor = "#1a1e22")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "#24292e")
                  }
                >
                  <svg
                    height="20"
                    width="20"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Sign in with GitHub
                </button>
              )}

              <button
                className={styles.backButton}
                onClick={handleBackToMain}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  // Add login-page class to body on mount, remove on unmount
  useEffect(() => {
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, []);

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <div>Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
