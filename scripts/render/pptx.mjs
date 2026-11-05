// Slide decks and projector review games with pptxgenjs: a title slide, one slide per entry, speaker notes.

import PptxGenJS from 'pptxgenjs';
import { mathHtml, textToUnicode, plainMath } from './math.mjs';
import { vv, questionsOf, keyText, letter, inkAccent, kindOf } from './util.mjs';

function addFooter(slide, ctx) {
  slide.addText(`${ctx.brand.shortName || ctx.brand.name} · Made with AI · check before use`, {
    x: 0.4, y: 7.05, w: 12.5, h: 0.3, fontSize: 9, color: '555555', fontFace: ctx.font,
  });
}

// Text with math: plain Unicode text when the math is simple (x², ≤, π), else a picture of the typeset math.
async function addMathText(slide, text, ctx, box, opts) {
  const lines = Array.isArray(text) ? text : [text];
  const uni = lines.map((t) => textToUnicode(t));
  if (uni.every((u) => u != null) || !ctx.mathPng) {
    const t = lines.map((l, i) => uni[i] ?? plainMath(l));
    slide.addText(Array.isArray(text) ? t.map((b) => ({ text: b, options: opts.bulletOpts })) : t[0], { ...box, ...opts.text });
    return;
  }
  const dot = Array.isArray(text) && opts.bulletOpts?.bullet ? '<span style="flex:none;width:1em">•</span>' : '';
  const html = lines.map((l) => `<div style="display:flex;margin:0 0 ${opts.gapPt || 6}pt">${dot}<span>${mathHtml(l)}</span></div>`).join('');
  const png = await ctx.mathPng(html, { fontPt: opts.fontPt, width: Math.round(box.w * 96), font: ctx.font });
  const h = Math.min(box.h, png.height / 96), w = (png.width / 96) * (h / (png.height / 96));
  slide.addImage({ data: 'data:image/png;base64,' + png.data.toString('base64'), x: box.x, y: box.y, w, h });
}

async function addFigure(slide, fig, ctx, box) {
  const png = fig ? await ctx.figurePng(fig) : null;
  if (!png) return false;
  const ratio = png.width / png.height;
  let w = box.w;
  let h = w / ratio;
  if (h > box.h) { h = box.h; w = h * ratio; }
  slide.addImage({ data: 'data:image/png;base64,' + png.data.toString('base64'), x: box.x + (box.w - w) / 2, y: box.y, w, h });
  return true;
}

export async function deckPptx(doc, ctx) {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pres.title = doc.title;
  pres.company = ctx.brand.shortName || ctx.brand.name;
  const accent = inkAccent(ctx.style.accent).slice(1);
  const font = (ctx.font = ctx.style.font || 'Arial');
  const o = ctx.pack.order || {};

  const t = pres.addSlide();
  t.background = { color: 'FFFFFF' };
  t.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.35, fill: { color: accent } });
  t.addText(doc.title, { x: 0.8, y: 2.2, w: 11.7, h: 1.4, fontSize: 44, bold: true, color: accent, fontFace: font });
  t.addText([o.grade && `Grade ${o.grade}`, ctx.subjectLabel, o.topic].filter(Boolean).join(' · '), { x: 0.8, y: 3.7, w: 11.7, h: 0.6, fontSize: 22, color: '333333', fontFace: font });
  if (doc.directions) await addMathText(t, doc.directions, ctx, { x: 0.8, y: 4.5, w: 11.7, h: 0.9 }, { fontPt: 18, text: { fontSize: 18, color: '333333', fontFace: font } });
  t.addNotes(`${ctx.brand.aiNotice} ${doc.notes || ''}`.trim());
  addFooter(t, ctx);

  const entries = doc.slides?.length
    ? doc.slides.map((s) => ({ title: s.title, bullets: s.bullets || [], notes: s.notes || '', figure: s.figure }))
    : questionsOf(doc).map(({ q, n }) => {
        const ch = q.type === 'mc' ? vv(q.choices) || [] : [];
        return {
          title: kindOf(doc) === 'bellringer' ? `Day ${n}` : `Question ${n}`,
          tag: `Level ${q.level ?? ''} · ${q.skill || ''}`,
          prompt: vv(q.prompt),
          bullets: ch.map((c, i) => `${letter(i)}. ${c}`).concat(q.type === 'tf' ? ['True', 'False'] : []),
          notes: plainMath(`Answer: ${keyText(q)}${q.why ? `.  Why: ${vv(q.why)}` : ''}`),
          figure: vv(q.figure),
        };
      });

  for (const e of entries) {
    const s = pres.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: accent } });
    s.addText(e.title, { x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: accent, fontFace: font });
    if (e.tag) s.addText(e.tag, { x: 9.2, y: 0.45, w: 3.6, h: 0.4, fontSize: 12, color: '444444', align: 'right', fontFace: font });
    const hasFig = !!e.figure;
    const textW = hasFig ? 6.6 : 12.1;
    let y = 1.4;
    if (e.prompt) {
      await addMathText(s, e.prompt, ctx, { x: 0.6, y, w: textW, h: 1.6 }, { fontPt: 26, text: { fontSize: 26, color: '000000', fontFace: font, valign: 'top' } });
      y += 1.8;
    }
    if (e.bullets.length) {
      await addMathText(s, e.bullets, ctx, { x: 0.6, y, w: textW, h: 6.6 - y }, {
        fontPt: 24, gapPt: 8, bulletOpts: e.prompt ? { breakLine: true } : { bullet: true, breakLine: true },
        text: { fontSize: 24, color: '111111', fontFace: font, valign: 'top', paraSpaceAfter: 8 },
      });
    }
    if (hasFig) await addFigure(s, e.figure, ctx, { x: 7.5, y: 1.5, w: 5.3, h: 5.1 });
    if (e.notes) s.addNotes(plainMath(e.notes));
    addFooter(s, ctx);
  }
  return pres.write({ outputType: 'nodebuffer' });
}
