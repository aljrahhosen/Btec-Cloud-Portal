# Firebase deployment steps — required before production use

This repository includes callable Cloud Functions and a proposed Firestore rules file. They are not deployed by a Git commit.

## Required operator steps
1. Install Firebase CLI and authenticate with an account that owns project `btec-cloud-portal-d6a93`.
2. Run `npm --prefix functions install`.
3. Run `firebase use btec-cloud-portal-d6a93`.
4. Deploy backend first: `firebase deploy --only functions --project btec-cloud-portal-d6a93`.
5. Test student completion, duplicate national-ID rejection, teacher-code one-time redemption, teacher custom claims, grade writes, and submission upload/download using test accounts.
6. Only after successful tests, deploy rules: `firebase deploy --only firestore:rules --project btec-cloud-portal-d6a93`.

## Security notes
- National IDs are hashed for the uniqueness index; raw values remain only in each student's private `Users/{uid}` document.
- Teacher authorization is issued only after the callable function atomically redeems a TeacherCodes document.
- Callable functions use Admin SDK managed credentials; never commit service-account JSON.
- The current course model does not encode which teacher owns which course. The issued teacher claim currently authorizes a teacher role globally; add and verify a course assignment mapping before enforcing per-course restrictions.
- App Check is not enforced in this initial deployment. Configure and enforce it after registering the web app.
- The callable functions use region `me-central1`; clients must call the same region.
