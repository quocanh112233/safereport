# SafeReport — two-minute demo and acceptance checks

Use fictional text, never a real incident. The following is a script to run, not a claim that the live flow has already passed.

## Prepare

Run `npm test`, `npm run build`, then `npm run start -- --hostname 127.0.0.1`. Use http://localhost:3000. Keep TideCloak on http://localhost:8080 running. Do not reinitialize the realm.

Use two separately authenticated Tide accounts in isolated browser profiles, one as the sender and one as the recipient. A different window with the same cookies is not a different user. The recipient should be enrolled through the existing Tide flow; never put the operator's master-admin credential into the app.

## Narration and actions

**0:00 — The problem**

“Reporting an incident often means trusting an institution's entire database with a readable account of what happened. SafeReport lets a person choose a reader while keeping the stored content encrypted.”

Show the landing page and the confidentiality/metadata notice.

**0:20 — Recipient identity**

Sign in as recipient. Choose Create my reporting key. Confirm the Tide operation completes. Copy the account ID and fingerprint. Explain that these details must reach the sender through an independently trusted channel, for example in person.

**0:45 — Send**

Sign in as sender in the other profile and create their reporting key. Select New report. Paste the recipient account and fingerprint, then enter fictional title “Lab access incident” and message “At 14:00, a visitor entered the sample testing lab without checking in.” Choose Encrypt & send report.

“Tide protects the reporting key. Browser WebCrypto encrypts the message for its two participants. The server receives ciphertext, not this title or message.”

**1:15 — Read and inspect**

As recipient, refresh Received and open the report. Show Inspect stored ciphertext. As sender, show the report in Sent. Lock the workspace and confirm that opened text disappears. Reload, unlock with Tide, and confirm the same report can still be read.

**1:45 — State the boundary**

“This prototype is confidential, not anonymous. It exposes account IDs and delivery metadata. It depends on verifying the recipient's fingerprint and keeping the browser safe. We have no end-to-end sender signature, forward secrecy or instant revocation.”

## Remaining live acceptance checks

- Both accounts can create and later unlock their own key through the real Tide network.
- Correct recipient fingerprint delivers; altering one digit refuses before upload.
- Sender and recipient read the same text; a third account's inbox does not contain it.
- A reload retains reports, but requires unlocking again.
- Received/Sent switch, Hide content, Lock workspace and Sign out clear rendered plaintext.
- Network POST to `/api/reports` contains ciphertext and no title or message fields.
- Bare requests to `/api/identity` and `/api/reports` return 401.
- Tide Doctor passes with `--url http://localhost:3000 --check`.
- Tab through controls; inspect 320px and desktop layouts and browser console.

Before submission obtain the full UNLOCKED brief and check its required names, deliverables, deadline and video rules. This repository has not been submitted.
