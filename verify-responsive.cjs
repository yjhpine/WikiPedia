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
    const point = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };
    return { source: point(${JSON.stringify(sourceSelector)}), target: point(${JSON.stringify(targetSelector)}) };
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
  const combat = await evaluate(session, `(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector).getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      hud: rect('.hud-left'),
      objective: rect('#combat-objective'),
      abilities: rect('.ability-rack'),
      factoryToggle: rect('#factory-toggle')
    };
  })()`);
  assert(pointerTarget.id === "game-canvas", `${viewport.name}: 전투 클릭이 ${pointerTarget.id || pointerTarget.className || pointerTarget.tag}에 차단됨`);
  assert(swingAfterClick >= 1, `${viewport.name}: 실제 마우스 클릭 공격 미발동`);
  for (const [name, rect] of Object.entries(combat)) {
    assert(rectFits(rect, viewport.width, viewport.height), `${viewport.name}: ${name} HUD 잘림 ${JSON.stringify(rect)}`);
  }

  await clickElement(session, "#factory-toggle");
  await sleep(360);
  const factory = await evaluate(session, `(() => {
    const overlay = document.querySelector('#factory-overlay');
    const shell = document.querySelector('.factory-shell').getBoundingClientRect();
    return {
      open: !overlay.hidden,
      shell: { left: shell.left, top: shell.top, right: shell.right, bottom: shell.bottom, width: shell.width, height: shell.height },
      boardScrollable: document.querySelector('.factory-layout').scrollWidth >= document.querySelector('.factory-layout').clientWidth
    };
  })()`);
  assert(factory.open, `${viewport.name}: 공장 오버레이 열기 실패`);
  assert(rectFits(factory.shell, viewport.width, viewport.height), `${viewport.name}: 공장 셸 잘림 ${JSON.stringify(factory.shell)}`);
  assert(factory.boardScrollable, `${viewport.name}: 공장 레이아웃 스크롤 보호 누락`);

  if (viewport.name === "wide") {
    await clickElement(session, "#factory-commit");
    await sleep(80);
    await clickElement(session, '#test-module-buttons [data-test-module="m_mark"]');
    await sleep(120);
    const factoryEntry = await evaluate(session, "({ factoryOpen: !document.querySelector('#factory-overlay').hidden, pending: Boolean(document.querySelector('#pending-part .pending-module')), testPanel: !document.querySelector('#test-panel').hidden, moduleButtons: document.querySelector('#test-module-buttons').children.length })");
    assert(factoryEntry.factoryOpen && factoryEntry.pending, "wide: 테스트 증강 공장 진입 실패 " + JSON.stringify(factoryEntry));
    await clickElement(session, '#factory-board [data-cell-index="7"]');
    await sleep(120);
    await sleep(120);
    const circuitState = await evaluate(session, "({ wires: document.querySelectorAll('.circuit-wire').length, token: document.querySelector('.module-token')?.className || null, rails: document.querySelectorAll('[data-port-owner=\"bus-source\"][data-port-row]').length, jacks: document.querySelectorAll('.module-token [data-port-kind=\"jack\"]').length, leftJacks: document.querySelectorAll('.module-token [data-port-edge=\"left\"]').length, hasPickup: Boolean(document.querySelector('.module-token [data-store-index]')), message: document.querySelector('#board-message')?.textContent || null })");
    const connected = circuitState.wires === 1 && circuitState.token?.includes("raw") && circuitState.rails === 5 && circuitState.jacks >= 2 && circuitState.leftJacks >= 1 && circuitState.hasPickup;
    assert(connected, "wide: 인접 레고 결합 또는 PICK 버튼이 동작하지 않음 " + JSON.stringify(circuitState));
    await dragElementToElement(session, '.module-token .part-code', '#factory-board [data-cell-index="8"]');
    const movedByDrag = await evaluate(session, "(() => { const token = document.querySelector('.module-token'); return { anchor: Number(token?.closest('[data-cell-index]')?.dataset.cellIndex), wires: document.querySelectorAll('.circuit-wire').length }; })()");
    assert(movedByDrag.anchor === 8 && movedByDrag.wires === 1, "wide: 설치 블록을 드래그로 옮기지 못함 " + JSON.stringify(movedByDrag));
    await clickElement(session, '.module-token .part-code');
    await sleep(70);
    const lifted = await evaluate(session, "({ pending: Boolean(document.querySelector('#pending-part .pending-module')), token: Boolean(document.querySelector('.module-token')), wires: document.querySelectorAll('.circuit-wire').length })");
    assert(lifted.pending && !lifted.token && lifted.wires === 0, "wide: 블록 클릭으로 바로 들어 올리지 못함 " + JSON.stringify(lifted));
    await dragElementToElement(session, '#pending-part .pending-module', '#factory-board [data-cell-index="7"]');
    await sleep(90);
    const placedAgain = await evaluate(session, "({ token: document.querySelector('.module-token')?.className || '', wires: document.querySelectorAll('.circuit-wire').length, pending: Boolean(document.querySelector('#pending-part .pending-module')), message: document.querySelector('#board-message')?.textContent || '' })");
    assert(placedAgain.token.includes('raw') && placedAgain.wires === 1, "wide: 들어 올린 블록을 바로 재배치하지 못함 " + JSON.stringify(placedAgain));
    const cellsBeforeExtend = await evaluate(session, "document.querySelectorAll('#factory-board [data-cell-index]').length");
    await clickElement(session, '#board-expand');
    await sleep(80);
    const boardExtended = await evaluate(session, "document.querySelectorAll('#factory-board [data-cell-index]').length === " + cellsBeforeExtend + " + 40");
    assert(boardExtended, "wide: 보드 수동 확장이 8열(40칸) 적용되지 않음");
    await clickElement(session, '.module-token [data-store-index]');
    await sleep(80);
    const stored = await evaluate(session, "({ stored: document.querySelectorAll('#reserve-parts [data-reserve-id]').length, token: Boolean(document.querySelector('.module-token')), wires: document.querySelectorAll('.circuit-wire').length })");
    assert(stored.stored === 1 && !stored.token && stored.wires === 0, "wide: 설치 블록을 STORAGE로 회수하지 못함 " + JSON.stringify(stored));
    await dragElementToElement(session, '#reserve-parts [data-reserve-id]', '#factory-board [data-cell-index="7"]');
    await sleep(100);
    const redeployed = await evaluate(session, "({ token: document.querySelector('.module-token')?.className || '', wires: document.querySelectorAll('.circuit-wire').length })");
    assert(redeployed.token.includes('raw') && redeployed.wires === 1, "wide: STORAGE 블록을 재설치해 자동 결합하지 못함 " + JSON.stringify(redeployed));
    await clickElement(session, "#factory-commit");
    await sleep(80);
    const applied = await evaluate(session, "({ factoryOpen: !document.querySelector('#factory-overlay').hidden, traits: document.querySelector('#game-canvas').dataset.activeTraits || '', pending: Boolean(document.querySelector('#pending-part .pending-module')) })");
    assert(!applied.factoryOpen && applied.traits.includes("m_mark"), "wide: 연결된 회로를 전투에 적용하지 못함 " + JSON.stringify(applied));
    await clickElement(session, '#test-module-buttons [data-test-module="m_guard"]');
    await sleep(100);
    await clickElement(session, '#factory-board [data-cell-index="15"]');
    await sleep(760);
    const rareState = await evaluate(session, `(() => { const token = document.querySelector('.factory-board .module-m_guard'); const cell = document.querySelector('[data-cell-index="15"]'); const a = token?.getBoundingClientRect(); const b = cell?.getBoundingClientRect(); return { pass: Boolean(a && b && a.width > b.width * 1.6 && a.height > b.height * 1.6), token: a && { width: a.width, height: a.height }, cell: b && { width: b.width, height: b.height }, message: document.querySelector('#board-message')?.textContent, css: token && { width: getComputedStyle(token).width, inline: token.style.getPropertyValue('--footprint-width'), cell: getComputedStyle(document.documentElement).getPropertyValue('--cell') } }; })()`);
    assert(rareState.pass, "wide: 희귀 2×2 증강의 실제 보드 점유 크기 오류 " + JSON.stringify(rareState));
    await clickElement(session, "#factory-commit");
    await sleep(80);
    await clickElement(session, '#test-module-buttons [data-test-module="m_step"]');
    await sleep(100);
    await clickElement(session, '#factory-board [data-cell-index="25"]');
    await sleep(760);
    const legendaryFootprint = await evaluate(session, `(() => { const token = document.querySelector('.factory-board .module-m_step'); const cell = document.querySelector('[data-cell-index="25"]'); const a = token?.getBoundingClientRect(); const b = cell?.getBoundingClientRect(); return Boolean(a && b && a.width > b.width * 3.35 && a.height > b.height * 3.35); })()`);
    assert(legendaryFootprint, "wide: 전설 4×4 증강의 실제 보드 점유 크기 오류");
    await clickElement(session, "#factory-commit");
  }

  return `${viewport.width}×${viewport.height} ${viewport.layout} ×${start.scale.toFixed(3)}`;
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
