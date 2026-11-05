# Capability test: review apps and interactive worksheets

Not a sample for the gallery (it is not in `samples/index.json`). It proves the `interactive` and `reviewapp` kinds
(docs/KINDS-APPS.md) through the preview, the review page's agreement and the final:

```
node scripts/render-pack.mjs samples/_cap-apps --preview
# open out-preview/REVIEW.html, tick the boxes, type a name, "I agree", save the file as samples/_cap-apps/approval.json
node scripts/render-pack.mjs samples/_cap-apps --final
node checks/apps.mjs samples/_cap-apps/pack.json --shots <a folder outside the repo>
```

Made-up teacher (Ms. Okafor), grade 6 science, weather. The poem is Christina Rossetti's "Who Has Seen the Wind?"
(Sing-Song, 1872, public domain). Only Wilco's scripts ran on it (keys, test-wise, apps); no blind tester, solver or
fact checker did, and its 7 choice questions are too few for the test-wise bots to judge.
