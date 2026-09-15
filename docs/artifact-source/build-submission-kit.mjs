import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const fields = await read("docs/submission-fields.md");
const story = await read("docs/devpost-submission.md");
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const section = (name) => fields.split(`## ${name}\n`)[1]?.split(/\n## /)[0].trim() ?? "";
const panels = [
  ["links", "Project links and status", section("Project links")],
  ["story", "Project story", story],
  ["pitch", "Elevator pitch", section("Elevator pitch")],
  ["testing", "Testing instructions", section("Testing instructions for judges")],
  ["video-title", "YouTube title", section("YouTube title")],
  ["video-description", "YouTube description", section("YouTube description")],
  ["open-source", "Open Source fields", section("Additional Open Source fields")],
  ["feedback", "Product feedback", section("Product feedback field")],
];
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KindHandoff | Submission kit for Shivam Gupta</title>
<style>
:root{font-family:Inter,Arial,sans-serif;color:#172b44;background:#f4f7fc;line-height:1.6}*{box-sizing:border-box}body{margin:0}header{background:#13263e;color:white;padding:56px max(6vw,20px)}header small{color:#a9c5fa;letter-spacing:.15em}h1{font-size:clamp(38px,6vw,64px);line-height:1.08;letter-spacing:-.04em;margin:20px 0}header p{max-width:720px;color:#d1dff2}main{max-width:1180px;margin:auto;padding:36px 20px}.links,nav{display:flex;flex-wrap:wrap;gap:10px}a{color:#244ea2}header a{color:#c1d8ff}.links a,nav a{border:1px solid #ced9e9;border-radius:9px;padding:9px 14px;text-decoration:none}header .links a{border-color:#486381}section{background:white;border:1px solid #dfe6f0;border-radius:16px;padding:24px;margin:24px 0;scroll-margin-top:20px}.heading{display:flex;align-items:center;justify-content:space-between;gap:20px}h2{font-size:22px;margin:0 0 16px}button{font:inherit;font-weight:600;white-space:nowrap;border:0;border-radius:9px;padding:9px 16px;background:#2e5cba;color:white;cursor:pointer}button:focus-visible,a:focus-visible{outline:3px solid #89b3ff;outline-offset:3px}textarea{width:100%;resize:vertical;border:1px solid #dbe3ef;border-radius:9px;padding:16px;font:15px/1.6 ui-monospace,Menlo,monospace;color:#233b55;background:#f9fbff}.hint{font-size:14px;color:#59718b}.status{min-height:24px;color:#315c43;font-size:14px}footer{padding:16px 0 40px;color:#59718b;font-size:14px}@media(max-width:600px){section{padding:18px}.heading{align-items:flex-start}button{font-size:14px}textarea{font-size:14px}}
</style>
<header><small>CARE, CARRIED FORWARD</small><h1>KindHandoff<br>Submission kit.</h1><p>Prepared for Shivam Gupta. Copy the field-ready story, testing instructions, video copy, and product feedback. The working app and reproducible source are linked below.</p><div class="links"><a href="https://kindhandoff.web.app">Open the app</a><a href="https://github.com/shi1720/Amazon-Developer-Hackathon">Source code</a><a href="https://youtu.be/t7e00FzIk2M">Public YouTube demo</a><a href="KindHandoff-Demo.mp4">Download MP4</a><a href="https://devpost.com/software/kindhandoff">Devpost draft</a><a href="KindHandoff-Captions.srt">Captions</a><a href="KindHandoff-Pitch.pdf">Pitch deck</a><a href="KindHandoff-Judge-Brief.pdf">Judge brief</a></div></header>
<main><nav aria-label="Submission fields">${panels.map(([id, title]) => `<a href="#${id}">${escape(title)}</a>`).join("")}</nav><p class="hint">Copy preserves Markdown. The demo uses a clearly disclosed AI voice and fictional household. The public YouTube video has verified signed-out playback and uploaded English captions. Devpost project 1184871 exists as a draft and has not been submitted.</p>
${panels.map(([id, title, content]) => `<section id="${id}"><div class="heading"><h2>${escape(title)}</h2><button type="button" data-copy="${id}-text">Copy field</button></div><textarea id="${id}-text" aria-label="${escape(title)}" readonly rows="${Math.min(22, Math.max(3, content.split("\n").length + 1))}">${escape(content)}</textarea><div class="status" role="status" aria-live="polite"></div></section>`).join("")}
<footer>Created by Shivam Gupta. Alexa+ simulated-experience track and Open Source mini challenge. Public submission status is recorded in <a href="https://github.com/shi1720/Amazon-Developer-Hackathon/blob/main/docs/release-status.md">release status</a>.</footer></main>
<script>document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const area=document.getElementById(button.dataset.copy);const status=button.closest('section').querySelector('.status');try{await navigator.clipboard.writeText(area.value);status.textContent='Copied. Ready to paste into the submission field.';}catch{area.focus();area.select();status.textContent='Text selected. Use your keyboard copy shortcut.';}}));</script></html>`;
const output = new URL("docs/deliverables/KindHandoff-Submission-Kit.html", root);
await writeFile(output, html);
console.log(`Created ${fileURLToPath(output)}`);
