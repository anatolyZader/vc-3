Manual-only file policy

- File: ubiqLangDict.json
- Purpose: Ubiquitous language dictionary/glossary for AI data preparation.
- Policy: This file must only be edited manually by a developer. No automation or generation should modify it.

CI guard
- The GitHub Actions workflow blocks changes to this file unless one of the following is true:
  1) The commit message includes the token: UBIQ-MANUAL
  2) The change is authored by @anatolyZader
- If neither condition is met, the CI job "Guard Ubiquitous Language Dict" will fail.

PR reviews
- CODEOWNERS requires @anatolyZader for any changes to this file.
- Ensure the repository has branch protection with "Require review from Code Owners" enabled for this to be enforced on PRs.

Developer workflow
- When intentionally editing the file, add the token to the commit message, e.g.:
  chore(ubiq): update domain terms [UBIQ-MANUAL]

Notes
- Do not write to this file programmatically.
- If you need to change the policy, update .github/workflows/deploy.yml and .github/CODEOWNERS accordingly.
