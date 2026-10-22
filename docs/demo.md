# SafeReport — 2-Minute Demo Script & Spoken Voiceover

> **Note:** Use sample fictional data for all demos, never real incident reports.

---

## 🛠️ Quick Setup (Before Recording / Demo)

1. Run the test suite and launch the app:
   ```bash
   npm test
   npm run dev
   ```
2. Open your browser at: **`http://localhost:3000`**
3. At the top of the screen, you will see the identity switcher:
   `Switch Identity: [Alice (Reporter)] [Bob (Auditor)]`
   *(This lets you switch between characters seamlessly in one tab).*

---

## 🎙️ Spoken Video Script (2 Minutes · Conversational English)

### ⏱️ [0:00 – 0:20] The Problem & Introduction

* **Action:** Show the SafeReport landing page on `http://localhost:3000`. Point to the title and security notice.
* **Say (Conversational English):**
  > "Hi everyone. When someone wants to report an incident—like fraud, harassment, or safety issues—they usually have to trust a company database. But if that database gets breached, or a bad admin peeks in, the whistleblower is exposed.
  >
  > With SafeReport, we solve this with Zero-Knowledge encryption. The report is encrypted right inside the browser before it ever leaves your laptop. Let me show you how it works in two minutes."

---

### ⏱️ [0:20 – 0:45] Step 1: Bob Sets Up His Identity (The Recipient)

* **Action:**
  1. Click **`Bob (Auditor)`** on the top green bar.
  2. In the left panel, click the green button: **`Create my reporting key`**.
  3. Once generated, click: **`Copy recipient details`**.
* **Say (Conversational English):**
  > "First, let's meet Bob. Bob is our incident auditor.
  >
  > Bob clicks **'Create my reporting key'**. SafeReport creates a 3072-bit RSA key pair. Bob's private key stays protected inside Tide Vault.
  >
  > Right here is Bob's public key fingerprint. Bob can share this fingerprint with Alice in person or over a verified chat. This simple check stops any man-in-the-middle attacks."

---

### ⏱️ [0:45 – 1:15] Step 2: Alice Encrypts & Delivers the Report (The Sender)

* **Action:**
  1. Click **`Alice (Reporter)`** on the top green bar.
  2. Click the **`+ New report`** tab on the right panel.
  3. Enter Bob's Account ID: `bob-incident-auditor`.
  4. Paste Bob's 64-character Fingerprint.
  5. Type Title: `Financial discrepancy in Q3 budget`.
  6. Type Details: `Found unapproved payments totaling $15,000 processed on October 15th.`
  7. Click the green button: **`Encrypt & send report ↗`**.
* **Say (Conversational English):**
  > "Now let's switch to Alice, the reporter.
  >
  > Alice clicks **'New report'**. She enters Bob's account ID and pastes his fingerprint.
  >
  > She enters her incident details. When Alice clicks **'Encrypt and send'**, her browser does all the cryptographic heavy lifting:
  > It verifies Bob's fingerprint, generates a random AES-256 key, encrypts her message, and wraps that key using Bob's public key.
  >
  > The package is signed with an RFC 9449 DPoP proof and sent to the server. The server only sees ciphertext—never Alice's plain words."

---

### ⏱️ [1:15 – 1:35] Step 3: Zero-Knowledge Verification on the Server

* **Action:** Open terminal (or show the stored ciphertext inspector in the UI) and show:
  ```bash
  cat data/safereport/reports/*.json | jq .
  ```
* **Say (Conversational English):**
  > "Let's look at what the server actually saved.
  >
  > If a hacker breaks into the server or inspects the disk, this is all they see: random ciphertext bytes and an encrypted key envelope.
  >
  > There is no master key. Even a server administrator with root access cannot read Alice's report."

---

### ⏱️ [1:35 – 1:50] Step 4: Bob Decrypts & Clears Memory

* **Action:**
  1. Click **`Bob (Auditor)`** on the top green bar.
  2. Go to the **`Received`** tab.
  3. Point to the report showing `Title protected`.
  4. Click: **`Open report`**. The full title and body appear!
  5. Click: **`Lock workspace`** on the left panel. The decrypted text disappears!
* **Say (Conversational English):**
  > "Now, back to Bob's screen.
  >
  > In Bob's **'Received'** tab, he sees the new report. The title is protected.
  >
  > Bob clicks **'Open report'**. His browser pulls his private key into memory and decrypts the report in RAM. Bob can now review the incident.
  >
  > If Bob has to leave his desk, he clicks **'Lock workspace'**. The private key and the plaintext are instantly wiped from browser memory."

---

### ⏱️ [1:50 – 2:00] Step 5: Boundaries & Closing

* **Action:** Show the footer notice and wrap up.
* **Say (Conversational English):**
  > "To be fully honest about boundaries: SafeReport is confidential, not fully anonymous. The server still sees account IDs and timestamps to route the message.
  >
  > But it guarantees that your story stays between you and the person you trust.
  >
  > Thanks for watching SafeReport!"

---

## 💡 Quick Q&A for Judges (Cheat Sheet)

* **Q: Can the system administrator read the messages?**
  * **Answer:** *"No. SafeReport is Zero-Knowledge. Only the sender and the chosen recipient hold the decryption keys. The server stores only AES-256 ciphertext."*
* **Q: What stops someone from tampering with the recipient's key?**
  * **Answer:** *"Out-of-band fingerprint verification. Alice's browser hashes the recipient's public key with SHA-256 and refuses to send if it doesn't match the fingerprint Bob gave her."*
* **Q: Why do you use DPoP instead of regular Bearer tokens?**
  * **Answer:** *"Under RFC 9449, DPoP cryptographically binds the access token to the browser's private key. If an attacker intercepts the token on the network, they cannot replay it."*
* **Q: What does 'Lock workspace' do?**
  * **Answer:** *"It purges the private key from browser RAM. If someone walks up to your computer, they cannot click 'Open report' to read anything until you re-authenticate with Tide."*

---

## ✅ Acceptance Checklist

- [x] Both accounts can generate and unlock keys.
- [x] Fingerprint mismatch halts delivery before upload.
- [x] Only sender and recipient can decrypt; third parties cannot.
- [x] Server disk stores only ciphertext (`cat data/safereport/reports/*.json`).
- [x] Lock workspace clears rendered plaintext from memory.
- [x] API calls without DPoP token return `401 Unauthorized`.
- [x] 19/19 automated tests pass (`npm test`).
