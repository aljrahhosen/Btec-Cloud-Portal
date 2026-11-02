# Required configuration before deployment

The API routes introduced in this branch deliberately do not contain Firebase
credentials. Add one Vercel environment variable before deploying this branch:

- `FIREBASE_SERVICE_ACCOUNT` — the complete JSON of a Firebase service-account
  key for `btec-cloud-portal-d6a93`. Add it to Preview and Production, mark it
  sensitive, and never commit it.

In Firebase Authentication, verify that Email/Password, Google, and GitHub are
enabled. Configure GitHub with Firebase's callback URL and ensure
`btec-cloud-portal.vercel.app` is in Authorized domains. Google and GitHub users
are sent to profile completion on first sign-in; an existing teacher profile is
routed to the teacher portal.

Deploy Firestore rules only after deploying the API route and setting the secret:

```bash
firebase deploy --only firestore:rules --project btec-cloud-portal-d6a93
```

The rules make browser writes to `Users`, `StudentPrivate`, `StudentDirectory`,
`NationalIds`, and `TeacherCodes` impossible. Those records are written by the
Admin API. Existing users created under the former permissive rules should be
migrated to the new collections before the rules are deployed.
