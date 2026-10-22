# UNLOCKED: official-source alignment

## Evidence and limits

Sources: descriptions downloaded from the Tide Foundation's [introduction](https://www.youtube.com/watch?v=gHlev6-kB3I) and [developer walkthrough](https://www.youtube.com/watch?v=z0o-B3258Cg), preserved locally in the gitignored `docs/challenge-videos/` directory. Metadata confirms the channel and chapters. Subtitle downloads returned no data; the full spoken content has not been reviewed. The challenge webpage remains unavailable to the agent.

The introduction description calls UNLOCKED “Challenge 1”, whereas the contestant's official slide calls it “Challenge 2”. Both point to the same UNLOCKED webpage. Keep the event's local naming but verify the submission slot with the organizer; do not infer a different product brief from this numbering difference.

## Confirmed requirements from the introduction description

| Requirement | SafeReport evidence | Status |
|---|---|---|
| Reimagine something difficult, risky or impossible because of trust, privacy or security constraints | Sensitive incident reporting where readable contents need not be stored by the platform | Aligned concept; originality and impact are not independently established |
| Build a working proof of concept using TideCloak | Actual licensed realm, real adapter, sign-in integration, Tide-protected private reporting keys and browser encryption | Implemented; operator reports build, automated checks and HTTP smoke tests passing; two-account Tide flow still needs recorded evidence |
| Use Tide MCP with an AI coding agent for the integration | Tide MCP scenario/template/hosting/branding/doctor tools used | Done |
| Public GitHub repository with a project README | Local Git repository and README with the reference template's five sections | Local material exists; no public SafeReport repository URL verified |
| Two-minute demonstration video | `video_demo/` contains the recorded demo video; `docs/demo.md` provides the script | Done (`video_demo/2026-10-22 17-55-38.mp4`) |

The descriptions do not provide scoring weights, mandatory folder naming, a submission deadline, or the complete submission mechanism. Do not claim those details are confirmed.

## What the walkthrough does and does not require

CreatorVault demonstrates pressure-testing an idea, checking current Tide capabilities, integrating through MCP, exercising legitimate and unauthorized access, and explaining limitations. Its description explicitly says the goal is to demonstrate a repeatable process for the participant's own concept, not to build CreatorVault.

Creator subscriptions, purchases, creator approvals, watermarking, leak tracing and revocation are example-specific features, not established universal requirements. The description explicitly identifies watermarking and leak tracing as custom application logic, not built-in TideCloak features. It uses synthetic data and mocked payments.

No requirement to fine-tune an AI model or embed a chatbot appears in these descriptions. This is a statement about the available descriptions, not proof that the full brief contains no other requirements.

## SafeReport's submission story

“A student should be able to send a sensitive incident report to a trusted support person without exposing the readable report to the portal's database operator. SafeReport uses TideCloak to authenticate accounts and protect each user's private reporting key. The browser encrypts the title and message for the sender and a recipient whose fingerprint has been independently verified.”

This is a focused demonstration of removing a content-storage trust requirement. It does not remove every trust requirement. It does not prove the recipient's real-world role, conceal metadata, stop a malicious JavaScript deployment, or provide end-to-end sender signatures.

The weakest competitive dimension is differentiation: a two-person encrypted inbox overlaps existing encrypted messaging. A convincing submission must explain why this specific reporting workflow is valuable, identify a concrete user and incident, and show precisely what Tide changes. Do not invent user research or uniqueness claims.

## Remaining work before claiming completion

1. Obtain the full challenge brief and spoken/video instructions; confirm judging criteria, deadlines, naming and submission slot.
2. Record a genuine two-account sign-in/create-key/send/unlock flow, wrong-fingerprint refusal, stored ciphertext and locked-content behavior.
3. Publish the intended source repository only after checking that `.env`, adapter, H2 state, private reports and invitation links are excluded. No publication has been authorized or performed by this assessment.
4. Record the two-minute demonstration and provide the final repository/video URLs using the organizer's submission instructions.
