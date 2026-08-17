import { verticalSlice } from "./Data/chapter01.js?v=20260817-deduction-tiers";

const $ = (selector) => document.querySelector(selector);
const allRecords = [...verticalSlice.documents, ...verticalSlice.cases];
const records = Object.fromEntries(allRecords.map((record) => [record.id, record]));
const normalise = (text) => text.toLowerCase().replace(/[\s_-]/g, "").replace(/[^\p{L}\p{N}]/gu, "");
const difficultyClass = (difficulty) => ({ 하: "low", 중: "middle", 상: "high" }[difficulty] || "low");

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
    if (!canOpen(record)) return `<span class="wiki-link-locked" title="사건 문서를 해결하면 열립니다.">${label} 🔒</span>`;
    return `<button class="wiki-link" type="button" data-document="${id}">${label}</button>`;
  });
}

function renderArticleToc(sections) {
  if (!sections.length) return "";
  return `<nav class="article-toc" aria-label="문서 목차"><b>목차</b><ol>${sections.map((section, index) => `<li><button type="button" data-scroll-section="section-${index + 1}">${index + 1}. ${section.heading}</button></li>`).join("")}</ol></nav>`;
}

function renderDifficultyBadge(puzzle) {
  const detail = puzzle.difficultyDetail ? `<small>${puzzle.difficultyDetail}</small>` : "";
  return `<b class="difficulty-badge difficulty-${difficultyClass(puzzle.difficulty)}">난이도 ${puzzle.difficulty || "하"}${detail}</b>`;
}

function renderResolvedAnswer(puzzle) {
  const answerRecord = allRecords.find((record) => puzzle.answers.some((answer) => normalise(answer) === normalise(record.id)));
  if (!answerRecord) return `<span class="resolved-answer">${puzzle.answerLabel}</span>`;
  return `<button class="resolved-answer" type="button" data-document="${answerRecord.id}" aria-label="${answerRecord.title} 문서 열기">${puzzle.answerLabel}</button>`;
}

function renderInlineAnswer(puzzle) {
  const placeholder = puzzle.answerLabel.includes("세션") ? "세션 식별자" : "답 입력";
  return `<form class="inline-answer-form" data-case="${puzzle.id}">
    <input class="inline-answer-input" autocomplete="off" spellcheck="false" placeholder="${placeholder}" aria-label="${puzzle.title} 빈칸 답안" />
    <button class="inline-answer-submit" type="submit" aria-label="답안 확인">↵</button>
    <span class="inline-answer-feedback" aria-live="polite"></span>
  </form>`;
}

function renderUnlockList(puzzle) {
  const unlocked = allRecords.filter((record) => record.access === puzzle.unlocks && record.type !== "C");
  if (!unlocked.length) return "";
  return `<div class="unlock-list"><b>새로 해금된 문서</b><div>${unlocked.map((record) => `<button type="button" data-document="${record.id}">${record.id} · ${record.title}</button>`).join("")}</div></div>`;
}

function renderCloze(cloze) {
  const puzzle = records[cloze.caseId];
  if (!canOpen(puzzle)) {
    return `<aside class="wiki-cloze locked"><b>해석 보류</b><span>앞선 사건 문서를 해결하면 이 빈칸을 확인할 수 있습니다.</span></aside>`;
  }
  if (isComplete(puzzle.id)) {
    return `<aside class="wiki-cloze completed"><div>${cloze.before} ${renderResolvedAnswer(puzzle)} ${cloze.after}</div><small>✓ 문서 교차 검증 완료</small>${renderUnlockList(puzzle)}</aside>`;
  }
  const verified = puzzle.evidence.filter((id) => state.visited.has(id)).length;
  return `<aside class="wiki-cloze">
    <div class="cloze-sentence">${cloze.before} ${renderInlineAnswer(puzzle)} ${cloze.after}</div>
    <small>교차 확인: ${verified}/${puzzle.evidence.length}개 문서 읽음</small>
  </aside>`;
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
  const progressLabel = progress() === verticalSlice.cases.length ? "완료" : "진행";
  $("#case-progress").textContent = `${progressLabel} ${String(currentCase).padStart(2, "0")} / ${String(verticalSlice.cases.length).padStart(2, "0")}`;
  $("#wiki-current-title").textContent = records[state.currentId]?.title ?? "문서";
}

function renderHistoryControls() {
  return `<div class="doc-history"><button type="button" id="history-back" ${state.historyIndex === 0 ? "disabled" : ""}>◀ PREV</button><button type="button" id="history-next" ${state.historyIndex === state.history.length - 1 ? "disabled" : ""}>NEXT ▶</button></div>`;
}

function renderStandardDocument(document) {
  const meta = document.meta.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
  const sections = document.sections.map((section, index) => `
    <section class="doc-section" id="section-${index + 1}">
      <h3><span>${index + 1}.</span> ${section.heading}</h3>
      ${section.quote ? `<div class="record-quote">${renderMarkup(section.text)}</div>` : `<p>${renderMarkup(section.text)}</p>`}
      ${section.cloze ? renderCloze(section.cloze) : ""}
    </section>`).join("");
  const anomaly = progress() === verticalSlice.cases.length && document.id === "I-014"
    ? "<div class=\"record-quote record-amendment\">최근 변경: <b>2027.03.14</b> / 편집자: [UNRESOLVED]</div>"
    : "";
  return `
    ${renderHistoryControls()}
    <div class="doc-breadcrumb">PADS 위키 / ${document.typeName} / ${document.id}</div>
    <h2 class="doc-heading">${document.title}</h2>
    <div class="doc-meta wiki-infobox">${meta}</div>
    ${renderArticleToc(document.sections)}
    <div class="doc-body">${sections}</div>
    ${anomaly}
    <div class="doc-related"><b>관련 문서</b><div>${document.related.map(([id, label]) => renderMarkup(`[[${id}|${label}]]`)).join(" · ")}</div></div>`;
}

function renderCasePrompt(puzzle) {
  const fill = isComplete(puzzle.id)
    ? renderResolvedAnswer(puzzle)
    : renderInlineAnswer(puzzle);
  return puzzle.prompt.replace("[blank]", fill);
}

function renderCaseDocument(puzzle) {
  const verified = puzzle.evidence.filter((id) => state.visited.has(id)).length;
  const complete = isComplete(puzzle.id);
  const nextCase = verticalSlice.cases.find((caseFile) => caseFile.access === puzzle.unlocks);
  const leads = puzzle.leads.map(([id, label]) => renderMarkup(`[[${id}|${label}]]`)).join(" / ");
  const completion = complete
    ? `<div class="case-success"><b>문서 해금 완료</b><p>${puzzle.success}</p>${renderUnlockList(puzzle)}${nextCase ? `<button class="case-next-link" type="button" data-document="${nextCase.id}">다음 사건 문서: ${nextCase.title} →</button>` : "<p>Chapter 1의 모든 사건 문서가 해금되었습니다.</p>"}</div>`
    : "";
  return `
    <header class="case-document-head wiki-case-header">
      <div class="doc-breadcrumb">PADS 위키 / 사건 문서 / ${puzzle.id}</div>
      <span class="case-meta-line">사건 ${puzzle.meta[0][1]} · ${puzzle.meta[1][1]} ${renderDifficultyBadge(puzzle)}</span>
      <h2 class="doc-heading">${puzzle.title}</h2>
    </header>
    <section class="wiki-case-body">
      <h3>미완성 문장</h3>
      <div class="case-prompt">${renderCasePrompt(puzzle)}</div>
      ${completion}
      <p class="case-instruction">${puzzle.instruction}</p>
      <div class="case-trail"><b>문서 교차 확인</b><span>${verified}/${puzzle.evidence.length}개 근거를 읽었습니다.</span><p><strong>추리 방식:</strong> ${puzzle.difficultyDetail || "기록 대조"}</p><p>탐색 시작: ${leads}</p></div>
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
    setStatus(`잠긴 문서입니다. 사건 ${String(record.access).padStart(2, "0")}을 먼저 해결하세요.`);
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
  $("#document-view").scrollTop = 0;
  setStatus(record.type === "C" ? `${record.title} 문서를 열었습니다.` : `${record.id} 문서를 열었습니다.`);
}

function updateStoryAfterCase(puzzle) {
  const nextCase = verticalSlice.cases.find((caseFile) => caseFile.access === puzzle.unlocks);
  $("#phone-small-screen").textContent = "1 MESSAGE";
  $("#phone-light").closest(".desk-phone").classList.add("phone-alert");
  $("#phone-time").textContent = puzzle.phoneTime ?? "04:13";
  $("#phone-message").textContent = puzzle.phone;
  $("#note-question").innerHTML = nextCase ? nextCase.prompt.replace("[blank]", "<br />________") : "기록은<br />사람보다 먼저였다.";
  $("#note-copy").textContent = nextCase ? "다음 빈칸은 위키 안에 있다." : "기록은 아직 끝나지 않았다.";
  if (!nextCase) $("#note-anomaly").hidden = false;
}

function showInlineFeedback(form, message, state) {
  form.dataset.state = state;
  form.querySelector(".inline-answer-feedback").textContent = message;
}

function handleInlineAnswer(event) {
  event.preventDefault();
  const form = event.target.closest(".inline-answer-form");
  const puzzle = records[form?.dataset.case];
  if (!puzzle || isComplete(puzzle.id) || form.dataset.submitting === "true") return;
  const input = form.querySelector(".inline-answer-input");
  const answer = normalise(input.value);
  const evidenceVerified = puzzle.evidence.every((id) => state.visited.has(id));
  if (!answer) {
    showInlineFeedback(form, "답을 입력하세요.", "wrong");
    input.focus();
    return;
  }
  if (!evidenceVerified) {
    showInlineFeedback(form, `근거 ${puzzle.evidence.length}개를 모두 확인하세요.`, "wrong");
    setStatus("연결 문서 교차 확인이 필요합니다.");
    return;
  }
  const accepted = puzzle.answers.map(normalise).some((expected) => answer === expected);
  if (!accepted) {
    showInlineFeedback(form, puzzle.retry || "근거 문서를 다시 대조하세요.", "wrong");
    setStatus("입력한 답이 근거 조합과 일치하지 않습니다.");
    return;
  }
  form.dataset.submitting = "true";
  input.disabled = true;
  showInlineFeedback(form, "기록 일치", "correct");
  window.setTimeout(() => completeAnswer(puzzle), 650);
}

function completeAnswer(puzzle) {
  state.completedCases.push(puzzle.id);
  $("#game-scene").classList.add("anomaly");
  $("#user-id").textContent = puzzle.id === verticalSlice.cases.at(-1)?.id ? "R-14" : "P-???";
  updateStoryAfterCase(puzzle);
  setStatus(`사건 ${puzzle.id.slice(-2)} 해결 — 새 문서가 해금되었습니다.`);
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
    $("#ambient-caption").textContent = "PADS 위키가 열렸다. 파란 링크를 따라 기록을 대조하고 빈칸을 채우세요.";
    setStatus("첫 사건 문서가 열렸습니다.");
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
  const tocButton = event.target.closest("[data-scroll-section]");
  if (tocButton) {
    const documentView = $("#document-view");
    const section = documentView.querySelector(`#${tocButton.dataset.scrollSection}`);
    if (section) documentView.scrollTo({ top: Math.max(0, section.offsetTop - 8), behavior: "smooth" });
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
$("#document-view").addEventListener("submit", (event) => { if (event.target.matches(".inline-answer-form")) handleInlineAnswer(event); });
$("#document-view").addEventListener("input", (event) => {
  const input = event.target.closest(".inline-answer-input");
  if (!input) return;
  const form = input.closest(".inline-answer-form");
  if (form?.dataset.state === "wrong") showInlineFeedback(form, "", "");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.focus !== "none") setFocus("none");
});

window.setInterval(() => {
  const time = new Date();
  $("#clock").textContent = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}:${String(time.getSeconds()).padStart(2, "0")}`;
}, 1000);
