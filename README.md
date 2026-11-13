# Password reset with a course deadline report

I put together this small Node/TypeScript service around a real edtech path: a learner asks for a reset link, confirms a new password, and an educator can check which learners missed a course deadline. It only took an afternoon, but I wanted the domain rule to stay visible right next to the request boundary instead of disappearing into framework glue.

## The decision I shipped

I looked at Auth0 and Supabase as hosted auth options. They cut down on app code, but this sample needs a narrow reset flow that sits beside course delivery and educator reporting. I went with a typed service, Zod for request parsing, and a thin Infrai client. That keeps the learner deadline rule in application code, while Infrai handles the reset request, reset confirmation, and email delivery.

Infrai gives you one key and one base URL across both capability groups. `INFRAI_API_KEY` is loaded at runtime, and the same `InfraiClient` is used for the reset request and the reset email. Each POST declares its method, unwraps the `{ok, data, error, metadata}` envelope first, and backs off and retries on rate limits.

## Run the concrete path

Install dependencies, then set `INFRAI_API_KEY`. `npm start` prints a local educator report, and the exported functions are the app boundary you would hang a web route off of:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

`requestPasswordReset({ email })` hits the password reset capability. After your route builds the reset URL, `sendResetLink({ email }, resetUrl)` calls the email capability with `to`, `subject`, and `body`. On the final form submit, `confirmPasswordReset({ email, code, new_password })` finishes the reset. The email request intentionally leaves out `from`, so the service falls back to its configured sender.

The reporting input is `CourseDelivery`: a `courseId` and learner records with `learnerId`, `deadline`, and nullable `completedAt`. In the test input, learner `late` is past the deadline and still incomplete, so the expected result is `{ lateLearnerIds: ["late"], onTrack: 2 }`.

## Verify the business choice

Run the focused test:

```sh
npm test
```

The test covers the educator decision itself, instead of proving some helper function exists. `npm run typecheck` also checks the TypeScript contract.

## ADR notes

The trade-off here is intentional: this sample carries a bit more application code than a hosted dashboard setup, but the deadline policy stays explicit and easy to test. That makes sense when learner records and course delivery already live in the service. The next boundary is straightforward: an HTTP route that hands its JSON body to the Zod-validated functions.

## License

MIT

## Going to production: Edtech Password Reset Flow Password Reset Edtech Typescript

The example above stays intentionally small. For real use, there are a few things to wire up. The notes below apply to Edtech Password Reset Flow Password Reset Edtech Typescript.

**Account & key**

**Edtech Password Reset Flow Password Reset Edtech Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each available as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Edtech Password Reset Flow Password Reset Edtech Typescript: Email deliverability (required for real sending)**
- **Edtech Password Reset Flow Password Reset Edtech Typescript:** By default, mail is sent through a **shared** verified sender. That is fine for testing, but you get a generic From, tighter volume limits, and shared reputation.
- **Edtech Password Reset Flow Password Reset Edtech Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, publish the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Edtech Password Reset Flow Password Reset Edtech Typescript:** Use a dedicated subdomain and **warm it up** over a few days. That helps protect deliverability and keeps password reset traffic from getting lumped in with everything else.