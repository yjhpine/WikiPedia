const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("game.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const classPrefixes = { melee: "m_", sniper: "s_", artillery: "a_" };
const modules = [...source.matchAll(/^\s{2}([msa]_[a-z]+): \{ classId: "(melee|sniper|artillery)"/gm)]
  .map((match) => ({ id: match[1], classId: match[2] }));
const protocols = [...source.matchAll(/\{ types: \["([msa]_[a-z]+)", "([msa]_[a-z]+)"\], kind: "([a-z_]+)"/g)]
  .map((match) => ({ from: match[1], to: match[2], kind: match[3] }));
const augmentEvents = new Set([...source.matchAll(/noteAugment\("([msa]_[a-z]+)"\)/g)].map((match) => match[1]));
const protocolEvents = new Set([...source.matchAll(/noteProtocol\("([a-z_]+)"\)/g)].map((match) => match[1]));
const playstyleIds = [...source.matchAll(/id: "(pursuit|maelstrom|counter|deadeye|hunter|ranger|inferno|cascade|orbital)"/g)].map((match) => match[1]);
const ramEntries = [...source.matchAll(/\b([msa]_[a-z]+): [234](?:,|\s*\n)/g)].map((match) => match[1]);
const toolIds = ["router", "splitter", "amplifier", "repeater", "focuser", "inverter"];
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(modules.length === 30, `증강 정의 ${modules.length}/30`);
check(protocols.length === 30, `프로토콜 정의 ${protocols.length}/30`);
check(new Set(playstyleIds).size === 9, `주력 플레이스타일 정의 ${new Set(playstyleIds).size}/9`);
check(new Set(ramEntries).size === 30, `모듈 RAM 비용 정의 ${new Set(ramEntries).size}/30`);
check(toolIds.every((id) => source.includes(`  ${id}: {`)), "공정 도구 6종 정의 누락");
check(html.includes('id="test-audit"'), "브라우저 자동 진단 버튼 누락");
check(html.includes("styles.css?v=prototype-09") && html.includes("game.js?v=prototype-09"), "UX 보완 캐시 버전 prototype-09 누락");
check(["build-signature", "pending-archive", "reserve-parts", "factory-tools", "factory-recipe-list"].every((id) => html.includes(`id="${id}"`)), "빌드/RAM/공정 도구 UI 항목 누락");
check(source.includes("runFactoryToolAudits") && source.includes("queueFactoryEcho") && source.includes("buildFactoryTuning"), "신호 그래프 전투 가공 진단 누락");

const essentialHudIds = ["health-text", "xp-text", "time-text", "objective-count", "attack-status", "dash-status", "factory-toggle"];
const removedHudClasses = ["hud-right", "combat-readout", "control-hint", "mini-board"];
check(essentialHudIds.every((id) => html.includes(`id="${id}"`)), "필수 전투 HUD 항목 누락");
check(removedHudClasses.every((className) => !html.includes(`class="${className}`)), "비필수 전투 HUD가 다시 노출됨");
check(source.includes("ctx.rotate(player.facing)"), "플레이어 본체 이동 방향 렌더링 누락");
check(source.includes("ctx.rotate(player.weaponFacing)"), "공격 무기 방향 렌더링 누락");
check(source.includes("startSlash(player.bufferedAim)"), "입력 순간 공격 각도 버퍼 누락");
check(!source.includes("player.aim = Math.atan2(game.mouse.y - player.y, game.mouse.x - player.x)"), "마우스 이동이 플레이어 방향을 계속 덮어씀");
check(source.includes("player.renderX +=") && source.includes("enemy.renderX =") && source.includes("game.cameraOffsetX +="), "위치·적·카메라 보간 누락");
check(source.includes("game.cursorX +=") && source.includes("const eased = 1 - (1 - progress) ** 3"), "조준점·효과 보간 누락");
check(styles.includes("cubic-bezier(.16,1,.3,1)") && styles.includes("image-rendering: auto"), "UI·캔버스 부드러운 전환 설정 누락");
check(!source.includes('.factory-header > div > span'), "삭제된 공장 헤더 요소 참조가 남아 있음");
check(!/\.game\s*\{[^}]*min-width:\s*920px/.test(styles), "좁은 화면을 강제로 잘라내는 게임 최소 너비가 남아 있음");
check(/\.overlay\s*\{[^}]*overflow:\s*auto/.test(styles), "긴 오버레이의 양방향 스크롤 보호 누락");
check(/\.factory-layout\s*\{[^}]*overflow-x:\s*auto/.test(styles), "좁은 공장 3열의 가로 스크롤 보호 누락");
check(styles.includes(".augment-card .placement-hint { position: static;") && styles.includes(".build-affinity { position: static;"), "증강 카드 설명·태그 고정 배치 겹침 위험");
check(/\.part-rotate\s*\{[^}]*left:\s*2px/.test(styles) && /\.module-ram\s*\{[^}]*right:\s*-7px/.test(styles), "회전 버튼과 RAM 배지 분리 누락");
check(/\.board-message\s*\{[^}]*position:\s*sticky[^}]*white-space:\s*normal/.test(styles), "긴 보드 메시지 줄바꿈·고정 보호 누락");
check(/\.factory-action-bar\s*\{[^}]*position:\s*sticky/.test(styles) && html.includes('class="factory-action-bar"'), "공장 적용 버튼 고정 영역 누락");
check([980, 760, 560].every((width) => styles.includes(`@media (max-width: ${width}px)`)), "핵심 반응형 UX 구간 누락");

const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));
const makeElement = () => ({
  hidden: false, disabled: false, dataset: {}, style: { setProperty() {} }, childNodes: [{ textContent: "" }],
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, setAttribute() {}, getAttribute() { return null; }, closest() { return null; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
  innerHTML: "", textContent: "", className: ""
});
const elements = new Map([...htmlIds].map((id) => [id, makeElement()]));
const canvasContext = new Proxy({}, {
  get(target, key) {
    if (key === "createLinearGradient" || key === "createRadialGradient") return () => ({ addColorStop() {} });
    return target[key] || (() => {});
  },
  set(target, key, value) { target[key] = value; return true; }
});
elements.get("game-canvas").getContext = () => canvasContext;
const documentStub = {
  querySelector(selector) {
    if (selector.startsWith("#")) return elements.get(selector.slice(1)) || null;
    return makeElement();
  },
  querySelectorAll() { return []; }
};
try {
  const runtime = vm.createContext({
    document: documentStub, window: { location: { search: "?test=1" }, addEventListener() {} },
    innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, URLSearchParams,
    performance: { now: () => 0 }, requestAnimationFrame() {}, setTimeout() { return 0; }, clearTimeout() {}, console
  });
  vm.runInContext(source, runtime, { filename: "game.js", timeout: 1500 });
  const facingAudit = vm.runInContext(`(() => {
    selectClass("sniper");
    startGame();
    game.enemies = [];
    const initialFacing = game.player.facing;
    game.mouse = { x: game.player.x + 260, y: game.player.y };
    updatePlayer(.1);
    const mouseOnlyStable = Math.abs(angleDelta(game.player.facing, initialFacing)) < .001 && Math.abs(angleDelta(game.player.aim, initialFacing)) < .001;
    game.keys.add("KeyD");
    updatePlayer(.2);
    game.keys.clear();
    const bodyFollowsMovement = Math.abs(angleDelta(game.player.facing, 0)) < .2;
    game.mouse = { x: game.player.x - 260, y: game.player.y };
    game.player.attackCooldown = 0;
    game.attackRequested = true;
    updatePlayer(.016);
    const attackUsesCursor = Math.abs(angleDelta(game.player.aim, Math.PI)) < .01 && game.playerShots[0]?.vx < 0;
    const bodyIsIndependent = Math.abs(angleDelta(game.player.facing, game.player.aim)) > 1;
    draw();
    return { mouseOnlyStable, bodyFollowsMovement, attackUsesCursor, bodyIsIndependent, renderPass: true };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(facingAudit).every(Boolean), `플레이어 방향 런타임 검증 실패: ${JSON.stringify(facingAudit)}`);
  const classRenderAudit = vm.runInContext(`[
    "melee", "sniper", "artillery"
  ].every((classId) => {
    selectClass(classId);
    startGame();
    game.enemies = [];
    game.mouse = { x: game.player.x + 240, y: game.player.y - 80 };
    game.attackRequested = true;
    updatePlayer(.016);
    draw();
    return Number.isFinite(game.player.facing) && Number.isFinite(game.player.weaponFacing);
  })`, runtime, { timeout: 1000 });
  check(classRenderAudit, "세 클래스 보간 렌더링 스모크 테스트 실패");
  const placementAudit = vm.runInContext(`(() => {
    game.selectedClass = "melee";
    startGame();
    factory.pending = { id: factory.nextId++, kind: "module", type: "m_step" };
    openFactory(false);
    const first = indexOf(1, MAIN_ROW);
    const second = indexOf(2, MAIN_ROW);
    const factoryOpened = game.mode === "factory" && !document.querySelector("#factory-overlay").hidden;
    placePending(first);
    const pendingPlaced = factory.pending === null && board[first]?.type === "m_step" && !document.querySelector("#factory-commit").disabled;
    moveBoardModule(first, second);
    const moduleMoved = board[first] === null && board[second]?.type === "m_step" && !evaluateClassFactory().traits.has("m_step");
    selectToolBlueprint("amplifier");
    placePending(first);
    const poweredThroughTool = evaluateClassFactory().traits.has("m_step") && evaluateClassFactory().recipes.get(board[second].id)?.mode === "OVERDRIVE";
    const third = indexOf(3, MAIN_ROW);
    selectToolBlueprint("router");
    placePending(third);
    factory.selectedIndex = third;
    rotateBoardTool(third);
    const toolRotated = board[third]?.type === "router" && board[third].dir === 1;
    commitFactory();
    const committed = game.mode === "playing" && document.querySelector("#factory-overlay").hidden && game.output.traits.has("m_step");
    return { factoryOpened, pendingPlaced, moduleMoved, poweredThroughTool, toolRotated, committed };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(placementAudit).every(Boolean), `증강 배치 흐름 검증 실패: ${JSON.stringify(placementAudit)}`);
  const ramAudit = vm.runInContext(`(() => {
    game.selectedClass = "melee";
    startGame();
    game.player.level = 1;
    factory.pending = { id: factory.nextId++, kind: "module", type: "m_step" };
    openFactory(false);
    placePending(indexOf(1, MAIN_ROW));
    factory.pending = { id: factory.nextId++, kind: "module", type: "m_mark" };
    placePending(indexOf(2, MAIN_ROW));
    const linkedWithinBudget = ramUsage(evaluateClassFactory()) === 6 && evaluateClassFactory().build?.id === "pursuit";
    factory.pending = { id: factory.nextId++, kind: "module", type: "m_blood" };
    placePending(indexOf(3, MAIN_ROW));
    const thirdCoreAccepted = board[indexOf(3, MAIN_ROW)]?.type === "m_blood" && ramUsage(evaluateClassFactory()) === 9;
    factory.pending = { id: factory.nextId++, kind: "tool", type: "amplifier", dir: 0 };
    placePending(indexOf(5, MAIN_ROW));
    const overBudgetRejected = factory.pending?.type === "amplifier" && board[indexOf(5, MAIN_ROW)] === null;
    archivePending();
    const toolCancelIsFree = factory.pending === null && !factory.reserve.some((part) => part.type === "amplifier");
    storeBoardModule(indexOf(3, MAIN_ROW));
    const archivedForZeroRam = factory.reserve.some((module) => module.type === "m_blood") && ramUsage(evaluateClassFactory()) === 6;
    const capacities = [1, 2, 4, 8].map((level) => { game.player.level = level; return ramCapacity(); });
    const capacityProgression = JSON.stringify(capacities) === JSON.stringify([10, 12, 16, 24]);
    return { linkedWithinBudget, thirdCoreAccepted, overBudgetRejected, toolCancelIsFree, archivedForZeroRam, capacityProgression };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(ramAudit).every(Boolean), `RAM 제약 검증 실패: ${JSON.stringify(ramAudit)}`);
  const fullAudit = vm.runInContext(`runAllAugmentAudits()`, runtime, { timeout: 5000 });
  check(fullAudit.pass && fullAudit.playstyles.length === 9 && fullAudit.playstyles.every((report) => report.pass) && fullAudit.factoryTools.pass, `전체 런타임 검증 실패: ${JSON.stringify(fullAudit)}`);
} catch (error) {
  failures.push(`초기 화면 런타임 오류: ${error.message}`);
}

for (const [classId, prefix] of Object.entries(classPrefixes)) {
  const classModules = modules.filter((module) => module.classId === classId);
  const classProtocols = protocols.filter((protocol) => protocol.from.startsWith(prefix));
  const exactPairs = new Set(classProtocols.map((protocol) => `${protocol.from}>${protocol.to}`));
  check(classModules.length === 10, `${classId}: 증강 ${classModules.length}/10`);
  check(classProtocols.length === 10, `${classId}: 프로토콜 ${classProtocols.length}/10`);
  check(classProtocols.every((protocol) => protocol.to.startsWith(prefix)), `${classId}: 다른 클래스 연결 존재`);
  check(classModules.every((module) => augmentEvents.has(module.id)), `${classId}: 런타임 증강 기록 누락`);
  check(classProtocols.every((protocol) => protocolEvents.has(protocol.kind)), `${classId}: 런타임 프로토콜 기록 누락`);
  check(classModules.every((module) => classProtocols.filter((protocol) => protocol.from === module.id).length === 1), `${classId}: 출발 링크가 1개가 아닌 증강 존재`);
  check(classModules.every((module) => classProtocols.filter((protocol) => protocol.to === module.id).length === 1), `${classId}: 도착 링크가 1개가 아닌 증강 존재`);
  check(classProtocols.every((protocol, index) => protocol.to === classProtocols[(index + 1) % classProtocols.length].from), `${classId}: 레시피 순환이 끊김`);
  check(classProtocols.every((protocol) => !exactPairs.has(`${protocol.to}>${protocol.from}`)), `${classId}: 역방향도 활성화되는 링크 존재`);
}

if (failures.length) {
  console.error("AUGMENT AUDIT FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("GAME AUDIT PASS");
  console.log("30/30 augments · 6/6 process tools · routed graph · 9/9 playstyles · responsive UX guards · combat rendering");
}
