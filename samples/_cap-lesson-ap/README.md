# Capability test: an AP lesson with a bell ringer

Not a gallery sample. The `lesson` kind with `ap: true` (docs/KINDS-LESSONS.md, rules A1–A4): made-up teacher
(Mr. Delgado), AP Statistics, the sampling distribution of p̂, from made-up notes (4 blanks). A 10-minute bell ringer
(4 multiple choice of about equal length, one FRQ whose scoring guide, model and typical errors are teacher-only, CED
codes teacher-only and unchecked) plus 35 minutes of lesson: predict-then-reveal → simulate (binomial samples with a dot
plot) → sort (Large Counts) → slider hunt → find-the-mistake.

```
node scripts/render-pack.mjs samples/_cap-lesson-ap --preview
node checks/lesson.mjs samples/_cap-lesson-ap/pack.json
```

Only Wilco's scripts ran on it; no blind tester or solver did.
