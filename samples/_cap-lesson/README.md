# Capability test: interactive lessons

Not a sample for the gallery (it is not in `samples/index.json`). It proves the `lesson` kind (docs/KINDS-LESSONS.md)
against the owner's interactive standard (docs/INTERACTIVE-STANDARD.md), through the preview, the agreement and the final:

```
node scripts/render-pack.mjs samples/_cap-lesson --preview
# open out-preview/REVIEW.html, tick the boxes, type a name, "I agree", save the file as samples/_cap-lesson/approval.json
node scripts/render-pack.mjs samples/_cap-lesson --final
node checks/lesson.mjs samples/_cap-lesson/pack.json --shots <a folder outside the repo>
```

Made-up teacher (Ms. Rivera), grade 6 science, density, from a made-up source worksheet ("Density Notes", 7 blanks:
`blanksInventory`). 42 required minutes plus an optional 4-minute lab; mechanics predict-then-reveal → simulate → sort →
hands-on (off the board, with "Simulate it for me") → slider hunt → build → (optional predict) → find-the-mistake.

- `ids.lock.json`: every id the lesson has had (S2). Build 2 added `lab-tower` and `tower-predict`.
- `saves/density-1-build-1.json`: a backup file saved from Build 1 by a scripted student (some right answers, a wrong
  try, an own note, a short answer). Every render and `checks/lesson.mjs` confirm it still shows in Build 2 (S5).

Only Wilco's scripts ran on it (keys, test-wise, lesson); no blind tester or fact checker did.
