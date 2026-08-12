import { verticalSlice } from "./Data/chapter01.js";

const $ = (selector) => document.querySelector(selector);
const state = {
  mode: "BOOT",
  focus: "none",
  currentId: verticalSlice.startDocument,
  filter: "ALL",
  history: [verticalSlice.startDocument],
  historyIndex: 0,
  recent: [],
  solved: false,
  phoneRead: false
};

const documents = Object.fromEntries(verticalSlice.documents.map((document) => [document.id, document]));
const normalise = (text) => text.toLowerCase().replace(/[\s_]/g, "").replace(/[^0-9a-z가-힣/-]/g, "");

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
  return text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, label) => (
    `<button class="wiki-link" type="button" data-document="${id}">${label}</button>`
  ));
}

function visibleDocuments() {
  const query = $("#search-input").value.trim().toLowerCase();
  return verticalSlice.documents.filter((document) => {
    const filterMatch = state.filter === "ALL" || document.type === state.filter;
    const text = `${document.id} ${document.title} ${document.type} ${document.searchTerms.join(" ")} ${document.sections.map((section) => section.text).join(" ")}`.toLowerCase();
    return filterMatch && (!query || text.includes(query));
  });
}

function renderFileList() {
  const entries = visibleDocuments();
  $("#file-list").innerHTML = entries.length
    ? entries.map((document) => `<button class="file-button ${document.id === state.currentId ? "current" : ""}" type="button" data-document="${document.id}"><span>${document.type}</span> ${document.id} ${document.title}</button>`).join("")
    : "<div class=\"file-button\">NO MATCH</div>";
  $("#search-result").textContent = $("#search-input").value.trim() ? `${entries.length} FILE(S)` : "";
  [...$("#index-types").querySelectorAll("button")].forEach((button) => button.classList.toggle("selected", button.dataset.filter === state.filter));
}

function renderRecent() {
  $("#recent-list").innerHTML = state.recent.length
    ? state.recent.slice(0, 3).map((id) => `<button type="button" class="recent-button" data-document="${id}">${id}</button>`).join(" ")
    : "—";
}

function renderDocument() {
  const document = documents[state.currentId];
  const meta = document.meta.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
  const sections = document.sections.map((section) => `
    <section class="doc-section">
      <h3>${section.heading}</h3>
      ${section.quote ? `<div class="record-quote">${renderMarkup(section.text)}</div>` : `<p>${renderMarkup(section.text)}</p>`}
    </section>`).join("");
  const historyControls = `<div class="doc-history"><button type="button" id="history-back" ${state.historyIndex === 0 ? "disabled" : ""}>◀ PREV</button><button type="button" id="history-next" ${state.historyIndex === state.history.length - 1 ? "disabled" : ""}>NEXT ▶</button></div>`;
  const anomaly = state.solved && document.id === "I-014" ? "<div class=\"record-quote\">LAST MODIFIED: <b>2027.03.14</b> / EDITOR: [UNRESOLVED]</div>" : "";
  $("#document-view").innerHTML = `
    ${historyControls}
    <div class="doc-document-id">${document.id} / ${document.typeName}</div>
    <h2 class="doc-heading">${document.title}</h2>
    <div class="doc-meta">${meta}</div>
    ${sections}
    ${anomaly}
    <div class="doc-related"><span>RELATED:</span> ${document.related.map(([id, label]) => `<button class="wiki-link" type="button" data-document="${id}">${label}</button>`).join(" / ")}</div>
    ${renderAnswerTerminal()}
  `;
  renderFileList();
  renderRecent();
}

function renderAnswerTerminal() {
  const puzzle = verticalSlice.puzzle;
  const result = state.solved
    ? `<span class="answer-result accepted" id="answer-result">ANSWER ACCEPTED</span>`
    : `<span class="answer-result" id="answer-result">${puzzle.prompt}</span>`;
  return `<form class="answer-terminal" id="answer-form"><b>CASE QUESTION: ${puzzle.question}</b><div class="answer-row"><span>&gt;</span><input id="answer-input" autocomplete="off" spellcheck="false" aria-label="답 입력" ${state.solved ? "disabled" : ""}/><button type="submit" ${state.solved ? "disabled" : ""}>SUBMIT</button>${result}</div></form>`;
}

function trackRecent(id) {
  state.recent = [id, ...state.recent.filter((item) => item !== id)].slice(0, 3);
}

function openDocument(id, useHistory = true) {
  if (!documents[id]) return;
  state.currentId = id;
  if (useHistory) {
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(id);
    state.historyIndex = state.history.length - 1;
  }
  trackRecent(id);
  renderDocument();
  setStatus(`OPEN ${id}`);
}

function handleAnswer(event) {
  event.preventDefault();
  if (state.solved) return;
  const answer = normalise($("#answer-input").value);
  const accepted = verticalSlice.puzzle.answers.map(normalise).some((expected) => answer.includes(expected));
  const result = $("#answer-result");
  if (!answer) {
    result.textContent = "ANSWER REQUIRED";
    result.className = "answer-result rejected";
    return;
  }
  if (!accepted) {
    result.textContent = "ANSWER REJECTED";
    result.className = "answer-result rejected";
    setStatus("QUERY INCONSISTENT");
    return;
  }
  state.solved = true;
  result.textContent = "ANSWER ACCEPTED";
  result.className = "answer-result accepted";
  $("#answer-input").disabled = true;
  $("#answer-form button").disabled = true;
  setStatus("ANSWER ACCEPTED — RECORD AMENDMENT DETECTED");
  $("#game-scene").classList.add("anomaly");
  $("#user-id").textContent = "P-???";
  $("#note-anomaly").hidden = false;
  $("#phone-small-screen").textContent = "1 MESSAGE";
  $("#phone-light").closest(".desk-phone").classList.add("phone-alert");
  $("#phone-time").textContent = verticalSlice.phone.time;
  $("#phone-message").textContent = verticalSlice.phone.message;
  $("#ambient-caption").textContent = "어딘가에서 짧은 진동이 들린다. CRT 화면이 한 번 흔들린다.";
  window.setTimeout(() => {
    $("#game-scene").classList.remove("anomaly");
    $("#user-id").textContent = "?????";
  }, 950);
  window.setTimeout(() => renderDocument(), 120);
}

function powerOn() {
  if (state.mode !== "BOOT") return;
  const scene = $("#game-scene");
  scene.classList.add("booting");
  $("#power-button").disabled = true;
  $("#ambient-caption").textContent = "낡은 관이 짧게 울리고, 화면 중앙에 빛이 번진다.";
  window.setTimeout(() => {
    scene.classList.remove("booting");
    setMode("MONITOR");
    trackRecent(state.currentId);
    renderDocument();
    $("#ambient-caption").textContent = "PADS가 로컬 기록 보관소에 연결됐다. 책상 위 쪽지의 질문이 남아 있다.";
    setStatus("LOCAL ARCHIVE READY");
  }, 1080);
}

function toggleFocus(object) {
  if (state.mode === "BOOT") return;
  setFocus(state.focus === object ? "none" : object);
  if (object === "phone" && state.solved) {
    state.phoneRead = true;
    $("#phone-object").classList.remove("phone-alert");
    $("#phone-small-screen").textContent = "READ";
  }
}

document.addEventListener("click", (event) => {
  const documentButton = event.target.closest("[data-document]");
  if (documentButton) openDocument(documentButton.dataset.document);
  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) {
    state.filter = filterButton.dataset.filter;
    renderFileList();
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
