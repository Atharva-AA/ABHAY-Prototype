# SIH Browser Agent

A Chrome (Manifest V3) extension that operates a web page for you. Type a goal
in the side panel ("fill in my KYC details and submit"), press **Run**, and the
agent works step by step: it reads the page, asks the planner server what to do
next, performs it, checks that it really worked, and repeats. The panel is a
chat: each step appears as a line you can expand, and when the run ends you can
type a follow-up and carry on in the same conversation.

The server may answer with up to five actions at once when none of them changes
the page — four form fields are filled in one call, not four. Anything that
could change the page (a click, a select, a scroll) ends the batch, and the
executor still checks and verifies every action on its own.

Clicks on anything that submits, pays, sends, deletes or confirms wait for you
to approve them.

**Private values never leave the machine.** Before every send, the panel finds
the PII on the page — Aadhaar, PAN, GSTIN, card, phone, email, UPI, IFSC, PIN
code, account number, passwords and OTPs — replaces it in the text with typed
placeholders like `{{AADHAAR_1}}`, and paints solid black boxes over it in the
screenshot. The real values stay in panel memory. When the model answers
`{"action":"type","target":2,"value_ref":"{{AADHAAR_1}}"}`, the panel puts the
real number back locally and types it. A last check scans the finished package
and blocks the send if anything private is still in it.

Measured on 96 labelled items across four pages: 100% precision and recall,
minimum redaction IoU 0.988, zero leaks, and Tesseract reads nothing sensitive
off the images sent — [test/pii/REPORT.md](test/pii/REPORT.md).

**Real clicks and keystrokes.** While a run is active Chrome shows a bar,
*"SIH Browser Agent" started debugging this browser*. That is the extension
using Chrome's debugger API to click, type and press keys the way a person
does: the browser itself hit-tests the point and moves focus. Apps like Gmail
ignore simulated events — a recipient field only appears after a real click.
The bar goes away when the run ends; pressing **Cancel** on it makes the agent
fall back to simulated events. Nothing about this sends data anywhere.

**Boxes.** While the agent works, every element it can see gets a numbered,
coloured box on the page (dashed for a field the page has not opened yet). The
numbers are the ids the model is given. The boxes come down before every
screenshot and every action; the **Boxes** button in the panel turns them off.

> Not in this version: vision models (faces, ID cards, OCR), names and
> addresses (no NER model yet), and the encrypted credential store. Use fake
> data.

## Requirements

- Node.js 18 or newer
- Google Chrome
- Python 3.11 or newer, for the planner server
- A Groq API key, for Qwen3.8-27B (or any OpenAI-compatible endpoint serving
  a Qwen model, such as Ollama offline)

## Run it

**1. Install dependencies** (first time only)

```bash
npm install
```

**2. Start the planner server** (see [server/README.md](server/README.md) for details)

```bash
cd server
python3 -m venv .venv                       # first time only
.venv/bin/pip install -r requirements.txt   # first time only
cp .env.example .env                        # first time only, then add your key
.venv/bin/uvicorn main:app --port 8000 --reload
```

Check it with `curl http://localhost:8000/health`.

**3. Build the extension**

```bash
npm run build
```

This creates the `dist/` folder.

**4. Load it into Chrome** (first time only)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the **`dist`** folder. Choose `dist`, not the project folder.
4. Click **Details** on the extension and turn on **Allow access to file URLs**.
   Without this, the extension can't read the test pages when they're opened from disk.

**5. Try it**

1. Open `test/pages/kyc-test.html` in Chrome by dragging the file into a tab.
2. Click the extension icon in the toolbar. Pin it from the puzzle-piece menu if you can't see it. The side panel opens.
3. Type a goal, for example `fill in my KYC details and submit`, and click **Run**.

The chat shows every step in plain words — "Read the page · 7 elements",
"Filled 4 fields", "Clicked Submit" — and each line expands to the raw
action, the element it resolved to, the result and the timings. The model's
reasoning appears as a quiet **Thinking** note; what the agent tells you — a
question, the final **Done** answer, an error — is a labelled bubble, so the
two are never confused. **Details** in
the header swaps to the dense log of the same run. When the agent needs something
from you it asks in the thread and you answer in the same box you typed the
goal into — there is only ever one input. After it finishes, type a follow-up:
earlier goals travel with it as context.

## While you're coding

Run this once and leave it running:

```bash
npm run watch
```

Then, every time you change a file:

1. Save the file. `dist/` is rebuilt automatically.
2. In `chrome://extensions`, click **↻ (reload)** on the extension card.
3. Reload the web page you are testing, then click **Run** again.

You only need **Load unpacked** once. Chrome remembers the folder.

| Command | What it does |
|---|---|
| `npm run build` | Builds `dist/` once. |
| `npm run watch` | Rebuilds `dist/` every time you save. **Use this while coding.** |
| `npm run dev` | Live dev server with auto-reload (see below). Click ↻ once if the server restarts. |
| `npm run test` | Unit tests for the PII detectors, checksums, vault and leak guard. |
| `npm run bench` | Builds, then runs the executor bench in headless Chromium (see [Testing](#testing)). |
| `npm run eval:pii` | Builds, then measures PII detection, redaction and leaks (see [Testing](#testing)). |

## Project structure

```
src/                                 the extension (what you edit)
  manifest.json                      tells Chrome what the extension contains
  service-worker/
    service-worker.js                relays READ / EXECUTE to the pinned tab, takes the screenshot, navigates
    cdp.js                           trusted clicks, typing and key presses through chrome.debugger
  content-script/                    runs inside web pages
    content-script.js                message router: GET_DOM → dom-extraction, EXECUTE → action
    dom-extraction/                  READING the page
      extract.js                     the six steps: walk, clean up, number, pick; registry + snapshotId
      interactive.js                 can this element be clicked or typed into
      visibility.js                  is it drawn, is it on screen
      labels.js                      element names and roles
      listeners.js                   runs in the page's own JS, remembers click handlers
      serialize.js                   the compact [1]<input …> text form
      locate.js                      where a PII finding is drawn (one box per rendered line)
      highlight.js                   the numbered boxes over what the agent sees
    action/                          ACTING on the page
      executor.js                    perform one action, then verify it really happened
      input.js                       asks the worker for trusted input; false means fall back to simulated
      actionable.js                  the nine pre-action checks (attached, visible, stable, not covered…)
      setvalue.js                    writing values so React / Vue / Angular notice
  side-panel/
    side-panel.html                  the chat: header, thread, Details view, composer
    side-panel.js                    the agent loop, and what it says in the chat
    planner.js                       redacts, POSTs the package, checks the reply, resolves tags
    pii/                             PRIVACY: nothing private leaves the panel
      pii.js                         find it: three layers over every string on the page
      checksums.js                   Verhoeff (Aadhaar), Luhn (card), GSTIN check character
      redact.js                      hide it: tags in the text, black boxes in the screenshot
      vault.js                       hold it: tag → real value, panel memory only
      leakguard.js                   last check before sending; a hit blocks it
    chat.js                          messages, step rows, inline questions, live indicator
    phrases.js                       results turned into one-liners ("Filled 4 fields")
    timeline.js                      the Details view: one dense line per event
server/                              planner server (Python, FastAPI) — see server/README.md
  main.py                            POST /step, GET /health
  prompt.py                          the system prompt and element-list rendering
  schema.py                          validates every model reply before it reaches the extension
test/                                everything the agent is tested against
  pages/
    test-page.html                   a simple form
    kyc-test.html                    fake KYC form: tests all three PII paths, labelled for the eval
    pii-bank.html                    statement: accounts, IFSC, UPI, cards, a cross-origin frame
    pii-invoice.html                 GST invoice: GSTINs, PANs, SKUs, order numbers
    pii-profile.html                 settings: PII in inputs, nav, footer, frames, hidden text
    react-test.html                  the same KYC form in React 19, re-rendering every 500 ms
    slow-spa.html                    a video site that reacts 900 ms after a click
    executor-cases.html              one control per executor case (covered, disabled, moving, shadow DOM…)
    compose-cases.html               Gmail's compose shapes: fields mounted on click, real-click-only rows, press
    react-cases.html                 React controlled inputs that accept, reformat or refuse input
  pii/
    checksums.test.mjs               Verhoeff, Luhn and GSTIN, against generated numbers
    pii.test.mjs                     detection, redaction, vault and leak guard
    lab.html                         loads the panel's privacy modules for the eval
    REPORT.md                        the measured results
    results.json                     every labelled item, scored
  bench-executor.mjs                 the executor bench
  pii-eval.mjs                       precision, recall, IoU, leaks, OCR and latency
  run-agent.mjs                      drives the real panel end to end, headless
  harness.mjs                        static server + headless Chromium with the extension
eval/                                does the model pick the right element?
  cases.json                         goal → expected element, per saved page
  states/                            saved screen states (panel → Details → Save state)
  run.py                             sends each case to the server, prints accuracy
docs/                                design documents
  ARCHITECTURE.md                    the full system design and roadmap
  CONTRACTS.md                       data shapes passed between the parts
  arc-flow-struct.png                architecture diagram
  guide.html                         illustrated walkthrough of the extension skeleton
  dom-extraction.html                how the page reader works, with diagrams
  how-it-works.pdf                   the whole system: extraction, executor, loop, server, tests
  how-it-works.html                  its source
  render-pdf.mjs                     rebuilds the PDF from the HTML (headless Chromium)
dist/                                built extension (generated; never edit by hand)
```

Each part of the extension has its own folder, named after the Chrome
concept it is. New files for a part go in that part's folder.

## How it works

An extension is several small programs that can't see each other.
They talk by sending messages. One step of the loop:

```
 Side panel ──"READ"─────► Service worker ──"GET_DOM"──► Content script
 (the loop)                (screenshot)                  dom-extraction/: elements, text, snapshotId
     │
     ├── pii/: find it ──"LOCATE"──► Content script (where is it drawn?)
     │         hide it: {{AADHAAR_1}} in the text, black boxes in the screenshot
     │         guard it: scan the finished package; a hit blocks the send
     │
     ├──POST /step (goal, redacted elements, legend, image)──► Server ──► model
     │◄──────── one to five validated actions ─────────────────┘
     │
     └── for each action, until one is not ok:
          ├── value_ref? put the real value back, from panel memory
          ├── irreversible click? ask you first
          └──"EXECUTE"────────► Service worker ──"EXECUTE"──► Content script
                                                              action/: checks → act → verify
     ◄───────────────── ok | no_change | element_gone | blocked | error
```

1. When you click **Run**, the panel pins the current tab for the whole run.
2. The content script reads the page and numbers its elements. Every read gets a new `snapshotId`.
3. The panel finds every private value — in the fields, the labels, the page's
   text, and in your own goal, answers and history — replaces each with a typed
   placeholder (`{{AADHAAR_1}}`), and paints a solid black box over it in the
   screenshot. It asks the content script exactly where each one is drawn, so a
   number inside a paragraph is covered and the paragraph is not. Passwords and
   OTPs are never read at all. Then it scans the finished package once more,
   with every detector on, and refuses to send if anything private survived.
4. The panel sends the goal, the redacted elements, the legend of placeholders,
   the redacted screenshot and the history so far to the server.
5. The server asks the model what to do and validates every action: a known action and a target number from the list, nothing else — and any placeholder it uses must be one the legend offered. It may return up to five, but only if none of them changes the page — a click, select, scroll or navigate ends the batch.
6. If an action carries `value_ref`, the panel resolves it to the real value from its own memory, just before the action goes to the page. That value never touched the network.
7. Clicks on Submit / Pay / Delete / Send / Confirm / Buy / Transfer wait for your approval, asked when that click is next.
8. The content script refuses an action if the page was read again since, or if it is not the next action of the batch that consumed the snapshot (`element_gone`). Otherwise it runs nine checks (still attached, visible, enabled, not covered…), acts, and then looks for evidence that something changed.
9. The batch stops at the first action that is not `ok`; the loop re-reads and the model re-plans from where the page actually got to.
10. A click that showed nothing gets one patient retry: the loop waits 1.2 s, reads the page again, and only then believes it failed. Heavy sites take a second or more to react to a click.
11. Every result goes into the history, and the loop repeats. It stops on `done`, after 20 steps, or when you press **Stop**. The conversation stays, so you can type a follow-up.

### Seeing what was sent

Expand any **Read the page** row in the chat: it lists what was found (by kind,
never by value), the placeholders, the timings, and a thumbnail of the exact
image that was sent. Click the thumbnail for full size, or **Open in new tab**.
If the leak guard blocks a step, that row opens by itself and shows the image
that was stopped.

**Details → Highlight** reads the page now and draws a numbered box over every
element the model would see (dashed for a field the page has not opened yet).
The numbers match the ids in a saved state. It is the quickest way to find out
why the agent cannot see a field; the boxes vanish before any screenshot is
taken and after 8 s.

### Why solid boxes, not blur

The problem statement says "blurring faces". Blur and pixelation are
reversible: Bishop Fox's Unredacter reconstructs pixelated text, and published
work has recovered faces and handwritten digits through blurring and mosaicing.
A solid fill, flattened into a new JPEG by `canvas.convertToBlob()`, leaves
nothing to recover — the covered pixels stop existing in the file. That is a
security argument, not a deviation.

## Testing

**Executor bench**: 57 cases with known ground truth, run through the real
extension in headless Chromium. It measures the success rate, the false-success
rate (reported `ok` but nothing happened) and latency.

```bash
npm run bench
node test/bench-executor.mjs --reps 1 --only "Pay later"   # one case
node test/bench-executor.mjs --no-cdp                      # simulated events only (the fallback path)
```

**PII unit tests**: no browser, no server.

```bash
npm run test
```

**PII eval**: measures detection, redaction and leaks through the real
extension on the four labelled pages, at dpr 1 and at dpr 2 (a Retina screen).
Writes [test/pii/REPORT.md](test/pii/REPORT.md) and images to `test/pii/out/`.
Install Tesseract (`brew install tesseract`) for the OCR check, or pass
`--no-ocr`.

```bash
npm run eval:pii
node test/pii-eval.mjs --dpr 2 --only bank --reps 3
```

**Model eval**: needs the server running.

```bash
server/.venv/bin/python eval/run.py
server/.venv/bin/python eval/run.py --only github
```

To add a page to the eval, open it in Chrome, click **Details** then **Save
state** in the side panel, move the downloaded file into `eval/states/`, and add
cases to `eval/cases.json`.

**End to end**: needs the server running and `npm run build` done. It opens the
real panel in headless Chromium, drives a real page and prints the log.

```bash
node test/run-agent.mjs --page test/pages/react-test.html \
  --goal "fill in my KYC details: name Asha Verma, phone 9876543210, then submit"
node test/run-agent.mjs --page test/pages/slow-spa.html --goal "play the Testing video" --trace-ui
```

`--followup` adds a second goal in the same conversation, `--answer` replies to
an `ask_user`, `--deny` cancels confirmations, `--stop-after 1200` presses Stop
mid-run, and `--shot panel.png` saves screenshots of the chat and Details view.

`--capture payloads.json` saves every package the panel POSTs, with each
redacted image beside it, and re-checks them for leaks — what devtools Network
would show. `--disable AADHAAR` switches that detector off in the panel to show
the leak guard blocking the send, and `--dpr 2` runs at Retina scale.

```bash
node test/run-agent.mjs --page test/pages/kyc-test.html \
  --goal "type the Aadhaar number from the Aadhaar Number field into Confirm Aadhaar Number" \
  --capture payloads.json
```

## Why the `dist/` folder?

Chrome can't run the files in `src/` as they are. For example, the code says
`import browser from 'webextension-polyfill'`, and Chrome doesn't know where
that package lives (it's inside `node_modules`).

**Vite** (the build tool) reads `src/`, pulls in everything the code imports,
and writes plain files Chrome can run into **`dist/`**.

> `src/` is the recipe. `dist/` is the cooked meal. Chrome only eats the meal.

That's why you load `dist/` into Chrome and rebuild after changing `src/`.

## How `npm run dev` works (in simple words)

`npm run build` puts **the real code** in `dist/`.
`npm run dev` works differently: it puts **only pointers** in `dist/` and serves
the real code from a small web server running on your computer.

### Step by step

**1. A local server starts.**
`npm run dev` starts a web server at `http://localhost:5173`.
It serves your `src/` files straight from disk, converting them on the fly.

**2. `dist/` is filled with pointer files.**
For example, `dist/service-worker-loader.js` contains only:

```js
import 'http://localhost:5173/@vite/env';
import 'http://localhost:5173/@crx/client-worker';
import 'http://localhost:5173/src/service-worker/service-worker.js';
```

It has none of your code. It just says: "go get the code from `localhost:5173`."

**3. Chrome loads the extension.**
Chrome opens `dist/`, reads the pointer files, and downloads the real code
from `localhost:5173`.

**4. A WebSocket connection opens.**
One of the downloaded files (`@crx/client-worker`) opens a WebSocket from
the extension to the server. A WebSocket is a connection that stays open,
so the server can send a message to Chrome at any time.

**5. You save a file.**
The server notices the change and sends a message down the WebSocket:
*"this file changed."*

**6. The extension reloads itself.**
The extension receives that message and reloads. Because `dist/` still points
to `localhost:5173`, Chrome downloads the **new** code, so your change appears
without you clicking ↻.

### Picture

```
  YOU SAVE src/service-worker/service-worker.js
          │
          ▼
 ┌──────────────────────┐   5. "file changed"    ┌────────────────────────┐
 │  Vite dev server     │ ─────────────────────► │  Chrome extension      │
 │  localhost:5173      │      (WebSocket)       │                        │
 │                      │                        │  6. reloads itself     │
 │  serves src/ files   │ ◄───────────────────── │                        │
 └──────────────────────┘   3. "give me the      └───────────┬────────────┘
                               latest code"                  │ reads
                                                             ▼
                                                 ┌────────────────────────┐
                                                 │  dist/  (pointers)     │
                                                 │  "code lives at        │
                                                 │   localhost:5173"      │
                                                 └────────────────────────┘
```

### The catch

- The terminal running `npm run dev` **must stay open.** If the server stops,
  the pointers in `dist/` point at nothing and the extension breaks with
  *"An unknown error occurred when fetching the script."*
- After you stop dev mode, run `npm run build` (or `npm run watch`) and click ↻,
  so `dist/` contains real code again.

### Known issues (plugin, not our code)

With `@crxjs/vite-plugin` 2.7.1 and Vite 8:

- **Dev mode works while the server keeps running.**
- **If the dev server restarts** (you restart `npm run dev`, Vite restarts itself,
  or your laptop sleeps), the WebSocket drops. The plugin then crashes with
  `__LIVE_RELOAD__ is not defined` and doesn't reconnect.
  **Fix:** click ↻ on the extension once.
- **Lots of red `Object` / "back/forward cache" errors** from `client-worker:41`
  in the service worker console are harmless. Each web page keeps a small
  connection to the extension in dev mode; when you navigate away, that
  connection closes and the plugin logs it as an error. Ignore them, or type
  `-lastError` in the console Filter box to hide them.

If dev mode gives you trouble, use `npm run watch` + ↻ instead.

## Seeing logs and debugging

Each part of the extension has its **own** DevTools console:

| Part | How to open its console |
|---|---|
| Service worker (`service-worker.js`) | `chrome://extensions` → extension card → **Inspect views: service worker** |
| Side panel (`side-panel.js`) | Right-click inside the side panel → **Inspect** |
| Content script (`content-script.js`) | Right-click the web page → **Inspect** → Console |
| Errors from all parts | **Errors** button on the extension card |

Notes:

- The service worker console only shows logs from **after** you open it.
  Keep it open and click ↻ to catch startup logs.
- **"service worker (inactive)"** means Chrome paused it to save memory.
  That's normal; it wakes up on the next message.
- The Errors page keeps old errors until you click **Clear all**.

## Troubleshooting

| You see | Do this |
|---|---|
| `activeTab permission is not in effect` | Extension **Details** → turn on **Allow access to file URLs** and set **Site access** to **On all sites** → click ↻. |
| `Receiving end does not exist` | Reload the web page. (The worker also tries to fix this automatically.) |
| `An unknown error occurred when fetching the script` | `dist/` is still in dev mode. Run `npm run build` and click ↻. |
| Nothing happens on `chrome://` pages | Expected. Chrome blocks extensions on its own pages. |
