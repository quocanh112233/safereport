"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { generateKeyPair, exportJWK, calculateJwkThumbprint, SignJWT } from "jose";
import { SIMULATED_USERS, createSimulatedToken, type SimulatedUser } from "./simulatedKeys";

export interface ActionNotification {
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
  action?: string;
}

export interface TideCloakContextValue {
  isInitializing: boolean;
  initError: Error | null;
  authenticated: boolean;
  sessionExpired: boolean;
  isRefreshing: boolean;
  isLoading: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  needsReauth: boolean;
  token: string | null;
  idToken: string | null;
  tokenExp: number | null;
  baseURL: string;
  IAMService: any;
  AdminAPI: any;
  getConfig: () => Record<string, any>;
  reload: () => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshToken: () => Promise<boolean>;
  forceRefreshToken: () => Promise<boolean>;
  hasRealmRole: (role: string) => boolean;
  hasClientRole: (role: string, resource?: string) => boolean;
  getValueFromToken: (key: string) => any;
  getValueFromIdToken: (key: string) => any;
  triggerReauth: () => void;
  clearReauth: () => void;
  resetWasOffline: () => void;
  doEncrypt: (data: Array<{ data: string; tags?: string[] }>, decryptionPolicy?: Uint8Array) => Promise<string[]>;
  doDecrypt: (data: Array<{ encrypted: string; tags?: string[] }>, decryptionPolicy?: Uint8Array) => Promise<string[]>;
  secureFetch: (url: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>;
  initializeTideRequest: <T extends { encode: () => Uint8Array }>(request: T) => Promise<T>;
  executeTideRequest: (request: any) => Promise<any>;
  // Extra helper for simulation demo switching
  activeUser: SimulatedUser;
  switchUser: (userKey: "alice" | "bob") => void;
}

export const TideCloakContext = createContext<TideCloakContextValue | undefined>(undefined);

// WebCrypto helper to derive vault key bound to user ID
async function getVaultKey(userId: string): Promise<CryptoKey> {
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${userId}::safereport::vault-secret-key-2026`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("safereport-salt-tidecloak-vault-2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function TideCloakProvider({
  config,
  children,
}: {
  config: Record<string, any>;
  children: React.ReactNode;
}) {
  const [currentUserKey, setCurrentUserKey] = useState<"alice" | "bob">(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("safereport_simulated_user");
      if (saved === "bob" || saved === "alice") return saved;
    }
    return "alice";
  });

  const currentUser = SIMULATED_USERS[currentUserKey];

  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("safereport_simulated_auth") !== "false";
    }
    return true;
  });

  const [dpopKeypair, setDpopKeypair] = useState<{
    privateKey: CryptoKey;
    publicKey: any;
    jkt: string;
  } | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [tokenPayload, setTokenPayload] = useState<Record<string, any>>({});
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize ephemeral client DPoP key and token
  useEffect(() => {
    let active = true;

    async function initKeys() {
      try {
        const pair = await generateKeyPair("ES256", { extractable: true });
        const pub = await exportJWK(pair.publicKey);
        const jkt = await calculateJwkThumbprint(pub);

        if (!active) return;
        setDpopKeypair({ privateKey: pair.privateKey, publicKey: pub, jkt });

        const authServerUrl = (config?.["auth-server-url"] || "http://localhost:8080").replace(/\/+$/, "");
        const realm = config?.realm || "safereport";
        const resource = config?.resource || "safereport";
        const issuer = `${authServerUrl}/realms/${realm}`;

        const signedToken = await createSimulatedToken(currentUser, pub, issuer, resource);
        if (!active) return;
        setToken(signedToken);
        setTokenPayload({
          sub: currentUser.userId,
          name: currentUser.name,
          azp: resource,
          realm_access: { roles: currentUser.tideRoles },
          resource_access: { [resource]: { roles: currentUser.tideRoles } },
        });
        setIsInitializing(false);
      } catch (err) {
        console.error("Failed to initialize simulated DPoP keys:", err);
        if (active) setIsInitializing(false);
      }
    }

    initKeys();
    return () => {
      active = false;
    };
  }, [currentUser, config]);

  const switchUser = useCallback((userKey: "alice" | "bob") => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("safereport_simulated_user", userKey);
    }
    setCurrentUserKey(userKey);
    setAuthenticated(true);
  }, []);

  const login = useCallback(async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("safereport_simulated_auth", "true");
    }
    setAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("safereport_simulated_auth", "false");
    }
    setAuthenticated(false);
  }, []);

  const getToken = useCallback(async () => {
    return token;
  }, [token]);

  const hasRealmRole = useCallback(
    (role: string) => {
      return currentUser.tideRoles.includes(role);
    },
    [currentUser]
  );

  const hasClientRole = useCallback(
    (role: string) => {
      return currentUser.tideRoles.includes(role);
    },
    [currentUser]
  );

  const getValueFromToken = useCallback(
    (key: string) => {
      return tokenPayload[key];
    },
    [tokenPayload]
  );

  const getValueFromIdToken = useCallback(
    (key: string) => {
      return tokenPayload[key];
    },
    [tokenPayload]
  );

  // Simulated WebCrypto Vault for doEncrypt
  const doEncrypt = useCallback(
    async (items: Array<{ data: string; tags?: string[] }>): Promise<string[]> => {
      const vaultKey = await getVaultKey(currentUser.userId);
      return Promise.all(
        items.map(async (item) => {
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const encoded = new TextEncoder().encode(item.data);
          const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            vaultKey,
            encoded
          );
          const payload = {
            v: 1,
            user: currentUser.userId,
            tags: item.tags || ["vault"],
            iv: btoa(String.fromCharCode(...iv)),
            ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
          };
          return btoa(JSON.stringify(payload));
        })
      );
    },
    [currentUser.userId]
  );

  // Simulated WebCrypto Vault for doDecrypt
  const doDecrypt = useCallback(
    async (items: Array<{ encrypted: string; tags?: string[] }>): Promise<string[]> => {
      const vaultKey = await getVaultKey(currentUser.userId);
      return Promise.all(
        items.map(async (item) => {
          const parsed = JSON.parse(atob(item.encrypted));
          const iv = Uint8Array.from(atob(parsed.iv), (c) => c.charCodeAt(0));
          const ct = Uint8Array.from(atob(parsed.ct), (c) => c.charCodeAt(0));
          const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            vaultKey,
            ct
          );
          return new TextDecoder().decode(decrypted);
        })
      );
    },
    [currentUser.userId]
  );

  // Client-Side RFC 9449 DPoP Signing for secureFetch
  const secureFetch = useCallback(
    async (urlInput: string | URL | RequestInfo, init: RequestInit = {}): Promise<Response> => {
      if (!dpopKeypair || !token) {
        throw new Error("Simulated DPoP keys are not ready yet.");
      }

      const urlString =
        typeof urlInput === "string"
          ? urlInput
          : urlInput instanceof URL
          ? urlInput.href
          : (urlInput as Request).url;

      const method = (init.method || "GET").toUpperCase();

      // Compute access token hash (ath)
      const tokenHashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token)
      );
      const ath = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      let cleanHtu = urlString;
      try {
        const parsed = new URL(urlString, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        cleanHtu = `${parsed.origin}${parsed.pathname}`;
      } catch {
        cleanHtu = urlString.split("?")[0].split("#")[0];
      }

      const now = Math.floor(Date.now() / 1000);
      const dpopProof = await new SignJWT({
        jti: window.crypto.randomUUID(),
        htm: method,
        htu: cleanHtu,
        iat: now,
        ath,
      })
        .setProtectedHeader({
          alg: "ES256",
          typ: "dpop+jwt",
          jwk: dpopKeypair.publicKey,
        })
        .sign(dpopKeypair.privateKey);

      const headers = new Headers(init.headers);
      headers.set("Authorization", `DPoP ${token}`);
      headers.set("DPoP", dpopProof);

      return fetch(urlInput, {
        ...init,
        headers,
      });
    },
    [dpopKeypair, token]
  );

  const contextValue: TideCloakContextValue = useMemo(
    () => ({
      isInitializing,
      initError: null,
      authenticated,
      sessionExpired: false,
      isRefreshing: false,
      isLoading: false,
      isOffline: false,
      wasOffline: false,
      needsReauth: false,
      token,
      idToken: token,
      tokenExp: Math.floor(Date.now() / 1000) + 3600,
      baseURL: config?.["auth-server-url"] || "http://localhost:8080",
      IAMService: {} as any,
      AdminAPI: {} as any,
      getConfig: () => config,
      reload: () => {
        if (typeof window !== "undefined") window.location.reload();
      },
      login,
      logout,
      getToken,
      refreshToken: async () => true,
      forceRefreshToken: async () => true,
      hasRealmRole,
      hasClientRole,
      getValueFromToken,
      getValueFromIdToken,
      triggerReauth: () => {},
      clearReauth: () => {},
      resetWasOffline: () => {},
      doEncrypt,
      doDecrypt,
      secureFetch,
      initializeTideRequest: async (req) => req,
      executeTideRequest: async () => ({}),
      activeUser: currentUser,
      switchUser,
    }),
    [
      isInitializing,
      authenticated,
      token,
      config,
      login,
      logout,
      getToken,
      hasRealmRole,
      hasClientRole,
      getValueFromToken,
      getValueFromIdToken,
      doEncrypt,
      doDecrypt,
      secureFetch,
      currentUser,
      switchUser,
    ]
  );

  return (
    <TideCloakContext.Provider value={contextValue}>
      {/* Simulation Identity Banner & Switcher */}
      <div
        style={{
          background: "#123524",
          color: "#e8f5e9",
          padding: "6px 16px",
          fontSize: "13px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #2e7d32",
          zIndex: 9999,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600 }}>🛡️ TideCloak Simulated Mode (Autonomous Zero-Knowledge)</span>
          <span style={{ opacity: 0.8 }}>· Active: <strong>{currentUser.name}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>Switch Identity:</span>
          <button
            onClick={() => switchUser("alice")}
            style={{
              background: currentUserKey === "alice" ? "#4caf50" : "#1b5e20",
              color: "#fff",
              border: "1px solid #81c784",
              borderRadius: "4px",
              padding: "2px 8px",
              cursor: "pointer",
              fontWeight: currentUserKey === "alice" ? "bold" : "normal",
            }}
          >
            Alice (Reporter)
          </button>
          <button
            onClick={() => switchUser("bob")}
            style={{
              background: currentUserKey === "bob" ? "#4caf50" : "#1b5e20",
              color: "#fff",
              border: "1px solid #81c784",
              borderRadius: "4px",
              padding: "2px 8px",
              cursor: "pointer",
              fontWeight: currentUserKey === "bob" ? "bold" : "normal",
            }}
          >
            Bob (Auditor)
          </button>
        </div>
      </div>
      {children}
    </TideCloakContext.Provider>
  );
}

export function useTideCloak(): TideCloakContextValue {
  const context = useContext(TideCloakContext);
  if (!context) {
    throw new Error("useTideCloak must be used within a TideCloakProvider");
  }
  return context;
}

// Re-exports to satisfy any other @tidecloak/nextjs / @tidecloak/react consumer
export const TideCloakContextProvider = TideCloakProvider;
export function Authenticated({ children }: { children: React.ReactNode }) {
  const { authenticated } = useTideCloak();
  return authenticated ? <>{children}</> : null;
}
export function Unauthenticated({ children }: { children: React.ReactNode }) {
  const { authenticated } = useTideCloak();
  return !authenticated ? <>{children}</> : null;
}
export function HasRealmRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { hasRealmRole } = useTideCloak();
  return hasRealmRole(role) ? <>{children}</> : null;
}
export function HasClientRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { hasClientRole } = useTideCloak();
  return hasClientRole(role) ? <>{children}</> : null;
}
export function Offline({ children }: { children: React.ReactNode }) {
  return null;
}
export function Online({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function WasOffline({ children }: { children: React.ReactNode }) {
  return null;
}
export function NeedsReauth({ children }: { children: React.ReactNode }) {
  return null;
}
export function AuthLoading({ children }: { children: React.ReactNode }) {
  return null;
}
export const useAuthCallback = () => ({ isProcessing: false, error: null });
export const parseCallbackUrl = () => ({ code: null, state: null });
export const AuthCallback = () => null;
export const SimpleAuthCallback = () => null;
export const RequestEnclave = () => null;
