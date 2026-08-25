const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].filter(Boolean);
const chromePath = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
const baseUrl = process.argv[2] || "http://127.0.0.1:4173/";
const captureDir = process.env.UI_CAPTURE_DIR || "";
const viewports = [
  { name: "wide", width: 1920, height: 1080, layout: "wide", scale: 1.2 },
  { name: "compact", width: 1024, height: 1024, layout: "compact", scale: 1024 / 1100 },
  { name: "portrait", width: 390, height: 844, layout: "portrait", scale: .75 },
  { name: "short", width: 844, height: 390, layout: "wide", scale: .56 }
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitUntil(read, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await read();
    if (value) return value;
    await sleep(50);
  }
  throw new Error("브라우저 응답 대기 시간이 초과되었습니다.");
}

class CdpSession {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(session, expression) {
  const result = await session.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) {
    const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "페이지 평가 실패";
    throw new Error(description.split("\n")[0]);
  }
  return result.result.value;
}

async function captureUi(session, viewport, stage) {
  if (!captureDir) return;
  fs.mkdirSync(captureDir, { recursive: true });
  const testPanelWasHidden = await evaluate(session, `(() => { const panel = document.querySelector('#test-panel'); const hidden = panel?.hidden ?? true; if (panel) panel.hidden = true; return hidden; })()`);
  try {
    const result = await session.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(path.join(captureDir, `${viewport.name}-${stage}.png`), Buffer.from(result.data, "base64"));
  } finally {
    await evaluate(session, `(() => { const panel = document.querySelector('#test-panel'); if (panel) panel.hidden = ${JSON.stringify(testPanelWasHidden)}; })()`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rectFits(rect, width, height, tolerance = 1.5) {
  return rect.left >= -tolerance && rect.top >= -tolerance && rect.right <= width + tolerance && rect.bottom <= height + tolerance;
}

async function clickPoint(session, x, y) {
  await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await session.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
  await session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 });
}

async function rightClickPoint(session, x, y) {
  await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await session.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", buttons: 2, clickCount: 1 });
  await session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", buttons: 0, clickCount: 1 });
}

async function clickElement(session, selector) {
  const point = await evaluate(session, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  assert(point, `클릭 대상 누락: ${selector}`);
  await clickPoint(session, point.x, point.y);
}

async function dragElementToElement(session, sourceSelector, targetSelector) {
  const points = await evaluate(session, `(() => {
    const source = document.querySelector(${JSON.stringify(sourceSelector)});
    const target = document.querySelector(${JSON.stringify(targetSelector)});
    if (!source || !target) return { source: null, target: null };
    source.scrollIntoView({ block: "center", inline: "center" });
    target.scrollIntoView({ block: "center", inline: "center" });
    const point = (element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    return { source: point(source), target: point(target) };
  })()`);
  assert(points.source && points.target, `드래그 대상 누락: ${sourceSelector} → ${targetSelector}`);
  await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: points.source.x, y: points.source.y });
  await session.send("Input.dispatchMouseEvent", { type: "mousePressed", x: points.source.x, y: points.source.y, button: "left", buttons: 1, clickCount: 1 });
  for (const progress of [.2, .45, .7, 1]) {
    await session.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: points.source.x + (points.target.x - points.source.x) * progress, y: points.source.y + (points.target.y - points.source.y) * progress, button: "left", buttons: 1 });
    await sleep(35);
  }
  await session.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: points.target.x, y: points.target.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(80);
}

async function auditViewport(session, viewport) {
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.name === "portrait"
  });
  const url = new URL(baseUrl);
  const auditToken = `${viewport.name}-${Date.now()}`;
  url.searchParams.set("responsive-audit", auditToken);
  url.searchParams.set("test", "1");
  await session.send("Page.navigate", { url: url.href });
  await waitUntil(async () => evaluate(session, `document.readyState === 'complete' && new URLSearchParams(location.search).get('responsive-audit') === ${JSON.stringify(auditToken)} && Boolean(document.querySelector('#ui-stage'))`));
  await sleep(360);

  const start = await evaluate(session, `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const stage = document.querySelector("#ui-stage");
    const overlay = document.querySelector("#start-overlay");
    return {
      innerWidth,
      innerHeight,
      layout: stage.dataset.layout,
      scale: Number(stage.dataset.scale),
      stage: rect("#ui-stage"),
      card: rect(".start-card"),
      strayUi: [...document.querySelector('#game').children]
        .filter((element) => !['game-canvas', 'ui-stage', 'screen-noise', 'damage-flash', 'critical-flash'].includes(element.id || element.className))
        .map((element) => element.id || element.className || element.tagName),
      overlayOverflowX: overlay.scrollWidth - overlay.clientWidth,
      documentOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  })()`);

  assert(start.innerWidth === viewport.width && start.innerHeight === viewport.height, `${viewport.name}: 뷰포트 적용 실패`);
  assert(start.layout === viewport.layout, `${viewport.name}: ${start.layout} 프로필 오선택`);
  assert(Math.abs(start.scale - viewport.scale) < .002, `${viewport.name}: 스케일 ${start.scale} 불일치`);
  assert(Math.abs(start.stage.width - viewport.width) < 1.5 && Math.abs(start.stage.height - viewport.height) < 1.5, `${viewport.name}: UI 스테이지가 화면을 채우지 못함`);
  assert(rectFits(start.card, viewport.width, viewport.height), `${viewport.name}: 시작 카드 잘림 ${JSON.stringify(start.card)}`);
  assert(start.strayUi.length === 0, `${viewport.name}: UI 스테이지 밖 요소 ${start.strayUi.join(', ')}`);
  assert(start.overlayOverflowX <= 1, `${viewport.name}: 시작 오버레이 가로 오버플로 ${start.overlayOverflowX}px`);
  assert(start.documentOverflowX <= 1, `${viewport.name}: 문서 가로 오버플로 ${start.documentOverflowX}px`);
  await captureUi(session, viewport, "start");

  await clickElement(session, '[data-class="melee"]');
  await sleep(50);
  await clickElement(session, "#start-button");
  await sleep(80);
  const canvasPoint = { x: Math.round(viewport.width * .72), y: Math.round(viewport.height * .48) };
  const pointerTarget = await evaluate(session, `(() => {
    const target = document.elementFromPoint(${canvasPoint.x}, ${canvasPoint.y});
    return { tag: target?.tagName || null, id: target?.id || null, className: target?.className || null };
  })()`);
  await clickPoint(session, canvasPoint.x, canvasPoint.y);
  const swingAfterClick = await waitUntil(async () => {
    const count = await evaluate(session, "Number(document.querySelector('#game-canvas').dataset.swingCount || 0)");
    return count >= 1 ? count : null;
  }, 2000);
  let rightClickReset = true;
  if (viewport.name === "wide") {
    const xBeforeMove = (await evaluate(session, "document.querySelector('#game-canvas').getInputAuditState()" )).playerX;
    await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "d", code: "KeyD", windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68 });
    await sleep(110);
    const xWhileMoving = (await evaluate(session, "document.querySelector('#game-canvas').getInputAuditState()" )).playerX;
    await rightClickPoint(session, canvasPoint.x, canvasPoint.y);
    const rightClickState = await evaluate(session, "document.querySelector('#game-canvas').getInputAuditState()" );
    const afterRightClick = { x: rightClickState.playerX, keyHeld: rightClickState.keys.includes("KeyD") };
    await sleep(120);
    const xAfterSettling = (await evaluate(session, "document.querySelector('#game-canvas').getInputAuditState()" )).playerX;
    await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "d", code: "KeyD", windowsVirtualKeyCode: 68, nativeVirtualKeyCode: 68 });
    rightClickReset = xWhileMoving > xBeforeMove + 4 && !afterRightClick.keyHeld && Math.abs(xAfterSettling - afterRightClick.x) < 1.5;
    assert(rightClickReset, "wide: 우클릭 후 이동 입력이 고착됨 " + JSON.stringify({ xBeforeMove, xWhileMoving, afterRightClick, xAfterSettling }));
  }
  const combat = await evaluate(session, `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      hud: rect('.hud-left'),
      objective: rect('#combat-objective'),
      abilities: rect('.ability-rack'),
      factoryToggle: rect('#factory-toggle'),
      ramText: document.querySelector('#hud-ram-text')?.textContent || '',
      ramCapacity: Number(document.querySelector('#game-canvas').dataset.ramCapacity || 0)
    };
  })()`);
  assert(pointerTarget.id === "game-canvas", `${viewport.name}: 전투 클릭이 ${pointerTarget.id || pointerTarget.className || pointerTarget.tag}에 차단됨`);
  assert(swingAfterClick >= 1, `${viewport.name}: 실제 마우스 클릭 공격 미발동`);
  assert(combat.ramText === "0 / 10" && combat.ramCapacity === 10, `${viewport.name}: 전투 HUD 초기 RAM 표시 오류 ${JSON.stringify(combat)}`);
  for (const [name, rect] of Object.entries(combat).filter(([, value]) => value && typeof value === "object" && "left" in value)) {
    assert(rectFits(rect, viewport.width, viewport.height), `${viewport.name}: ${name} HUD 잘림 ${JSON.stringify(rect)}`);
  }
  await captureUi(session, viewport, "combat");

  await clickElement(session, "#factory-toggle");
  await sleep(360);
  const factory = await evaluate(session, `(() => {
    const overlay = document.querySelector('#factory-overlay');
    const shell = document.querySelector('.factory-shell').getBoundingClientRect();
    return {
      open: !overlay.hidden,
      shell: { left: shell.left, top: shell.top, right: shell.right, bottom: shell.bottom, width: shell.width, height: shell.height },
      boardScrollable: document.querySelector('.factory-layout').scrollWidth >= document.querySelector('.factory-layout').clientWidth,
      view: document.querySelector('.factory-shell').dataset.factoryView,
      tabsVisible: getComputedStyle(document.querySelector('.factory-tabs')).display !== 'none',
      headerRam: document.querySelector('#factory-ram-meta')?.textContent || '',
      toolComboPrompt: document.querySelector('#factory-tool-combo-list')?.textContent || '',
      evolutionPrompt: document.querySelector('#factory-synergy-list')?.textContent || ''
    };
  })()`);
  assert(factory.open, `${viewport.name}: 공장 오버레이 열기 실패`);
  assert(rectFits(factory.shell, viewport.width, viewport.height), `${viewport.name}: 공장 셸 잘림 ${JSON.stringify(factory.shell)}`);
  assert(factory.boardScrollable, `${viewport.name}: 공장 레이아웃 스크롤 보호 누락`);
  assert(factory.headerRam === "0 / 10 RAM", `${viewport.name}: 공장 헤더 RAM 표시 오류 ${JSON.stringify(factory)}`);
  assert(factory.toolComboPrompt.includes("X 조합") && factory.evolutionPrompt.includes("RANK 2"), `${viewport.name}: 도구 X·진화 안내 누락 ${JSON.stringify(factory)}`);
  if (viewport.name === "portrait") {
    assert(factory.tabsVisible && factory.view === "board", "portrait: 공장 탭 또는 기본 회로 화면 누락 " + JSON.stringify(factory));
    await evaluate(session, "document.querySelector('[data-factory-view=\"parts\"]').click()");
    const partsView = await evaluate(session, "({ view: document.querySelector('.factory-shell').dataset.factoryView, shown: getComputedStyle(document.querySelector('.part-shelf')).display !== 'none', boardHidden: getComputedStyle(document.querySelector('.board-panel')).display === 'none' })");
    assert(partsView.view === "parts" && partsView.shown && partsView.boardHidden, "portrait: 부품 탭 전환 실패 " + JSON.stringify(partsView));
    await evaluate(session, "document.querySelector('[data-factory-view=\"output\"]').click()");
    const outputView = await evaluate(session, "({ view: document.querySelector('.factory-shell').dataset.factoryView, shown: getComputedStyle(document.querySelector('.output-panel')).display !== 'none', commitVisible: Boolean(document.querySelector('#factory-commit').offsetParent) })");
    assert(outputView.view === "output" && outputView.shown && outputView.commitVisible, "portrait: 출력 탭·적용 버튼 전환 실패 " + JSON.stringify(outputView));
    await evaluate(session, "document.querySelector('[data-factory-view=\"board\"]').click()");
  } else {
    assert(!factory.tabsVisible, `${viewport.name}: 데스크톱에서 모바일 공장 탭이 노출됨`);
  }
  await captureUi(session, viewport, "factory");

  if (viewport.name === "portrait") {
    await evaluate(session, "document.querySelector('[data-factory-view=\"output\"]').click()");
    await sleep(40);
    await clickElement(session, "#factory-commit");
    await sleep(80);
    await evaluate(session, "document.querySelector('#test-level').click()");
    const portraitChoice = await waitUntil(async () => {
      const state = await evaluate(session, `(() => {
        const overlay = document.querySelector('#choice-overlay');
        const cards = [...document.querySelectorAll('.augment-card')].map((card) => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, state: card.querySelector('.card-top strong')?.textContent || '' };
        });
        return {
          open: !overlay.hidden,
          cards,
          ranks: document.querySelectorAll('.augment-card .rank-track').length,
          effects: document.querySelectorAll('.augment-card .next-rank-effect').length,
          evolutions: document.querySelectorAll('.augment-card .evolution-preview').length,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      })()`);
      return state.open ? state : null;
    });
    assert(portraitChoice.cards.length === 3 && portraitChoice.ranks === 3 && portraitChoice.effects === 3 && portraitChoice.evolutions === 3, "portrait: 랭크·진화 3택 UI 누락 " + JSON.stringify(portraitChoice));
    assert(portraitChoice.cards.every((card) => card.left >= -1 && card.right <= viewport.width + 1) && portraitChoice.overflowX <= 1, "portrait: 레벨업 카드 가로 잘림 " + JSON.stringify(portraitChoice));
    await captureUi(session, viewport, "levelup");
  }

  if (viewport.name === "wide") {
    await clickElement(session, "#factory-commit");
    await sleep(80);
    await clickElement(session, '#test-module-buttons [data-test-module="m_mark"]');
    await sleep(120);
    const factoryEntry = await evaluate(session, `(() => ({
      factoryOpen: !document.querySelector('#factory-overlay').hidden,
      pending: Boolean(document.querySelector('#pending-part .pending-module')),
      testPanel: !document.querySelector('#test-panel').hidden,
      moduleButtons: document.querySelector('#test-module-buttons').children.length,
      validTargets: [...document.querySelectorAll('#factory-board .valid-target')].map((cell) => Number(cell.dataset.cellIndex)),
      busRows: [...document.querySelectorAll('[data-port-owner="bus-source"][data-port-row]')].map((port) => Number(port.dataset.portRow))
    }))()`);
    assert(factoryEntry.factoryOpen && factoryEntry.pending, "wide: 테스트 증강 공장 진입 실패 " + JSON.stringify(factoryEntry));
    assert(JSON.stringify(factoryEntry.validTargets) === JSON.stringify([7]), "wide: 빈 보드에서 중앙 BUS 결합 셀만 표시되지 않음 " + JSON.stringify(factoryEntry));
    assert(JSON.stringify(factoryEntry.busRows) === JSON.stringify([2]), "wide: BUS 시작점이 중앙 한 줄이 아님 " + JSON.stringify(factoryEntry));
    await clickElement(session, '#factory-board .valid-target');
    await sleep(120);
    const circuitState = await evaluate(session, "({ wires: document.querySelectorAll('.circuit-wire').length, token: document.querySelector('.module-token')?.className || null, rails: document.querySelectorAll('[data-port-owner=\"bus-source\"][data-port-row]').length, busRow: Number(document.querySelector('[data-port-owner=\"bus-source\"]')?.dataset.portRow), jacks: document.querySelectorAll('.module-token [data-port-kind=\"jack\"]').length, leftJacks: document.querySelectorAll('.module-token [data-port-edge=\"left\"]').length, hasPickup: Boolean(document.querySelector('.module-token [data-store-index]')), message: document.querySelector('#board-message')?.textContent || null })");
    const connected = circuitState.wires === 1 && circuitState.token?.includes("raw") && circuitState.rails === 1 && circuitState.busRow === 2 && circuitState.jacks >= 2 && circuitState.leftJacks === 1 && circuitState.hasPickup;
    assert(connected, "wide: 중앙 BUS 레고 결합 또는 PICK 버튼이 동작하지 않음 " + JSON.stringify(circuitState));

    await dragElementToElement(session, '.module-token .part-code', '#factory-board [data-cell-index="8"]');
    await sleep(90);
    const rejectedMove = await evaluate(session, "(() => { const token = document.querySelector('.module-token'); return { anchor: Number(token?.closest('[data-cell-index]')?.dataset.cellIndex), wires: document.querySelectorAll('.circuit-wire').length, message: document.querySelector('#board-message')?.textContent || '' }; })()");
    assert(rejectedMove.anchor === 7 && rejectedMove.wires === 1 && rejectedMove.message.includes("결합"), "wide: 비연결 위치 드래그가 거부되지 않음 " + JSON.stringify(rejectedMove));
    await clickElement(session, '.module-token .part-code');
    await sleep(70);
    const lifted = await evaluate(session, "({ pending: Boolean(document.querySelector('#pending-part .pending-module')), token: Boolean(document.querySelector('.module-token')), wires: document.querySelectorAll('.circuit-wire').length, valid: [...document.querySelectorAll('#factory-board .valid-target')].map((cell) => Number(cell.dataset.cellIndex)) })");
    assert(lifted.pending && !lifted.token && lifted.wires === 0 && JSON.stringify(lifted.valid) === JSON.stringify([7]), "wide: 블록 PICK 후 중앙 결합 셀 복구 실패 " + JSON.stringify(lifted));
    await dragElementToElement(session, '#pending-part .pending-module', '#factory-board .valid-target');
    await sleep(90);
    const placedAgain = await evaluate(session, "({ token: document.querySelector('.module-token')?.className || '', wires: document.querySelectorAll('.circuit-wire').length, pending: Boolean(document.querySelector('#pending-part .pending-module')), message: document.querySelector('#board-message')?.textContent || '' })");
    assert(placedAgain.token.includes('raw') && placedAgain.wires === 1 && !placedAgain.pending, "wide: 들어 올린 블록을 중앙 결합 셀에 재배치하지 못함 " + JSON.stringify(placedAgain));

    const cellsBeforeExtend = await evaluate(session, "document.querySelectorAll('#factory-board [data-cell-index]').length");
    await clickElement(session, '#board-expand');
    await sleep(80);
    const boardExtended = await evaluate(session, "document.querySelectorAll('#factory-board [data-cell-index]').length === " + cellsBeforeExtend + " + 40");
    assert(boardExtended, "wide: 보드 수동 확장이 8열(40칸) 적용되지 않음");
    await clickElement(session, '.module-token [data-store-index]');
    await sleep(80);
    const stored = await evaluate(session, "({ stored: document.querySelectorAll('#reserve-parts [data-reserve-id]').length, token: Boolean(document.querySelector('.module-token')), wires: document.querySelectorAll('.circuit-wire').length, valid: document.querySelectorAll('#factory-board .valid-target').length })");
    assert(stored.stored === 1 && !stored.token && stored.wires === 0, "wide: 설치 블록을 STORAGE로 회수하지 못함 " + JSON.stringify(stored));
    await dragElementToElement(session, '#reserve-parts [data-reserve-id]', '#factory-board [data-cell-index="7"]');
    await sleep(100);
    const redeployed = await evaluate(session, "({ token: document.querySelector('.module-token')?.className || '', wires: document.querySelectorAll('.circuit-wire').length, reserve: document.querySelectorAll('#reserve-parts [data-reserve-id]').length, pending: Boolean(document.querySelector('#pending-part .pending-module')), dragged: document.querySelector('#board-message')?.textContent || '', pointer: document.querySelector('#game-canvas')?.dataset.factoryPointer || '', source: document.querySelector('#reserve-parts [data-reserve-id]')?.getBoundingClientRect().toJSON?.() || null, target: document.querySelector('#factory-board [data-cell-index=\\\"7\\\"]')?.getBoundingClientRect().toJSON?.() || null, sourceHit: (() => { const r = document.querySelector('#reserve-parts [data-reserve-id]')?.getBoundingClientRect(); const e = r && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e?.outerHTML?.slice(0, 180) || ''; })() })");
    assert(redeployed.token.includes('raw') && redeployed.wires === 1, "wide: STORAGE 블록을 재설치해 자동 결합하지 못함 " + JSON.stringify(redeployed));
    await clickElement(session, "#factory-commit");
    await sleep(80);
    const applied = await evaluate(session, "({ factoryOpen: !document.querySelector('#factory-overlay').hidden, traits: document.querySelector('#game-canvas').dataset.activeTraits || '', pending: Boolean(document.querySelector('#pending-part .pending-module')) })");
    assert(!applied.factoryOpen && applied.traits.includes("m_mark"), "wide: 연결된 회로를 전투에 적용하지 못함 " + JSON.stringify(applied));

    await clickElement(session, '#factory-toggle');
    await sleep(100);
    await evaluate(session, "document.querySelector('.module-m_mark [data-store-index]').click()");
    await sleep(100);
    const clearedMark = await evaluate(session, "({ pending: Boolean(document.querySelector('#pending-part .pending-module')), token: Boolean(document.querySelector('.module-m_mark')), reserve: document.querySelectorAll('#reserve-parts [data-reserve-id]').length })");
    assert(!clearedMark.pending && !clearedMark.token && clearedMark.reserve >= 1, "wide: 희귀 증강 전 기존 회로 회수 실패 " + JSON.stringify(clearedMark));
    await clickElement(session, '#factory-commit');
    await sleep(80);
    await clickElement(session, '#test-module-buttons [data-test-module="m_guard"]');
    await sleep(100);
    const rareTargetState = await evaluate(session, `(() => ({
      targets: [...document.querySelectorAll('#factory-board .valid-target')].map((cell) => Number(cell.dataset.cellIndex)),
      pending: document.querySelector('#pending-part .pending-module')?.dataset.pendingModule || null,
      boardTokens: [...document.querySelectorAll('#factory-board [data-part-id]')].map((token) => token.className),
      reserve: document.querySelectorAll('#reserve-parts [data-reserve-id]').length,
      message: document.querySelector('#board-message')?.textContent || '',
      mode: document.querySelector('#factory-overlay').hidden ? 'closed' : 'factory'
    }))()`);
    const rareTargets = rareTargetState.targets;
    assert(rareTargets.length === 1, "wide: 희귀 증강 중앙 BUS 결합 위치 계산 실패 " + JSON.stringify(rareTargetState));
    await clickElement(session, '#factory-board .valid-target');
    await sleep(760);
    const rareState = await evaluate(session, `(() => {
      const token = document.querySelector('.factory-board .module-m_guard');
      const cell = token?.closest('[data-cell-index]');
      const a = token?.getBoundingClientRect();
      const b = cell?.getBoundingClientRect();
      return { pass: Boolean(a && b && a.width > b.width * 1.6 && a.height > b.height * 1.6), anchor: Number(cell?.dataset.cellIndex), token: a && { width: a.width, height: a.height }, cell: b && { width: b.width, height: b.height }, wires: document.querySelectorAll('.circuit-wire').length, message: document.querySelector('#board-message')?.textContent };
    })()`);
    assert(rareState.pass && rareState.wires === 1, "wide: 희귀 2×2 증강의 중앙 결합·실제 점유 크기 오류 " + JSON.stringify(rareState));
    await evaluate(session, "document.querySelector('.module-m_guard [data-store-index]').click()");
    await sleep(80);
    await clickElement(session, "#factory-commit");
    await sleep(80);

    await clickElement(session, '#test-module-buttons [data-test-module="m_step"]');
    await sleep(100);
    const legendaryTargets = await evaluate(session, "[...document.querySelectorAll('#factory-board .valid-target')].map((cell) => Number(cell.dataset.cellIndex))");
    assert(legendaryTargets.length === 1, "wide: 전설 증강 중앙 BUS 결합 위치 계산 실패 " + JSON.stringify(legendaryTargets));
    await clickElement(session, '#factory-board .valid-target');
    await sleep(760);
    const legendaryState = await evaluate(session, `(() => {
      const token = document.querySelector('.factory-board .module-m_step');
      const cell = token?.closest('[data-cell-index]');
      const a = token?.getBoundingClientRect();
      const b = cell?.getBoundingClientRect();
      return { footprint: Boolean(a && b && a.width > b.width * 3.35 && a.height > b.height * 3.35), anchor: Number(cell?.dataset.cellIndex), wires: document.querySelectorAll('.circuit-wire').length };
    })()`);
    assert(legendaryState.footprint && legendaryState.wires === 1, "wide: 전설 4×4 증강의 중앙 결합·실제 점유 크기 오류 " + JSON.stringify(legendaryState));
    const legendaryPorts = await evaluate(session, `(() => {
      const token = document.querySelector('.factory-board .module-m_step');
      const ports = [...(token?.querySelectorAll('[data-port-kind="jack"]') || [])];
      const counts = Object.fromEntries(['top', 'right', 'bottom', 'left'].map((edge) => [edge, ports.filter((port) => port.dataset.portEdge === edge).length]));
      return { total: ports.length, counts };
    })()`);
    assert(legendaryPorts.total >= 2 && legendaryPorts.total <= 3 && legendaryPorts.counts.left === 1 && Object.values(legendaryPorts.counts).every((count) => count <= 1), "wide: 전설 증강 단자가 면당 1개·총 2–3개 희소 규칙을 벗어남 " + JSON.stringify(legendaryPorts));
    await clickElement(session, "#factory-commit");
    await sleep(80);

    await clickElement(session, '#test-audit');
    await sleep(100);
    const augmentAudit = await evaluate(session, `(() => {
      const canvas = document.querySelector('#game-canvas');
      const report = JSON.parse(canvas.dataset.auditReport || '{}');
      return { status: canvas.dataset.auditStatus, reports: report.reports?.map((item) => ({ missingActivations: item.missingActivations, missingEffects: item.missingEffects })) || [] };
    })()`);
    assert(augmentAudit.status === "pass" && augmentAudit.reports.length === 3 && augmentAudit.reports.every((report) => !report.missingActivations.length && !report.missingEffects.length), "wide: 30개 증강 실제 활성·효과 감사 실패 " + JSON.stringify(augmentAudit));

    await clickElement(session, '#test-level');
    const levelRamUi = await waitUntil(async () => {
      const state = await evaluate(session, `(() => ({
        choiceOpen: !document.querySelector('#choice-overlay').hidden,
        level: Number(document.querySelector('#level-text').textContent),
        capacity: Number(document.querySelector('#game-canvas').dataset.ramCapacity),
        hudRam: document.querySelector('#hud-ram-text').textContent,
        expansion: document.querySelector('#choice-ram-capacity').textContent,
        gain: document.querySelector('#choice-ram-gain').textContent,
        cards: [...document.querySelectorAll('.augment-card')].map((card) => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, state: card.querySelector('.card-top strong')?.textContent || '' };
        }),
        ranks: document.querySelectorAll('.augment-card .rank-track').length,
        effects: document.querySelectorAll('.augment-card .next-rank-effect').length,
        evolutions: document.querySelectorAll('.augment-card .evolution-preview').length
      }))()`);
      return state.choiceOpen ? state : null;
    });
    assert(levelRamUi.level === 2 && levelRamUi.capacity === 12 && levelRamUi.hudRam.endsWith('/ 12') && levelRamUi.expansion === '10 → 12 RAM' && levelRamUi.gain === '+2 CAPACITY', "wide: 레벨업 RAM 성장 UI 실패 " + JSON.stringify(levelRamUi));
    assert(levelRamUi.cards.length === 3 && levelRamUi.ranks === 3 && levelRamUi.effects === 3 && levelRamUi.evolutions === 3, "wide: 랭크·진화 3택 UI 누락 " + JSON.stringify(levelRamUi));
    assert(levelRamUi.cards.every((card) => card.left >= -1 && card.right <= viewport.width + 1 && card.top >= -1 && card.bottom <= viewport.height + 1), "wide: 레벨업 카드 잘림 " + JSON.stringify(levelRamUi));
    await captureUi(session, viewport, "levelup");
  }
  return `${viewport.width}×${viewport.height} ${viewport.layout} ×${start.scale.toFixed(3)}${viewport.name === "wide" && rightClickReset ? " · right-click reset" : ""}`;
}

async function main() {
  if (!chromePath) throw new Error("Chrome 또는 Edge 실행 파일을 찾지 못했습니다.");
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "augment-ui-audit-"));
  const browser = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ], { stdio: "ignore", windowsHide: true });

  try {
    const activePortFile = path.join(profileDir, "DevToolsActivePort");
    const portText = await waitUntil(() => fs.existsSync(activePortFile) && fs.readFileSync(activePortFile, "utf8"));
    const port = portText.split(/\r?\n/)[0];
    const targets = await waitUntil(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`).catch(() => null);
      if (!response?.ok) return null;
      const list = await response.json();
      return list.find((target) => target.type === "page");
    });
    const session = new CdpSession(targets.webSocketDebuggerUrl);
    await session.open();
    await session.send("Page.enable");
    await session.send("Runtime.enable");

    const reports = [];
    for (const viewport of viewports) reports.push(await auditViewport(session, viewport));
    await session.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    const liveResize = await waitUntil(async () => {
      const value = await evaluate(session, `(() => {
        const stage = document.querySelector('#ui-stage');
        const rect = stage.getBoundingClientRect();
        return { layout: stage.dataset.layout, scale: Number(stage.dataset.scale), width: rect.width, height: rect.height };
      })()`);
      return value.layout === "portrait" && Math.abs(value.scale - .75) < .002 ? value : null;
    });
    assert(Math.abs(liveResize.width - 390) < 1.5 && Math.abs(liveResize.height - 844) < 1.5, "실시간 resize 후 UI 스테이지 크기 불일치");
    reports.push("live resize short→portrait PASS");
    session.close();
    console.log("RESPONSIVE UI AUDIT PASS");
    for (const report of reports) console.log(`- ${report}`);
  } finally {
    browser.kill();
    await sleep(100);
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("RESPONSIVE UI AUDIT FAIL");
  console.error(`- ${error.message}`);
  process.exitCode = 1;
});
