# SafeReport — Video Demo

This directory contains the demonstration video for Challenge 2 (Tide UNLOCKED):

* **Video file:** [`2026-10-22 17-55-38.mp4`](./2026-10-22%2017-55-38.mp4) (4.7 MB)
* **Demo Script:** [`../docs/demo.md`](../docs/demo.md)
* **Vietnamese Script:** [`../docs/demo.vi.md`](../docs/demo.vi.md)

### What the demo proves:
1. **Recipient Identity Setup:** Bob generates RSA-3072 reporting key; Private key protected by Tide Vault.
2. **Out-of-band Verification:** Bob's SHA-256 fingerprint shared with Alice to eliminate Man-in-the-Middle attacks.
3. **Browser-side Encryption:** Alice verifies fingerprint, generates ephemeral AES-256-GCM key, and wraps for both parties.
4. **RFC 9449 DPoP:** Access tokens bound to browser key pair with proof-of-possession.
5. **Zero-Knowledge at Rest:** Server disk stores purely random ciphertext; no plaintext titles or bodies are accessible to DBA/server root.
6. **Decryption in RAM:** Bob decrypts the report in RAM; `Lock workspace` immediately purges the key and decrypted plaintext from memory.
