# SafeReport — a safer place to speak

A confidential incident-reporting prototype: encrypt a report in your browser and deliver it to a recipient whose account and public-key fingerprint you have independently verified.

Built with [TideCloak](https://tide.org/tidecloak), through Tide MCP, for Challenge 2: [UNLOCKED](https://tide.org/unlocked/#challenge).

## 1. Vision & originality

Students should be able to document a sensitive incident without placing its readable contents in a central application database. SafeReport separates the ability to deliver a report from the ability to read it. The sender chooses the reader; the server stores encrypted titles and messages.

The prototype uses pseudonymous account IDs. It deliberately adds no name or email collection, no AI service receiving report content, and no public searchable user directory.

## 2. Trust constraint insight

Conventional reporting portals ask people to trust the organization, its administrators, database operators and hosting provider with readable reports. That can discourage reporting, particularly when an incident involves someone within the institution.

SafeReport addresses content disclosure from storage: a database reader obtains encrypted content and Tide-encrypted private keys. Tide protects each reporting key through identity-bound self-encryption. WebCrypto encrypts each report for its sender and recipient. Recipient fingerprints must be verified outside the service, so the application directory is not the sole source of trust for the chosen reader's key.

This is not anonymous or tamper-proof reporting. Routing metadata remains visible. Sender labels rely on the authenticated application backend, not a cryptographic sender signature; a malicious backend can fabricate messages. A malicious web deployment or compromised browser can capture plaintext while the user is reading or writing.

## 3. Value & impact

Example: a student documents an incident and sends it to a trusted support officer. The officer shares their reporting account ID and fingerprint in person. The student verifies those values and sends an encrypted report. Both can reopen the report, while the stored title and message remain unreadable to a database-only observer.

The prototype supports a basic two-person exchange; it does not verify real-world institutional roles, handle emergencies, or replace an institution's reporting procedures.

## 4. Why TideCloak matters

- TideCloak authenticates accounts. Protected APIs verify JWT signature, issuer, client, required claims and DPoP binding on the server using the genuine adapter's embedded JWK.
- Tide self-encryption protects the browser-generated RSA private key at rest. The existing `_tide_vault.selfencrypt` and `_tide_vault.selfdecrypt` roles are retained. The `vault` tag is intentional because the initialized realm already grants those roles.
- After sign-in, Tide decrypts only the current account's stored reporting key into page memory. The application server never receives the plaintext key.
- Browser WebCrypto encrypts report content with a fresh AES-256-GCM key per report and wraps that key separately for the sender and recipient with RSA-OAEP/SHA-256. This is a hybrid integration, not a claim that Tide self-encryption allows sharing between identities.
- No custom Forseti contract, local replacement for Tide authentication, or server-side administrator impersonation is used.

The DPoP relay is copied byte-for-byte from the official Tide pack. The inherited verifier was hardened so replay-cache entries cover the full validity window of future-dated proofs; a regression test covers this case.

## 5. Prototype & storytelling

Implemented: branded sign-in, protected workspace, create/unlock reporting identity, verify recipient fingerprint, encrypt/send report, received/sent views, decrypt/hide content, inspect ciphertext, refresh, lock and sign out. A legacy `/vault` link redirects to the workspace; its old API returns `410` to authenticated callers. Existing vault data is not deleted.

See [the demo script](docs/demo.md) ([Bản Tiếng Việt](docs/demo.vi.md)), [video demo](video_demo/README.md), and [design and trust boundaries](docs/design.md).

## Run the current checkout

The `safereport` realm has already been initialized on this machine, the admin account linked, and branding applied. **Do not rerun `npm run init` on this initialized checkout.**

```bash
npm test
npm run build
npm run dev # or npm run start -- --hostname 127.0.0.1
```

Open **http://localhost:3000**. Use `localhost` consistently, since the realm's allowed origin is configured for it. For development use `npm run dev -- --hostname 127.0.0.1` instead of `npm run start`.

### Fresh installation only

Requires Node.js 22.6+ (Node 22 used here), Docker, curl, jq and lsof. Retrieve the official pack at `https://mcp.tide.org/pack/templates.tgz` and extract it inside `.tide-pack/` so `.tide-pack/templates/` exists.

Install packages with `npm ci`. Create a private `.env` from `.env.example` and supply a strong master-admin password, your own licence email, and `TIDE_TERMS_ACCEPTED=yes` only after agreeing to https://tide.org/legal. Run `npm run init` once, and follow the account-linking invitation in your browser. This creates a real `data/tidecloak.json`; never substitute a placeholder adapter.

Bootstrap refuses to overwrite an existing `safereport-tidecloak` container, database, or adapter. A failed partial bootstrap needs diagnosis before retrying. Local TideCloak listens on `127.0.0.1:8080` and still requires the online Tide network.

## Verification status

- Automated checks cover sender/recipient decryption, wrong keys, modified content and routing, persistent owner/recipient isolation, immutable key registration, malformed/oversized requests, DPoP replay/method/URL/token binding, bootstrap guards and the byte-identical relay.
- TypeScript checking and ten Tide Doctor static checks pass after the SafeReport changes.
- The operator reports a successful production build, all ten automated tests, fourteen runtime Tide Doctor checks and HTTP smoke tests. The smoke tests rejected unauthenticated requests to protected endpoints.
- A real two-account browser run is still required. This agent environment cannot listen on `127.0.0.1:3000` or access the operator's TideCloak localhost.

When the app is running, check served headers and relay integrity:

```bash
bash .tide-pack/templates/shared/tide-doctor.sh --app "$PWD" --url http://localhost:3000 --check
```

## Limits and submission status

Use synthetic reports only. No attachments, replies, read receipts, key rotation, recovery workflow, rate limiting, pagination, forward secrecy or instant revocation. Local files and process-local DPoP replay state are for a single-node demonstration; use transactional storage, shared replay protection, request quotas and a security review before wider deployment. Keep `.env`, adapter, H2 files and `data/safereport/` private and backed up together; losing the reporting keys loses access to reports.

The official slide and downloaded Tide Foundation video descriptions confirm a trust/privacy/security-focused concept, a working TideCloak proof of concept built through MCP, and submission of a public GitHub repository with a README plus a two-minute demo video. CreatorVault is explicitly an example, not the required product. See [official-source alignment](docs/challenge-alignment.md).

The full challenge webpage and spoken video contents have not been reviewed. Scoring weights, deadline, directory naming and the final submission mechanism remain unverified. These five headings follow the supplied reference repository, not a verified scoring rubric. `challenge-2/` is the chosen workspace directory; `fairenrol` in the reference README was a sample setup name.

Nothing has been deployed or submitted to the competition.
