import { verticalSlice } from "./Data/chapter01.js";

const $ = (selector) => document.querySelector(selector);
const allRecords = [...verticalSlice.documents, ...verticalSlice.cases];
const records = Object.fromEntries(allRecords.map((record) => [record.id, record]));
const normalise = (text) => text.toLowerCase().replace(/[\s_-]/g, "").replace(/[^\p{L}\p{N}]/gu, "");

const state = {
  mode: "BOOT",
  focus: "none",
  currentId: verticalSlice.startDocument,
  filter: "ALL",
  history: [verticalSlice.startDocument],
  historyIndex: 0,
  recent: [],
  visited: new Set(),
  completedCases: [],
  phoneRead: false
};

const progress = () => state.completedCases.length;
const isComplete = (caseId) => state.completedCases.includes(caseId);
const canOpen = (record) => record && record.access <= progress();

function setMode(mode) {
  state.mode = mode;
  const scene = $("#game-scene");
  scene.dataset.mode = mode;
  scene.classList.remove("mode-BOOT", "mode-MONITOR", "mode-DESK", "mode-NOTE", "mode-PHONE");
  scene.classList.add(`mode-${mode}`);
}

function setFocus(focus) {
  state.focus = focus;
  $("#game-scene").dataset.focus = focus;
}

function setStatus(message) {
  $("#system-message").textContent = `STATUS: ${message}`;
}

function renderMarkup(text) {
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, label) => {
    const record = records[id];
    if (!canOpen(record)) return `<span class="wiki-link-locked">${label} [LOCKED]</span>`;
    return `<button class="wiki-link" type="button" data-document="${id}">${label}</button>`;
  });
}

function visibleRecords() {
  const query = $("#search-input").value.trim().toLowerCase();
  return allRecords.filter((record) => {
    if (!canOpen(record)) return false;
    const filterMatch = state.filter === "ALL" || record.type === state.filter;
    const searchableText = `${record.id} ${record.title} ${record.type} ${record.searchTerms.join(" ")} ${record.sections?.map((section) => section.text).join(" ") || ""} ${record.prompt || ""}`.toLowerCase();
    const queryMatch = !query || searchableText.includes(query);
    return filterMatch && queryMatch && (record.listed !== false || Boolean(query));
  });
}

function renderFileList() {
  const entries = visibleRecords();
  $("#file-list").innerHTML = entries.length
    ? entries.map((record) => `<button class="file-button ${record.id === state.currentId ? "current" : ""} ${record.type === "C" ? "case-file-button" : ""}" type="button" data-document="${record.id}"><span>${record.type}</span> ${record.id} ${record.title}</button>`).join("")
    : "<div class=\"file-button\">NO MATCH</div>";
  $("#search-result").textContent = $("#search-input").value.trim() ? `${entries.length} FILE(S)` : "";
  [...$("#index-types").querySelectorAll("button")].forEach((button) => button.classList.toggle("selected", button.dataset.filter === state.filter));
}

function renderRecent() {
  $("#recent-list").innerHTML = state.recent.length
    ? state.recent.slice(0, 3).map((id) => `<button type="button" class="recent-button" data-document="${id}">${id}</button>`).join(" ")
    : "—";
}

function renderArchiveHeader() {
  const currentCase = Math.min(progress() + 1, verticalSlice.cases.length);
  $("#case-progress").textContent = `CASE ${String(currentCase).padStart(2, "0")} / ${String(verticalSlice.cases.length).padStart(2, "0")}`;
}

function renderHistoryControls() {
  return `<div class="doc-history"><button type="button" id="history-back" ${state.historyIndex === 0 ? "disabled" : ""}>◀ PREV</button><button type="button" id="history-next" ${state.historyIndex === state.history.length - 1 ? "disabled" : ""}>NEXT ▶</button></div>`;
}

function renderStandardDocument(document) {
  const meta = document.meta.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
  const sections = document.sections.map((section) => `
    <section class="doc-section">
      <h3>${section.heading}</h3>
      ${section.quote ? `<div class="record-quote">${renderMarkup(section.text)}</div>` : `<p>${renderMarkup(section.text)}</p>`}
    </section>`).join("");
  const anomaly = progress() === verticalSlice.cases.length && document.id === "I-014"
    ? "<div class=\"record-quote record-amendment\">LAST MODIFIED: <b>2027.03.14</b> / EDITOR: [UNRESOLVED]</div>"
    : "";
  return `
    ${renderHistoryControls()}
    <div class="doc-document-id">${document.id} / ${document.typeName}</div>
    <h2 class="doc-heading">${document.title}</h2>
    <div class="doc-meta">${meta}</div>
    ${sections}
    ${anomaly}
    <div class="doc-related"><span>RELATED:</span> ${document.related.map(([id, label]) => renderMarkup(`[[${id}|${label}]]`)).join(" / ")}</div>`;
}

function renderCasePrompt(puzzle) {
  const fill = isComplete(puzzle.id)
    ? `<span class="wiki-blank filled">${puzzle.answerLabel}</span>`
    : "<span class=\"wiki-blank\" aria-label=\"채워야 하는 빈칸\">____________</span>";
  return puzzle.prompt.replace("[blank]", fill);
}

function renderCaseDocument(puzzle) {
  const verified = puzzle.evidence.filter((id) => state.visited.has(id)).length;
  const complete = isComplete(puzzle.id);
  const nextCase = verticalSlice.cases.find((caseFile) => caseFile.access === puzzle.unlocks);
  const leads = puzzle.leads.map(([id, label]) => renderMarkup(`[[${id}|${label}]]`)).join(" / ");
  const form = complete
    ? `<div class="case-success"><b>RECORD AMENDED</b><p>${puzzle.success}</p>${nextCase ? `<button class="wiki-link case-next-link" type="button" data-document="${nextCase.id}">→ ${nextCase.id} ${nextCase.title}</button>` : "<p>CHAPTER 1 CASE FILES COMPLETE.</p>"}</div>`
    : `<form class="wiki-answer-form" id="answer-form" data-case="${puzzle.id}">
        <label for="answer-input">FILL BLANK:</label>
        <div class="wiki-answer-row"><span>&gt;</span><input id="answer-input" autocomplete="off" spellcheck="false" aria-label="빈칸 답 입력" /><button type="submit">COMMIT</button></div>
        <div class="answer-result" id="answer-result" aria-live="polite">연결된 기록을 읽은 뒤 답을 입력하세요.</div>
      </form>`;
  return `
    ${renderHistoryControls()}
    <div class="doc-document-id">${puzzle.id} / ${puzzle.typeName}</div>
    <h2 class="doc-heading">${puzzle.title}</h2>
    <div class="doc-meta">${puzzle.meta.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("")}</div>
    <section class="wiki-case-body">
      <h3>미완성 기록</h3>
      <p class="case-prompt">${renderCasePrompt(puzzle)}</p>
      <p class="case-instruction">${puzzle.instruction}</p>
      <div class="case-trail"><span>CROSS-REFERENCES VERIFIED: ${verified}/${puzzle.evidence.length}</span><p>첫 기록: ${leads}</p></div>
      ${form}
    </section>`;
}

function renderDocument() {
  const record = records[state.currentId];
  if (!record) return;
  $("#document-view").innerHTML = record.type === "C" ? renderCaseDocument(record) : renderStandardDocument(record);
  renderFileList();
  renderRecent();
  renderArchiveHeader();
}

function trackRecent(id) {
  state.recent = [id, ...state.recent.filter((item) => item !== id)].slice(0, 3);
}

function openDocument(id, useHistory = true) {
  const record = records[id];
  if (!record) return;
  if (!canOpen(record)) {
    setStatus(`ACCESS LOCKED — COMPLETE CASE ${String(record.access).padStart(2, "0")}`);
    return;
  }
  state.currentId = id;
  if (useHistory) {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(id);
    state.historyIndex = state.history.length - 1;
  }
  if (record.type !== "C") state.visited.add(id);
  trackRecent(id);
  renderDocument();
  setStatus(record.type === "C" ? `OPEN ${id} — COMPLETE THE BLANK` : `OPEN ${id}`);
}

function updateStoryAfterCase(puzzle) {
  const nextCase = verticalSlice.cases.find((caseFile) => caseFile.access === puzzle.unlocks);
  $("#phone-small-screen").textContent = "1 MESSAGE";
  $("#phone-light").closest(".desk-phone").classList.add("phone-alert");
  $("#phone-time").textContent = puzzle.id === "C-003" ? "04:17" : "04:13";
  $("#phone-message").textContent = puzzle.phone;
  $("#note-question").innerHTML = nextCase ? nextCase.prompt.replace("[blank]", "<br />________") : "기록은<br />사람보다 먼저였다.";
  $("#note-copy").textContent = nextCase ? "다음 빈칸은 위키 안에 있다." : "기록은 아직 끝나지 않았다.";
  if (!nextCase) $("#note-anomaly").hidden = false;
}

function handleAnswer(event) {
  event.preventDefault();
  const form = event.target.closest("#answer-form");
  const puzzle = records[form?.dataset.case];
  if (!puzzle || isComplete(puzzle.id)) return;
  const result = $("#answer-result");
  const answer = normalise($("#answer-input").value);
  const evidenceVerified = puzzle.evidence.every((id) => state.visited.has(id));
  if (!answer) {
    result.textContent = "BLANK REQUIRED";
    result.className = "answer-result rejected";
    return;
  }
  if (!evidenceVerified) {
    result.textContent = `EVIDENCE INCOMPLETE — ${puzzle.evidence.length}개의 연결 기록을 확인하세요.`;
    result.className = "answer-result rejected";
    setStatus("CROSS-REFERENCE REQUIRED");
    return;
  }
  const accepted = puzzle.answers.map(normalise).some((expected) => answer.includes(expected));
  if (!accepted) {
    result.textContent = "ENTRY REJECTED — 기록의 공통 사실을 다시 대조하세요.";
    result.className = "answer-result rejected";
    setStatus("QUERY INCONSISTENT");
    return;
  }
  state.completedCases.push(puzzle.id);
  $("#game-scene").classList.add("anomaly");
  $("#user-id").textContent = puzzle.id === "C-003" ? "R-14" : "P-???";
  updateStoryAfterCase(puzzle);
  setStatus(`CASE ${puzzle.id.slice(-2)} VERIFIED — NEW RECORDS UNLOCKED`);
  window.setTimeout(() => {
    $("#game-scene").classList.remove("anomaly");
    $("#user-id").textContent = "?????";
  }, 950);
  renderDocument();
}

function powerOn() {
  if (state.mode !== "BOOT") return;
  const scene = $("#game-scene");
  scene.classList.add("booting");
  $("#power-button").disabled = true;
  $("#ambient-caption").textContent = "낡은 관이 울리고 화면 중앙의 빛이 번진다.";
  window.setTimeout(() => {
    scene.classList.remove("booting");
    setMode("MONITOR");
    trackRecent(state.currentId);
    renderDocument();
    $("#ambient-caption").textContent = "PADS 로컬 위키가 열렸다. 빈칸은 연결된 기록을 읽어야만 채울 수 있다.";
    setStatus("LOCAL WIKI READY — OPEN CASE FILE");
  }, 1080);
}

function toggleFocus(object) {
  if (state.mode === "BOOT") return;
  setFocus(state.focus === object ? "none" : object);
  if (object === "phone" && progress()) {
    state.phoneRead = true;
    $("#phone-object").classList.remove("phone-alert");
    $("#phone-small-screen").textContent = "READ";
  }
}

document.addEventListener("click", (event) => {
  const documentButton = event.target.closest("[data-document]");
  if (documentButton) {
    openDocument(documentButton.dataset.document);
    return;
  }
  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    state.filter = filterButton.dataset.filter;
    renderFileList();
    return;
  }
  if (event.target.id === "history-back" && state.historyIndex > 0) {
    state.historyIndex -= 1;
    openDocument(state.history[state.historyIndex], false);
  }
  if (event.target.id === "history-next" && state.historyIndex < state.history.length - 1) {
    state.historyIndex += 1;
    openDocument(state.history[state.historyIndex], false);
  }
});

$("#power-button").addEventListener("click", powerOn);
$("#note-object").addEventListener("click", () => toggleFocus("note"));
$("#phone-object").addEventListener("click", () => toggleFocus("phone"));
$("#search-form").addEventListener("submit", (event) => { event.preventDefault(); renderFileList(); setStatus("SEARCH COMPLETE"); });
$("#search-input").addEventListener("input", renderFileList);
$("#search-input").addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.currentTarget.value = ""; renderFileList(); event.currentTarget.blur(); }
});
$("#document-view").addEventListener("submit", (event) => { if (event.target.id === "answer-form") handleAnswer(event); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.focus !== "none") setFocus("none");
});

window.setInterval(() => {
  const time = new Date();
  $("#clock").textContent = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`;
}, 1000);
