# The pack format (`pack.json`)

Every order becomes one `pack.json`. Agents write it; `scripts/render-pack.mjs` turns it into the files the teacher gets.
Nothing else is hand-edited. Change the pack, then render again.

```jsonc
{
  "format": 1,
  "id": "pp-2026-11-05-g6-math",            // order id
  "order": {                                 // copied from the teacher's order (order.json)
    "teacher": "Ms. Rivera (made-up sample)",
    "grade": "6", "subject": "math", "topic": "Ratios and rates",
    "items": ["worksheet", "quiz"],
    "requests": "Use pets in the stories. Level 3 should need two steps.",
    "sources": ["source-ratios.pdf"],         // file names only; files are never kept after delivery
    "styleExamples": ["my-old-quiz.docx"]
  },
  "style": {                                 // what the agents learned from the teacher's examples
    "notes": ["Numbered questions, bold directions, a box for the name and date", "Short sentences"],
    "font": "Lexend", "accent": "#2b6cb0"
  },
  "documents": [                             // one per item ordered
    {
      "item": "quiz", "title": "Ratios Quiz",
      "directions": "Show your work. Circle your final answer.",
      "versions": ["A", "B"],                // omitted when the item has no versions
      "sections": [
        {
          "heading": "Part 1: Ratio language",
          "questions": [
            {
              "id": "q1", "level": 1, "skill": "ratio language",
              "type": "mc",                    // mc | short | numeric | open | match | tf
              "prompt": { "A": "…", "B": "…" },   // a string when both versions share it
              "choices": { "A": ["…", "…", "…", "…"], "B": ["…"] },
              "answer": { "A": 2, "B": 0 },     // index for mc, value/text for others
              "accept": ["…"],                  // other right forms (short/numeric)
              "why": "…",                       // teacher-copy explanation
              "figure": null                    // optional inline SVG string (no answer labels)
            }
          ]
        }
      ],
      "slides": null,                          // for slides: [{title, bullets[], notes, figure}]
      "rubric": null                           // for rubric: {criteria:[{name, levels:[...]}]}
    }
  ],
  "checks": {                                // filled in by the checkers, never by the maker
    "blind": [ { "round": 1, "agent": "🙈 Blind tester (math)", "matched": 23, "of": 24,
                 "findings": [ { "where": "quiz A q7", "kind": "FIX", "what": "…", "fixed": "…" } ] } ],
    "wilco": [ { "round": 1, "chance": 0.25, "worst": [["longest", 0.31]], "pass": true } ],
    "solver": [ { "round": 1, "checked": 24, "disagree": 0 } ],
    "facts": [ { "round": 1, "claims": 31, "flagged": 1, "notes": "…" } ]
  },
  "log": [                                   // the reporter's log: every step, in order
    { "at": "14:02", "who": "📝 Maker", "what": "Wrote quiz A and B (24 questions)", "minutes": 11, "tokens": 182000, "cost": 1.42 }
  ],
  "audit": { "notes": ["…"], "briefChanges": ["agents/blind-math.md v3: …"] }
}
```

## What `render-pack.mjs` makes (one zip per order)

| File | What |
|---|---|
| `<doc>-student[-A|-B].pdf` and `.docx` | Student copies, in the teacher's style |
| `<doc>-teacher[-A|-B].pdf` and `.docx` | Teacher copies: the key in bold, `why` under each answer |
| `<doc>.pptx` | Slides and review games |
| `AUDIT-REPORT.pdf` | The reporter's report: what each agent did, every round, every catch and fix, time and cost |
| `project.json` | The pack itself, so the teacher can upload it again to change, reprint or make new versions |
| `README.txt` | What's inside, the AI notice, "check before students see it", and the delete notice |
| `SELL-IT-ON-TPT.pdf` | Only if ordered |

The brand name and notices come from `brand.config.json` only.
