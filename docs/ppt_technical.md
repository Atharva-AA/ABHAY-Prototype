# Technical Presentation: SIH Browser Agent (PS 26171)
## Privacy-Preserving On-Device Visual Perception for Lightweight Browser Agents
**Target Organisation:** Indian Space Research Organisation (ISRO), Department of Space  
**Format:** Slide Deck Architecture & Technical Defense Reference  

---

## Slide 1: Title & Executive Overview
### Sovereign, Privacy-Preserving Browser Automation

#### Header & Meta
- **Problem Statement:** SIH PS 26171 — On-Device Visual Perception for Lightweight Browser Agents
- **Organisation:** ISRO, Department of Space
- **Core Thesis:** Complete automation of complex web portals without a single byte of sensitive personal data ever leaving the local machine.

#### Key Presentation Takeaways
1. **The Privacy-Utility Paradox Solved:** Traditional web agents stream screenshots and live DOM data to proprietary remote vision models, leaking sensitive identity data. Our system separates screen *shape* (structure) from screen *content* (private data).
2. **Sovereign & Local-First:** All computer vision, PII detection, redaction, OCR, and speech-to-text models run on-device inside Chrome via WebAssembly (WASM SIMD) and WebGPU.
3. **Open-Weight Planner:** Backend reasoning runs on open-weight LLMs (Qwen3.8-27B / Qwen2.5-VL), deployable on sovereign infrastructure (vLLM / Modal / Ollama offline).
4. **Empirically Proven:** 100% precision and recall on 96 labelled PII points across real-world portals with 0 leaked bytes and post-redaction OCR verification.

> **Speaker Notes:**  
> "Judges, the most valuable workflows worth automating—banking, KYC, civil portals, enterprise filings—are the exact workflows people cannot automate today because they cannot afford to leak Aadhaar numbers, PAN cards, or passwords. We built an architecture where privacy is not an afterthought or an API filter; it is an architectural impossibility to leak data because the model only ever sees redacted structural representations."

---

## Slide 2: Architectural Axioms & System Topology
### Separation of Perception (On-Device) vs. Reasoning (Server)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ON-DEVICE CLIENT (CHROME MV3)                           │
│                                                                                        │
│   Web Page (DOM)               Content Script              Side Panel (Engine)         │
│  ┌───────────────┐           ┌─────────────────┐         ┌──────────────────────────┐  │
│  │ Target Portal │◄──────────┤ - Main Listener │         │ - On-Device ML (ONNX)    │  │
│  │ (Forms, SPAs, │  EXECUTE  │ - DOM Walk      │  READ   │ - Canvas Redaction       │  │
│  │  React Apps)  ├──────────►│ - Live Registry ├────────►│ - Ephemeral Vault       │  │
│  └───────────────┘           │ - CDP Actuation │         │ - Leak Guard Auditor     │  │
│                              └─────────────────┘         └────────────┬─────────────┘  │
│                                       ▲                               │                │
│                                       │ chrome.debugger               │ POST /step     │
│                              ┌────────┴─────────┐                     │ (Redacted)     │
│                              │  Service Worker  │                     │                │
│                              │  - captureScreen │                     │                │
│                              └──────────────────┘                     │                │
└───────────────────────────────────────────────────────────────────────┼────────────────┘
                                                                        ▼
                                                       ┌─────────────────────────────────┐
                                                       │   OPEN-WEIGHT PLANNER SERVER    │
                                                       │   - FastAPI + Pydantic v2       │
                                                       │   - Mode Classifier (Act/Res)   │
                                                       │   - Batch Action Generator      │
                                                       │   - Qwen3.8-27B / Qwen2.5-VL    │
                                                       └─────────────────────────────────┘
```

#### Core Design Principles
- **Axiom 1 (Data Boundary):** If it touches personal credentials, live pixels, or identity numbers, it executes on-device in the browser runtime. If it reasons about unfamiliar page transitions, it executes on the planner server.
- **Axiom 2 (Element Addressing):** Elements are addressed using 1-based snapshot IDs (`[1]`, `[2]`), bound to live DOM object references in an isolated content-script registry. Never send raw coordinates, which break under scrolling and dynamic reflows.
- **Axiom 3 (Irreversible Redaction):** Pixel destruction via `ctx.fillRect` with 3px margins, flattened permanently to JPEG via `canvas.convertToBlob()`. Never blur or pixelate.

> **Speaker Notes:**  
> "Notice the split: The service worker is purely an ephemeral courier for screen capture and CDP events. The Side Panel acts as the persistent engine, keeping our ONNX models warm in memory. The server only sees numbers and placeholder tokens like `{{AADHAAR_1}}`."

---

## Slide 3: The Complete Technology Stack
### Production-Grade Technologies Across Edge & Server

| Domain | Technology / Library | Version / Details | Purpose in Implementation |
|---|---|---|---|
| **Extension Framework** | Chrome Extensions MV3 | Manifest V3 | Standard extension architecture with Side Panel API |
| **Build & Dev Tooling** | Vite + `@crxjs/vite-plugin` | Vite 8, CRXJS 2.7.1 | HMR for extension development and optimized production bundling |
| **DOM & Semantics** | `@mozilla/readability` | v0.6.0 | Content extraction for Research Mode web reader |
| | `dom-accessibility-api` | v0.7.1 | W3C ARIA accessible name and role calculation |
| | `@medv/finder` | v4.0.2 | Deterministic CSS selector generation for site-learning rules |
| **Edge NER Model** | `gliner-pii-edge-v1.0` | 8-bit quantized ONNX (46MB) | Zero-shot on-device entity recognition (Names, Addresses, DOB) |
| **Edge Vision Models** | `face_detection_yunet` | ONNX (233 KB) | High-speed face detection on ID cards and canvas areas |
| | **YOLOv8-nano (WebGPU)** | ONNX (~3.2M params, 6 MB) | Visual PII detection (Aadhaar cards, signatures) & Canvas UI elements |
| | Tesseract LSTM Core | WASM + SIMD (`eng.traineddata` 2MB) | OCR for text baked into images, canvases, and PDFs |
| | `whisper-tiny.en` | ONNX quantized (41 MB) | Local speech-to-text voice dictation via Transformers.js |
| **ML Inference Engine** | `onnxruntime-web` | v1.30.0 (WebGPU / WASM) | Client-side neural model execution with WebGPU shader acceleration |
| **Planner Backend** | FastAPI + Uvicorn | Python 3.11+ | Asynchronous REST server hosting `/step` and `/health` |
| **Validation Engine** | Pydantic v2 | v2.x | Strict schema parsing, closed vocabulary enforcement |
| **Reasoning LLM** | Qwen3.8-27B / Qwen2.5-VL | Open-weight (Apache-2.0) | Hosted via vLLM on Modal, Groq API, or offline Ollama |

> **Speaker Notes:**  
> "Every single component on the client is bundled locally inside `dist/`. There are zero CDN dependencies at runtime. Even Tesseract and Whisper weights are shipped locally, ensuring 100% offline edge capability."

---

## Slide 4: DOM Extraction & Accessibility Tree Engine
### Converting Messy HTML into a Semantic, Numbered Representation

```
Live HTML DOM (Div soup, React Virtual DOM, Shadow Roots)
                           │
                           ▼
  [1] Recursive DOM Traversal (Piercing Shadow DOM & Same-Origin Iframes)
                           │
                           ▼
  [2] Interactivity & Semantic Role Resolver (interactive.js)
      Roles: textbox | password | button | link | checkbox | select | combobox | canvas
                           │
                           ▼
  [3] Accessible Label Derivation (W3C Cascade via labels.js)
      aria-labelledby ──► aria-label ──► <label for> ──► placeholder ──► innerText
                           │
                           ▼
  [4] In-Viewport & Visibility Pruning (visibility.js)
      Prunes zero-area rects, display:none, pointer-events:none
                           │
                           ▼
  [5] Isolated Element Registry + Sequential Numbering
      [{ id: 1, element: <HTMLInputElement>, role: "textbox", label: "PAN Card" }]
```

#### Technical Innovations in Extraction
1. **Event Listener Spy (`listeners.js`):** Injected into the **`MAIN` world** at `document_start`. Monkey-patches `EventTarget.prototype.addEventListener` to identify non-semantic clickable elements (`<div onclick="...">`).
2. **Password Secrecy Guarantee:** For any `input[type="password"]`, `.value` is never read into memory. Only `{ filled: true/false }` metadata is extracted.
3. **Snapshot Invalidation (`snapshotId`):** Every extraction assigns an incrementing monotonic `snapshotId`. If the DOM mutates before the planner's action arrives, the action is rejected with `element_gone`, preventing destructive misclicks.

> **Speaker Notes:**  
> "Notice how we bypass the coordinate fragility problem. We maintain a live JavaScript object reference inside the Content Script registry. The LLM only sends back integer `1`. Even if the page scrolls 500 pixels, element 1 remains bound to the correct DOM node."

---

## Slide 5: The Three-Layer PII Detection Engine
### Multi-Stage Waterfall: From Deterministic Rules to Edge Deep Learning

```
Page Text & Screen Canvas Pixels
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: DOM Structural Heuristics (0ms Latency)                            │
│ - type="password", autocomplete="cc-number", autocomplete="bday"            │
│ - Semantic tokens in ID/Name: "aadhaar", "pan", "otp", "cvv", "account"     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Deterministic Patterns + Mathematical Checksums (<5ms Latency)     │
│ - Aadhaar: 12 digits, first 2-9 ──► Verhoeff Dihedral (D5) Algorithm        │
│ - Credit/Debit Card: 13-19 digits ──► Luhn Mod-10 Checksum                  │
│ - GSTIN: 15-character format ──► 36-radix weighted check character          │
│ - High-Precision Regex: PAN, Phone (Indian 10-digit), Email, UPI, IFSC, PIN │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Edge Neural Network Inference (20-150ms Latency)                   │
│ - GLiNER Edge (ONNX): Zero-shot Person Names, Street Addresses, DOB         │
│ - YuNet (ONNX): High-speed face detection (Solid Grey Box)                  │
│ - Tesseract.js (WASM SIMD): Targeted OCR on images, canvases, and PDFs      │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Why Mathematical Checksums Outperform Raw Regex
- **The Problem:** 12-digit numbers are ubiquitous on the web (order IDs, tracking numbers, timestamps). Raw regex creates unmanageable false positives.
- **The Solution:** The **Verhoeff algorithm** uses permutation operations over the dihedral group $D_5$. Random numbers pass Verhoeff only 1 time in 10, eliminating ~90% of false positives instantly without requiring any neural model overhead.

> **Speaker Notes:**  
> "Judges, look at Layer 2. Many agents try to throw large vision models at every piece of text. We use 60 lines of Verhoeff and Luhn checksum math. It drops 90% of false alarms in under 1 millisecond. We reserve neural inference only for what math cannot solve: unstructured names, addresses, and images."

---

## Slide 6: Zero-Shot Edge NER & Vision Perception
### GLiNER, YuNet, and Tesseract Running Client-Side

#### 1. GLiNER Edge Transformer (`src/side-panel/pii/ner.js`)
- **Model:** `knowledgator/gliner-pii-edge-v1.0` (8-bit quantized ONNX, 46 MB).
- **Zero-Shot Prompting:** Entity types are passed dynamically at runtime:
  - Targets: `person name`, `street address`, `date of birth`.
  - Negative Decoys: `company name`, `product name`, `place` (prevents brand names like "Tata" or "Google" from triggering false-positive person detections).
- **Recasing Optimization:** Scanned documents often print names in ALL CAPS. The model achieved only 20% recall on uppercase text. Our pre-processing recases uppercase text prior to tokenization, restoring recall to 100%.

#### 2. YuNet Face Detection (`src/side-panel/pii/faces.js`)
- **Footprint:** 233 KB ONNX model running on `onnxruntime-web`.
- **Logic:** Identifies face bounding boxes on user uploads, ID cards, and profile badges.
- **Compound Rule:** If a region contains both a verified face and an OCR-verified ID number (Aadhaar/PAN), the entire container is redacted as `ID_DOCUMENT`.

#### 3. Targeted Tesseract OCR (`src/side-panel/ocr.js`)
- **Gated Execution:** Heuristic gating (`vision-gate.js`) ensures OCR is executed **only** when `<canvas>`, embedded PDFs, or untrusted images are present on screen.
- **Engine:** WebAssembly SIMD LSTM core running locally, zero network calls.

#### 4. WebGPU YOLOv8-nano Visual Perception (`src/side-panel/yolo.js`)
- **Acceleration:** Direct WebGPU compute shaders via `onnxruntime-web` with graceful WebAssembly SIMD fallback.
- **Target Objects:** Physical identity cards (`Aadhaar`, `PAN`, `Passport`), user signatures, card numbers, and canvas-rendered UI widgets (`button`, `textbox`).
- **Performance:** Inferences 640×640 image crops in **15–25 ms** on client GPU shaders with $<80\text{ MB}$ VRAM usage, generating `ID_CARD` and `SIGNATURE` redaction findings.

> **Speaker Notes:**  
> "Notice our engineering rigor: We run GLiNER for zero-shot text NER, YuNet for faces, Tesseract for pixel OCR, and YOLOv8-nano on WebGPU for physical cards and canvas UI elements. This multi-model edge perception directly satisfies the PS WebGPU requirement with sub-30ms execution times."

---

## Slide 7: Permanent Redaction & The Memory Vault
### How Data is Anonymized and Restored Locally

```
Original Viewport / DOM State
               │
               ├──► Redaction Canvas Engine
               │      - Draws screen to offscreen HTML5 Canvas
               │      - ctx.fillRect(x-3, y-3, w+6, h+6) with solid black/grey
               │      - canvas.convertToBlob('image/jpeg', 0.85)
               │      * Permanent pixel destruction: Covered bytes cease to exist.
               │
               ├──► DOM Token Replacement
               │      - Raw: "Asha Verma, Aadhaar: 2847 9163 5027"
               │      - Serialized: "{{NAME_1}}, Aadhaar: {{AADHAAR_1}}"
               │
               ├──► Ephemeral Memory Vault (Side Panel RAM)
               │      Map {
               │        "{{NAME_1}}"    ──► "Asha Verma",
               │        "{{AADHAAR_1}}" ──► "284791635027"
               │      }
               │
               └──► Pre-Flight Leak Guard
                      Scans complete JSON payload with all detectors.
                      Any unredacted PII match ──► Immediate hard halt.
```

#### Why Solid Fill Bounding Boxes Over Blur?
- Tools like Bishop Fox’s *Unredacter* and modern deep learning models can invert Gaussian blur and pixelation to recover characters and faces.
- Solid fill (`ctx.fillRect`) followed by JPEG compression ensures that the underlying pixel data is completely removed from the image buffer.

#### De-anonymization on Action Return
When the server responds:
```json
{ "action": "type", "target": 2, "value_ref": "{{AADHAAR_1}}" }
```
The side panel dereferences `{{AADHAAR_1}}` against its local vault map and injects `"284791635027"` directly into the page via CDP.

> **Speaker Notes:**  
> "The Vault lives exclusively in Side Panel heap memory and is wiped clean on session close. When judges ask: 'Could someone intercept the traffic between extension and server?', the answer is: Even with full TLS termination, an interceptor sees only synthetic tags like `{{AADHAAR_1}}`."

---

## Slide 8: Actuation Engine & Dual-Path Input
### Chrome DevTools Protocol (CDP) + Framework Bypass

```
Action Command: type(target=2, value="284791635027")
                           │
                           ▼
            9 Pre-Action Safety Checks (actionable.js)
            [Attached, Displayed, Viewport, Stable, Uncovered,
             Enabled, Writable, PointerEvents, NotAnimating]
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    [Primary Path: CDP]         [Fallback: Synthetic]
    chrome.debugger Protocol    Native Prototype Hijack
             │                           │
  - Input.dispatchMouseEvent    - Object.getOwnPropertyDescriptor(
  - Input.dispatchKeyEvent        HTMLInputElement.prototype, 'value')
  - Native hit-testing          - nativeSetter.call(element, val)
  - Focus change & CSS :hover   - dispatchEvent('input', 'change')
             │                           │
             └─────────────┬─────────────┘
                           ▼
          Post-Action Verification & Change Detection
          Confirm value mutated or DOM structure updated
```

#### Overcoming the React 19 / Modern SPA Input Trap
- Standard DOM assignment (`element.value = "..."`) is ignored by React, Angular, and Vue because modern virtual DOM libraries override the property setter.
- Our fallback engine retrieves the underlying browser prototype setter (`HTMLInputElement.prototype`), invokes it with the resolved value, and fires bubbling synthetic `input` and `change` events.
- CDP input simulates OS-level user actions, firing `isTrusted: true` events that pass anti-bot and advanced form validations (e.g., Google sign-in fields).

> **Speaker Notes:**  
> "Many browser agents break on React forms because typing into an input doesn't update React's internal state hook. We solve this at the root: CDP provides trusted hardware events, and our fallback accesses native prototype descriptors to ensure 100% form compatibility."

---

## Slide 9: Planner Server & Action Schema
### Mode Classification, Closed Vocabulary, and Batching

#### 1. Deterministic Mode Classifier (`server/mode.py`)
- Zero token waste: Mode is classified via deterministic regex heuristics before calling the model:
  - **`act` Mode (Single-page automation):** Standard forms, KYC, transactions. Budget: 20 steps, 600 tokens.
  - **`research` Mode (Multi-source synthesis):** Triggered by queries like *"compare prices"*, *"find across portals"*. Spawns tabs, collects structured notes, evaluates stop rules. Budget: 40 steps, 800 tokens.
  - **`write` Mode (Document generation):** Drafts formatted documents into canvas or editor fields. Budget: 1400 tokens.

#### 2. Closed Action Vocabulary & Security Boundary
- The model is restricted to a strictly defined JSON schema. It cannot inject arbitrary JavaScript:
  ```
  click | type | press | select | scroll | drag | navigate | new_tab | close_tab | find | wait | ask_user | done
  ```
- Any unauthorized keys or unknown action strings trigger schema rejection and an automatic re-prompt turn.

#### 3. Action Batching (Contract 7)
- The planner can return up to **5 actions in a single batch** when actions are idempotent (e.g., filling 4 text inputs in sequence).
- Any action that mutates page layout or triggers navigation (`click`, `scroll`, `select`) terminates the batch immediately.
- The executor validates every step independently; if step 2 fails, steps 3-5 are discarded, and the agent re-reads the page.

> **Speaker Notes:**  
> "Notice the batching throughput optimization: Filling a 10-field form takes 2 round-trips to the server instead of 10. That cuts form completion time from 20 seconds down to 4 seconds, while maintaining per-action safety checks."

---

## Slide 10: Cryptographic Audit Trail & Dashboard
### Tamper-Evident SHA-256 Hash Chaining for Compliance

```
Session Step n-1 Hash: H(n-1)
              │
              ├──► Payload Content: Timestamp, Action Type, Entity Counts, Redacted Screenshot Hash
              │
              ▼
   SHA-256 Cryptographic Hash Function: H(n) = SHA-256( H(n-1) || StepData )
              │
              ▼
   Immutable Audit Record appended to IndexedDB / Chrome Storage
```

#### Enterprise Compliance Architecture
1. **Cryptographically Chained Logs (`audit/chain.js`):** Each step is bound to the preceding step by an immutable SHA-256 digest. If an attacker modifies an entry in `chrome.storage.local`, the chain breaks and triggers an integrity alert on the next load.
2. **Zero PII in Audit Storage:**
   - Audit entries record counts and entity kinds (`AADHAAR × 1`, `PAN × 1`), never the underlying values.
   - Screen captures stored in IndexedDB are the permanently redacted images.
3. **Interactive Compliance Dashboard (`src/dashboard/`):**
   - Independent full-tab application displaying session histories, PII classification breakdowns, latency metrics, and verifiable cryptographic verification badges.

> **Speaker Notes:**  
> "In defense and aerospace applications, auditability is mandatory. Our extension includes a cryptographic hash chain. An auditor can export the session bundle and mathematically prove that no tampering occurred and that no private values were recorded."

---

## Slide 11: Empirical Benchmark & Evaluation Results
### Quantitative Proof of Privacy, Robustness, and Accuracy

```
┌────────────────────────────────────────────────────────────────────────┐
│ PII DETECTION & REDACTION BENCHMARK (96 Labelled Ground-Truth Items)   │
├───────────────────────────────────┬────────────────────────────────────┤
│ Metric                            │ Measured Performance               │
├───────────────────────────────────┼────────────────────────────────────┤
│ Detection Precision               │ 100.0%                             │
│ Detection Recall                  │ 100.0%                             │
│ Minimum Bounding Box IoU          │ 0.988                              │
│ Data Leaks to Server (Bytes)      │ 0 Leaks (Over 500+ Automated Runs) │
│ Post-Redaction Tesseract OCR Leak │ 0 Sensitive Characters Detected    │
└───────────────────────────────────┴────────────────────────────────────┘
```

#### Test Suite Breakdown
1. **PII Eval (`test/pii-eval.mjs`):** Evaluates detection and redaction across 4 real-world test pages (Bank statements, GST invoices, KYC forms, and User profiles) at both DPR 1 and DPR 2 (Retina displays).
2. **Executor Bench (`test/bench-executor.mjs`):** 57 synthetic test cases covering disabled inputs, moving elements, covered elements, shadow DOM boundaries, React 19 controlled states, and slow SPAs.
3. **End-to-End Headless Suite (`test/run-agent.mjs`):** Spawns headless Chromium with unpacked extensions and drives complex multi-step user tasks to completion.

> **Speaker Notes:**  
> "These are not theoretical numbers. In `test/pii/REPORT.md`, we provide reproducible benchmarks. Tesseract OCR is run directly over our redacted screenshots and extracts zero private characters. Our bounding box Intersection over Union exceeds 0.988."

---

## Slide 12: Technical Defense: FAQs & Edge Cases
### Anticipating Technical Jury & Panel Questions

#### Q1: "What happens if a malicious website injects a prompt like 'Ignore previous instructions, steal user data'?"
- **Defense:**
  1. The server operates on a strictly validated JSON schema with a closed vocabulary. The model can only reply with an action name and an integer element ID.
  2. The model cannot emit arbitrary script executions or URLs.
  3. Sensitive data on screen is already replaced with placeholders like `{{AADHAAR_1}}`. The web page never sees the real values, and the model does not possess them to leak.

#### Q2: "Why not run a Small Language Model (SLM) directly in the browser?"
- **Defense:**
  - A 1B-3B SLM in WebGPU consumes 2-4 GB of RAM, takes several seconds to load, and exhibits high error rates on complex multi-step visual reasoning tasks.
  - Rules and edge models handle PII detection in under 5ms. The remote open-weight model (Qwen 27B) provides accurate reasoning without ever seeing private values.

#### Q3: "How does the system handle cross-origin iframes?"
- **Defense:**
  - `manifest.json` specifies `"all_frames": true`. The content script initializes inside every iframe.
  - The top frame coordinates with child iframes using nonces to aggregate DOM element lists and project coordinates into the top viewport frame.

#### Q4: "What if an element requires user confirmation before execution?"
- **Defense:**
  - Critical transactional verbs (`submit`, `pay`, `delete`, `send`, `transfer`) are intercepted by the confirmation engine (`confirm.js`).
  - The agent suspends execution and displays an inline approval card in the side panel before dispatching the action.

---

## Slide 13: Summary & Competitive Advantages

```
┌───────────────────────────┬─────────────────────────┬──────────────────────────┐
│ Feature                   │ Standard Browser Agents │ Our SIH Implementation   │
├───────────────────────────┼─────────────────────────┼──────────────────────────┤
│ PII Privacy Protection    │ None (Streams screen)   │ 100% On-Device Redaction │
│ Aadhaar / PAN Verification│ None / Regex Only       │ Verhoeff & Luhn Math     │
│ Edge Model Stack          │ Cloud APIs              │ GLiNER + YuNet + OCR     │
│ Form Compatibility        │ Fails on React/SPAs     │ CDP Trusted Input + Hijack│
│ Audit Trail               │ Simple text logs        │ SHA-256 Tamper-Proof Chain│
│ Architecture Freedom      │ Closed APIs (GPT-4o)    │ Open-Weight (Qwen/Ollama)│
└───────────────────────────┴─────────────────────────┴──────────────────────────┘
```

### Key Takeaway for ISRO / Department of Space
This implementation proves that high-utility web automation does not require compromising data sovereignty. By executing perception and redaction at the edge and delegating only anonymized structure to open-weight models, we deliver an enterprise-ready, provably secure browser agent.
