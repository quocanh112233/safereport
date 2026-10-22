import { importJWK, SignJWT, calculateJwkThumbprint, exportJWK, generateKeyPair } from "jose";

export const SIMULATED_PUBLIC_JWK = {
  kty: "EC",
  x: "Sm92DLgRBEfYK0rrK0LBIAaS_UYvLKdJ5S8AQycG7YQ",
  y: "2MPy9CIuwibqKdecn7AL5tGQ5-x1RRZ1qEOO1r58sMM",
  crv: "P-256",
  kid: "simulated-realm-key-1",
  use: "sig",
  alg: "ES256",
} as const;

export const SIMULATED_PRIVATE_JWK = {
  kty: "EC",
  x: "Sm92DLgRBEfYK0rrK0LBIAaS_UYvLKdJ5S8AQycG7YQ",
  y: "2MPy9CIuwibqKdecn7AL5tGQ5-x1RRZ1qEOO1r58sMM",
  crv: "P-256",
  d: "ioNF44BEDqDexmrbRmUCRZXUuvMN_YrawknkV3odmNA",
  kid: "simulated-realm-key-1",
  use: "sig",
  alg: "ES256",
} as const;

export interface SimulatedUser {
  userId: string;
  name: string;
  role: "reporter" | "auditor";
  tideRoles: string[];
}

export const SIMULATED_USERS: Record<string, SimulatedUser> = {
  alice: {
    userId: "alice-report-sender",
    name: "Alice (Reporter)",
    role: "reporter",
    tideRoles: ["_tide_enabled", "_tide_vault.selfencrypt"],
  },
  bob: {
    userId: "bob-incident-auditor",
    name: "Bob (Auditor)",
    role: "auditor",
    tideRoles: ["_tide_enabled", "_tide_vault.selfdecrypt"],
  },
};

export async function createSimulatedToken(
  user: SimulatedUser,
  dpopPublicKey: any,
  issuer: string = "http://localhost:8080/realms/safereport",
  resource: string = "safereport"
): Promise<string> {
  const privateKey = await importJWK(SIMULATED_PRIVATE_JWK, "ES256");
  const jkt = await calculateJwkThumbprint(dpopPublicKey);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: user.userId,
    name: user.name,
    azp: resource,
    cnf: { jkt },
    realm_access: {
      roles: user.tideRoles,
    },
    resource_access: {
      [resource]: {
        roles: user.tideRoles,
      },
    },
  })
    .setProtectedHeader({ alg: "ES256", kid: SIMULATED_PRIVATE_JWK.kid, typ: "JWT" })
    .setIssuer(issuer)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}
