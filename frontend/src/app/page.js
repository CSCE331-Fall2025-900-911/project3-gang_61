"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { authenticateWithGoogle } from "@/lib/api";

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const googleSignInButtonRef = useRef(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  /**
   * Handle Google Sign-In success callback (route to /kiosk by default)
   * This function is called by Google Identity Services when user signs in
   */
  const handleGoogleSignIn = useCallback(
    async (response) => {
      if (!response.credential) {
        console.error("No credential in Google Sign-In response");
        return;
      }

      setIsLoading(true);

      try {
        // Authenticate with backend

        const authResponse = await authenticateWithGoogle(response.credential);

        if (authResponse.success && authResponse.user) {
          // Store token in sessionStorage for future requests
          if (authResponse.token) {
            sessionStorage.setItem("authToken", authResponse.token);
          }

          // Store user info in sessionStorage
          sessionStorage.setItem("user", JSON.stringify(authResponse.user));

          // Route based on user role
          const role = authResponse.user.role;
          if (role === "manager") {
            router.push("/manager");
          } else if (role === "cashier") {
            router.push("/cashier");
          } else {
            // Default to kiosk for customers
            router.push("/kiosk");
          }
        } else {
          throw new Error("Authentication failed");
        }
      } catch (error) {
        console.error("Google Sign-In error:", error);
        alert("Sign-in failed. Please try again.");
        setIsLoading(false);
      }
    },
    [router]
  );

  /**
   * Initialize Google Sign-In button
   * This effect runs when the component mounts
   */
  useEffect(() => {
    if (!googleClientId || !googleSignInButtonRef.current) {
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleSignIn,
        });

        window.google.accounts.id.renderButton(googleSignInButtonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: "100%",
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [googleClientId, handleGoogleSignIn]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.brand}>Sharetea</h1>
        <p className={styles.subtitle}>
          Sign in with your Google account to get started.
        </p>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Authenticating...</p>
          </div>
        ) : (
          <>
            {/* TEMPORARY TESTING BUTTONS - REMOVE WHEN DONE */}
            <div
              style={{
                marginBottom: "24px",
                paddingBottom: "24px",
                borderBottom: "1px solid #e5e5e5",
              }}
            >
              <button
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#f5f5f5",
                  color: "#333",
                  fontSize: "16px",
                }}
                onClick={() => {
                  // Set test auth data for testing purposes
                  sessionStorage.setItem("authToken", "test-token");
                  sessionStorage.setItem(
                    "user",
                    JSON.stringify({ role: "guest", email: "test@test.com" })
                  );
                  router.push("/kiosk");
                }}
              >
                Kiosk
              </button>
              <button
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#f5f5f5",
                  color: "#333",
                  fontSize: "16px",
                }}
                onClick={() => {
                  // Set test auth data for testing purposes
                  sessionStorage.setItem("authToken", "test-token");
                  sessionStorage.setItem(
                    "user",
                    JSON.stringify({
                      role: "cashier",
                      email: "cashier@test.com",
                    })
                  );
                  router.push("/cashier");
                }}
              >
                Cashier
              </button>
              <button
                style={{
                  width: "100%",
                  padding: "12px",
                  marginBottom: "8px",
                  cursor: "pointer",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  background: "#f5f5f5",
                  color: "#333",
                  fontSize: "16px",
                }}
                onClick={() => {
                  // Set test auth data for testing purposes
                  sessionStorage.setItem("authToken", "test-token");
                  sessionStorage.setItem(
                    "user",
                    JSON.stringify({
                      role: "manager",
                      email: "manager@test.com",
                    })
                  );
                  router.push("/manager");
                }}
              >
                Manager
              </button>
            </div>
            {/* END TEMPORARY TESTING BUTTONS */}

            {googleClientId ? (
              <div
                ref={googleSignInButtonRef}
                className={styles.googleSignInContainer}
              ></div>
            ) : (
              <div className={styles.errorContainer}>
                <p className={styles.errorText}>
                  Google Sign-In is not configured. Please contact support.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
