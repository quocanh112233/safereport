# SafeReport design

## Scope and direction

An English-language hackathon prototype for sending a confidential text incident report to a chosen person. The user delegated idea and implementation choices, chose locally hosted Docker, supplied the Tide licence email and terms acceptance, requested SafeReport branding, and explicitly chose no additional end-user profile collection.

Alternatives considered: a self-encrypted private journal is simpler but does not deliver reports; a research-data portal adds consent and downstream-use scope; an encrypted two-person reporting inbox gives a complete, demonstrable interaction. The inbox was selected by the agent. The full official brief is still unavailable, so competition eligibility is not asserted.

## Architecture

Next.js App Router with the official Tide Next.js E2EE template's provider, genuine adapter, callback, CSP and byte-identical DPoP relay. The existing licensed, IGA-enabled realm and `vault` roles are reused. No additional dependencies were added for product logic; WebCrypto and Node's filesystem/crypto implement the application-specific parts.

Tide's encrypted-communication reference describes protecting long-lived application private keys through self-encryption and using browser cryptography for delivery. SafeReport uses that hybrid mechanism for asynchronous report messages. It does not use the reference's optional streaming, room-membership or forward-secrecy features.

### Identity

1. User signs in through TideCloak.
2. Protected `/api/identity` returns only that account's encrypted private key, or a requested other account's public key and fingerprint.
3. On first setup, browser generates a 3072-bit RSA-OAEP/SHA-256 keypair; Tide self-encrypts its private JWK with tag `vault` before upload.
4. Registration is immutable. It cannot silently overwrite an existing account's key and lose report access.
5. On unlock, Tide decrypts the private JWK into page state; the browser verifies its public component matches the registered fingerprint. No plaintext key is persisted to localStorage or disk.

### Delivery

1. Recipient independently shares account ID and SHA-256 SPKI fingerprint.
2. Sender enters those details. Browser imports the returned public key and calculates its fingerprint rather than trusting the server's fingerprint string.
3. Browser generates a fresh AES-256-GCM key and 96-bit IV. The encrypted plaintext contains title and message.
4. Additional authenticated data binds version, report UUID, sender ID and recipient ID. The content key is wrapped twice, for sender and recipient.
5. `/api/reports` validates the envelope, enforces the authenticated sender, checks registered accounts and saves ciphertext with routing metadata.
6. Listing returns only reports addressed to or sent by the current account. Decryption occurs only in the browser. Locking, signing out or leaving the report view removes displayed plaintext from app state.

### Authentication and data boundaries

APIs use `withAuth`: embedded-JWK JWT verification, issuer/client/required-claim checks, and DPoP proof/token binding. On this directly exposed localhost app, forwarded headers are not trusted for proof URLs. A deployment behind a proxy requires an explicit reviewed origin configuration.

New report routes accept bounded JSON bodies and structured base64 envelopes; plaintext report fields are rejected. File names use server-validated UUIDs or hashes of verified account IDs. Writes refuse existing files. Missing stores return empty results; corrupt stores throw instead of being silently replaced.

Local storage is an explicit demo limit: a single instance, whole-list reads and process-local replay cache. Request quotas, pagination and distributed coordination remain prerequisites for public operation.

## Trust model

Protected: report contents against database-only disclosure when the chosen fingerprint was independently verified; encrypted private-key storage gated by Tide; API access against unauthenticated requests and token-only replay within one process.

Not protected: pseudonymous metadata, availability, unauthorized recipients gaining access through the user's wrong fingerprint choice, compromised browsers or app JavaScript, an authorized recipient sharing plaintext, or a malicious server inventing a report. Sender attribution relies on the authenticated API, not an end-to-end sender signature. There is no forward secrecy, instant revocation or independently audited cryptographic protocol.

Removing a stored record or locking the workspace cannot revoke another person's already-decrypted copy. Do not claim otherwise.

## UI contract

Use the selected dark green SafeReport mark, warm light background and editorial typography with compact workspace controls. Landing page explains the privacy limit before sign-in. Workspace separates identity details from received/sent/new-report views. Every input has a visible label; status messages announce to assistive technology. Layout stacks at narrow widths; no third-party fonts or images are fetched.

No extra profile form is mounted. A licence email is not an end-user profile default.

## Validation

Automated tests exercise the actual WebCrypto flow with three identities, persistent storage, malformed request boundaries and signed DPoP proofs including the future-iat replay regression. TypeScript and Tide Doctor cover static integration. The independent review accepted the implementation with warnings about the missing real browser/Tide run. Use `docs/demo.md` for the remaining live acceptance checks.
