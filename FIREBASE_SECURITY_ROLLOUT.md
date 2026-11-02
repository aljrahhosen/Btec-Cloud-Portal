# Firebase security rollout (review only)

This branch contains a proposed Firestore rules baseline. It is **not deployed**.

## Important compatibility requirements before deployment

1. Teacher authentication must be migrated to trusted server-side provisioning that sets Firebase Auth custom claims `role: "teacher"` and `teacherId`. The current browser flow writes `Users/{uid}.role` and consumes `TeacherCodes` from the client; that is not a trusted authorization boundary.
2. Student registration must stop querying all `Users` by national ID. Use a callable HTTPS function with Admin SDK and a transaction-backed `NationalIdIndex` reservation. Do not expose national IDs in a teacher-readable collection.
3. Populate `StudentDirectory/{uid}` through trusted server code with only the minimum roster fields required by teachers. The current teacher page reads the full `Users` collection and must be changed to read this directory.
4. Update the teacher course page to verify refreshed custom claims and ensure the teacher is authorized for the requested course. The current client-side `role` field is not sufficient. The existing course-to-teacher assignment model must be confirmed before enforcing per-course ownership.
5. Grade writes must remain teacher-only. Students must never update `grades`; they may read only their own profile/grades. This rules draft reserves grade writes to trusted teacher claims, but per-course authorization still needs a confirmed assignment mapping.
6. Submission metadata/chunks are owner-readable by the submitting student and teacher-readable. Review upload size, chunk count, and allowed metadata fields in application code / callable backend before rollout.

## Deployment warning

Do not publish these rules until the application changes and trusted backend are deployed and tested. Applying these rules to the current client code as-is will break existing teacher-code redemption and the teacher roster query. No Firebase Console changes were made by this commit.
