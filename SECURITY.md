# Security Policy

We take security seriously and appreciate responsible disclosure. This document explains how to report vulnerabilities and what to expect from us.

## Supported Versions

This project is under active development. We generally support the latest commit on `main`. For tagged releases, security fixes will be applied on a best‑effort basis.

## Reporting a Vulnerability

Please report security vulnerabilities privately. Do not open public issues.

Preferred channel: GitHub Security Advisories
- Open a private advisory: https://github.com/eliezeramaya/vault/security/advisories/new
- Provide a clear description, impact, affected components/versions, and steps to reproduce.
- Include proof of concept (PoC) if available.

Alternative channel: security email
- If you cannot use GitHub advisories, you may email: security@placeholder.invalid
- Please include the same details as above.

We will acknowledge receipt within 2 business days.

## Triage & Response SLAs

- Acknowledgement: within 2 business days
- Initial assessment: within 5 business days
- Fix or mitigation plan: within 14 business days for high severity findings (based on CVSS v3 guidelines)
- Coordinated disclosure: We prefer to coordinate public disclosure after a fix is available. We’ll keep you informed of the timeline.

## Scope

In scope:
- This repository (web app under `apps/web`) and associated GitHub Actions workflows
- PWA static hosting via GitHub Pages configuration

Out of scope:
- Third‑party services and libraries (report upstream)
- Social engineering, phishing, or non‑technical attacks
- DoS/DDoS and volumetric abuse without a clear vulnerability

## Safe Harbor

When you follow this policy and make a good‑faith effort to avoid privacy violations, data destruction, and service disruption, we will consider your research authorized and will not pursue legal action.

## Temporary Mitigations

If you discover a high‑severity issue, consider sharing temporary mitigations or configuration workarounds we can publish ahead of a full fix.

## Credits

We’re happy to credit reporters in release notes unless you prefer to remain anonymous.
