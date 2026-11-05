# Capability test: practice games

Not samples for the gallery (they are not in `samples/index.json`). Three small orders that prove the `practicegame`
kind (docs/KINDS-PRACTICEGAMES.md), one per template, through the preview, the review page's agreement and the final:

| Folder | Template | Order (made-up teacher) |
|---|---|---|
| `shooter-g5-math/` | answer shooter, space theme | Mr. Delgado, grade 5 math: adding, subtracting and multiplying fractions (15 questions: 10 choice, 1 true/false, 4 typed numbers, with math typesetting) |
| `grid-g8-science/` | grid battle (letters), ocean theme | Ms. Haddad, grade 8 science: waves vocabulary (16 questions: 10 choice, 3 true/false, 3 typed words). `npm run check` also plays it as a coordinate-plane grid |
| `fixit-g6-ela/` | fix-it desk, classroom theme | Mrs. Lindqvist, grade 6 ELA: pronouns, agreement, punctuation (12 papers: 7 typed fixes, 5 picked) |

```
node scripts/render-pack.mjs samples/_cap-practicegame/<folder> --preview
# open out-preview/REVIEW.html, tick the boxes, type a name, "I agree", save the file as <folder>/approval.json
node scripts/render-pack.mjs samples/_cap-practicegame/<folder> --final
node checks/practicegames.mjs samples/_cap-practicegame/<folder>/pack.json --shots <a folder outside the repo>
```

Only Wilco's scripts (keys, test-wise) and checks/practicegames.mjs ran on them; no blind tester, solver or fact
checker did. The content was written for the test, honestly (every key worked by hand), but it has not had a fresh
agent's review.
