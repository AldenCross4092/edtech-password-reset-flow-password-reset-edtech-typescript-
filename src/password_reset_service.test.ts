import test from "node:test";
import assert from "node:assert/strict";
import { deadlineStatus } from "./password_reset_service.ts";

test("educator report marks incomplete learners past their deadline as late", () => {
  const result = deadlineStatus({ courseId: "algebra-101", learners: [
    { learnerId: "late", deadline: new Date("2026-01-09"), completedAt: null },
    { learnerId: "done", deadline: new Date("2026-01-09"), completedAt: new Date("2026-01-08") },
    { learnerId: "due-later", deadline: new Date("2026-01-12"), completedAt: null }
  ] }, new Date("2026-01-10"));
  assert.deepEqual(result, { lateLearnerIds: ["late"], onTrack: 2 });
});
