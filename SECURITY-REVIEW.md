# Security review and implementation plan

Repository: `aljrahhosen/Btec-Cloud-Portal`
Firebase project: `btec-cloud-portal-d6a93`

## Current verified risks

- The Firestore rules previously supplied for this project allow every visitor to read and write every document. Do not deploy those rules to a public site.
- Student identity data, including `nationalId`, is stored in `Users/{uid}`. A browser-side query that searches all user documents by national ID exposes more data than the registration flow needs.
- Teacher registration currently checks and consumes `TeacherCodes/{teacherId}` in browser code. Client-side role assignment is not a trustworthy authorization boundary.
- The teacher course page reads the `Users` collection and writes grades directly from the browser. Hiding links or checking a role in JavaScript is not sufficient protection.
- Existing course identifiers include `web_dev`, `programming`, and `networks`. Preserve them; do not rename collections or course IDs during security work.
- Assignment submissions and file chunks are stored under course documents. Their access rules must be designed together with the existing upload/download flow.

## Required security design

1. Keep national ID in the private user record, but never expose a collection-wide student listing to ordinary clients.
2. Establish teacher authorization using Firebase Admin custom claims set only by a trusted server process. Never trust a role supplied by the browser.
3. Put national-ID lookup behind an authenticated server endpoint that checks the teacher custom claim before returning the field.
4. Replace client-side national-ID uniqueness scans with a server-side transaction and a keyed HMAC index. Do not use a plain hash of a 10-digit national ID.
5. Move teacher grade changes, course edits, and teacher-code redemption to trusted server operations, or use rules that independently verify the relevant custom claims and ownership.
6. Restrict student document writes so a student cannot change `role`, `teacherId`, `grades`, or another user's data.
7. Restrict submissions and file chunks to their owning student and authorized teachers for the matching course.
8. Require verified email where the product flow expects it.

## Deployment prerequisites

- A Vercel server-side environment variable containing a Firebase service-account credential is required for Admin SDK endpoints. Add it through Vercel Project Settings; never commit it or paste it into chat.
- An explicit allowlist of the site owner's teacher account(s) is needed for the initial trusted teacher bootstrap. Do not infer teacher authority from an existing Firestore `role` field because current public rules allow that field to be forged.
- Firestore rules must not be tightened until all existing browser flows that depend on unrestricted reads/writes have been migrated and tested. Otherwise registration, teacher course management, grading, or submissions may stop working.

## Safe rollout order

1. Add and test trusted server endpoints and Admin SDK configuration.
2. Update registration and teacher pages to use those endpoints.
3. Add automated checks for student self-access, cross-user denial, teacher-only national-ID access, grade authorization, and submission ownership.
4. Deploy server code to a preview and test the complete owner workflow.
5. Deploy restrictive Firestore rules only after the preview passes.
6. Verify the production site and Firebase rules separately; a GitHub commit alone does not deploy Firestore rules.

This review records verified risks and the safe implementation order. It does not claim that Firebase rules or production services have been changed.
