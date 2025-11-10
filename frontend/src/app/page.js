"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authenticateWithGoogle } from "@/lib/api";
import styles from "./page.module.css";

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const googleSignInButtonRef = useRef(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Handle Google Sign-In success
  const handleGoogleSignInSuccess = useCallback(
    async (credentialResponse) => {
      try {
        setIsLoading(true);
        const { credential } = credentialResponse;

        if (!credential) {
          throw new Error("No credential received from Google");
        }

        // Send the credential (ID token) to the backend for verification
        const response = await authenticateWithGoogle(credential);

        if (response.success && response.user) {
          // Store user info in localStorage
          localStorage.setItem("user", JSON.stringify(response.user));
          localStorage.setItem("user_role", response.user.role);
          localStorage.setItem("token", response.token);

          // Route based on role
          switch (response.user.role) {
            case "manager":
              // Redirect to manager dashboard
              router.push("/manager");
              break;
            case "cashier":
              // Redirect to cashier view
              router.push("/cashier");
              break;
            case "customer":
            default:
              // Redirect to kiosk for regular customers
              router.push("/kiosk");
              break;
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);
        alert(error.message || "Failed to authenticate. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  // Load Google Identity Services script
  useEffect(() => {
    if (!googleClientId) return;

    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts || !googleClientId) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleSignInSuccess,
      });

      // Render sign-in button if ref is available
      if (googleSignInButtonRef.current) {
        // Clear any existing button
        googleSignInButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleSignInButtonRef.current, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: "100%",
        });
      }

      // Optionally show the One Tap prompt
      window.google.accounts.id.prompt();
    };

    // Check if script is already loaded
    if (window.google?.accounts) {
      initializeGoogleSignIn();
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    document.head.appendChild(script);

    return () => {
      // Cleanup is handled by React
    };
  }, [googleClientId, handleGoogleSignInSuccess]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.brand}>Sharetea</h1>
        <p className={styles.subtitle}>Sign in with your Google account to get started.</p>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Authenticating...</p>
          </div>
        ) : (
          <>
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
