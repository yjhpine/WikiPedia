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
check(html.includes("styles.css?v=prototype-18") && html.includes("game.js?v=prototype-18") && html.includes('id="critical-flash"'), "치명타 화면 효과 또는 캐시 버전 prototype-18 누락");
check(["build-signature", "pending-archive", "reserve-parts", "factory-tools", "factory-recipe-list"].every((id) => html.includes(`id="${id}"`)), "빌드/RAM/공정 도구 UI 항목 누락");
check(html.includes('id="ui-stage"') && html.includes('viewport-fit=cover'), "전체 UI 스테이지 또는 안전 영역 viewport 설정 누락");
check(source.includes("runFactoryToolAudits") && source.includes("operationalCircuit") && source.includes("spawnToolDrop") && source.includes("rebuildPhysicalWires") && source.includes("findPhysicalPortMatch") && source.includes("lego-tool-three-way") && source.includes("lego-augment-random") && source.includes("COMBAT_TEMPO") && source.includes("MELEE_WEAPON_SCALE = 2") && source.includes("range: 104 * MELEE_WEAPON_SCALE") && source.includes("ctx.scale(MELEE_WEAPON_SCALE, MELEE_WEAPON_SCALE)") && source.includes("availableToolTypes") && source.includes("dragTargetIsValid") && source.includes("tool-palette") && source.includes("triggerImpactFeedback") && source.includes("flashCriticalFeedback") && source.includes("hitStop"), "도구 진행·드래그·물리 단자·전투 템포·치명타·근접 무기 진단 누락");

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
check(styles.includes(".circuit-port") && styles.includes(".circuit-wires") && styles.includes("--footprint-w") && styles.includes("Schematic circuit-board reskin") && styles.includes("Lego proximity circuit controls") && html.includes('id="board-expand"'), "다중 크기 레고 단자·확장 회로도 UI 누락");
check(/\.board-message\s*\{[^}]*position:\s*sticky[^}]*white-space:\s*normal/.test(styles), "긴 보드 메시지 줄바꿈·고정 보호 누락");
check(/\.factory-action-bar\s*\{[^}]*position:\s*sticky/.test(styles) && html.includes('class="factory-action-bar"'), "공장 적용 버튼 고정 영역 누락");
check([980, 760, 560].every((width) => styles.includes(`@media (max-width: ${width}px)`)), "핵심 반응형 UX 구간 누락");
check(/\.ui-stage\s*\{[^}]*transform:\s*scale\(var\(--ui-scale\)\)[^}]*transform-origin:\s*0 0/.test(styles), "전체 UI 균일 스케일 스테이지 누락");
check(/\.ui-stage\s*\{[^}]*pointer-events:\s*none/.test(styles), "UI 스테이지가 전투 캔버스 마우스 입력을 차단함");
check(/\.overlay\s*\{[^}]*pointer-events:\s*auto/.test(styles) && /\.factory-toggle\s*\{[^}]*pointer-events:\s*auto/.test(styles) && /\.test-panel\s*\{[^}]*pointer-events:\s*auto/.test(styles), "상호작용 UI 포인터 복구 규칙 누락");
check(["--ui-width", "--ui-height", "--ui-vw", "--ui-vh"].every((token) => styles.includes(token)), "가상 UI viewport 변수 누락");
check(source.includes("UI_LAYOUT_PROFILES") && source.includes("UI_REFERENCE_ANCHORS") && source.includes("interfaceReference") && source.includes("interfaceMetrics") && source.includes("resizeInterface"), "화면 비율별 UI 스케일 계산 누락");

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
  documentElement: { clientWidth: 1280, clientHeight: 720, style: { setProperty() {} }, dataset: {} },
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
  const interfaceAudit = vm.runInContext(`(() => {
    const wide = interfaceMetrics(1920, 1080);
    const portrait = interfaceMetrics(390, 844);
    const compact = interfaceMetrics(1024, 1024);
    const short = interfaceMetrics(844, 390);
    const portraitEdgeLeft = interfaceMetrics(819, 1000);
    const portraitEdgeRight = interfaceMetrics(821, 1000);
    const wideEdgeLeft = interfaceMetrics(1449, 1000);
    const wideEdgeRight = interfaceMetrics(1451, 1000);
    return {
      wideFits: wide.layout === "wide" && Math.abs(wide.scale - 1.2) < .001 && Math.abs(wide.width - 1600) < .01,
      portraitFits: portrait.layout === "portrait" && Math.abs(portrait.scale - .75) < .001 && Math.abs(portrait.width - 520) < .01,
      compactFits: compact.layout === "compact" && compact.scale > .93 && compact.scale < .932,
      minimumGuard: short.layout === "wide" && Math.abs(short.scale - UI_SCALE_MIN) < .001,
      profileEdgesAreSmooth: Math.abs(portraitEdgeLeft.scale - portraitEdgeRight.scale) < .01 && Math.abs(wideEdgeLeft.scale - wideEdgeRight.scale) < .01,
      stageUpdated: document.querySelector("#ui-stage").dataset.layout === "wide" && document.querySelector("#ui-stage").dataset.scale === "0.800"
    };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(interfaceAudit).every(Boolean), `UI 비율 스케일 런타임 검증 실패: ${JSON.stringify(interfaceAudit)}`);
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
  const meleeWeaponAudit = vm.runInContext(`(() => {
    game.mode = "start";
    selectClass("melee");
    startGame();
    const range = game.output.primary.range;
    startSlash(0);
    return { doubledRange: range === 104 * MELEE_WEAPON_SCALE, slashUsesRange: game.player.slash?.range === range };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(meleeWeaponAudit).every(Boolean), `근접 무기 2배 스케일 런타임 검증 실패: ${JSON.stringify(meleeWeaponAudit)}`);
  const tempoAudit = vm.runInContext(`(() => {
    game.mode = "start";
    selectClass("sniper");
    startGame();
    game.enemies = [];
    game.playerShots = [];
    const close = (actual, expected) => Math.abs(actual - expected) < .001;
    const playerMove = close(game.player.speed, 225 * COMBAT_TEMPO.unitMove);
    const attackRate = close(game.output.primary.cooldown, CLASS_PROFILES.sniper.cooldown / COMBAT_TEMPO.attackRate);
    spawnRailShot(0, { speed: 100 });
    launchGrenade(0, { speed: 100 });
    const railSpeed = Math.hypot(game.playerShots[0].vx, game.playerShots[0].vy);
    const grenadeSpeed = Math.hypot(game.playerShots[1].vx, game.playerShots[1].vy);
    spawnEnemy("turret", game.player.x + 320, game.player.y);
    const turret = game.enemies[0];
    const enemyMove = close(turret.speed, (45 + game.room * 1.4) * COMBAT_TEMPO.unitMove);
    fireEnemyBullet(turret, 100, 1);
    const enemyProjectileSpeed = Math.hypot(game.enemyBullets[0].vx, game.enemyBullets[0].vy);
    turret.shootCooldown = 0;
    updateEnemies(.001);
    const enemyAttackRate = close(turret.shootWindup, .38 / COMBAT_TEMPO.attackRate);
    return {
      playerMove, attackRate,
      playerProjectile: close(railSpeed, 100 * COMBAT_TEMPO.projectile) && close(grenadeSpeed, 100 * COMBAT_TEMPO.projectile),
      enemyMove, enemyProjectile: close(enemyProjectileSpeed, 100 * COMBAT_TEMPO.projectile), enemyAttackRate
    };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(tempoAudit).every(Boolean), `전투 템포 런타임 검증 실패: ${JSON.stringify(tempoAudit)}`);
  const criticalAudit = vm.runInContext(`(() => {
    game.mode = "start";
    selectClass("melee");
    startGame();
    game.enemies = [];
    spawnEnemy("drone", game.player.x + 180, game.player.y);
    const enemy = game.enemies[0];
    const hpBefore = enemy.hp;
    const previousRandom = Math.random;
    try {
      Math.random = () => 0;
      damageEnemy(enemy, 10, { ...game.output.primary, crit: 1, critMultiplier: 2, knockback: 0, stun: 0 }, 0, true);
    } finally {
      Math.random = previousRandom;
    }
    return {
      visibleChance: game.output.primary.crit >= .12,
      doubleDamage: Math.abs(enemy.hp - (hpBefore - 20)) < .001,
      impactFeedback: game.criticalHits === 1 && game.hitStop > 0 && game.floaters.some((floater) => floater.critical) && enemy.critical > 0
    };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(criticalAudit).every(Boolean), `치명타 런타임 검증 실패: ${JSON.stringify(criticalAudit)}`);
  const circuitAudit = vm.runInContext(`(() => {
    game.selectedClass = "melee";
    startGame();
    game.enemies = [];
    openFactory(true);
    const first = indexOf(1, 0);
    factory.pending = createPart("module", "m_guard");
    const factoryOpened = game.mode === "factory" && !document.querySelector("#factory-overlay").hidden;
    placePending(first);
    const placedRare = board[first]?.type === "m_guard" && partFootprint(board[first]).width === 2 && partFootprint(board[first]).height === 2;
    const moduleId = board[first].id;
    const autoLegoActive = evaluateClassFactory().traits.has("m_guard") && factory.wires.length === 1 && factory.wires[0]?.fromId === BUS_SOURCE_ID && factory.wires[0]?.toEdge === "left";
    storeBoardModule(first);
    const storedForRedeploy = factory.reserve.some((part) => part.id === moduleId) && !board[first];
    activateReserve(moduleId);
    const pickupAndRedeploy = factory.pending?.id === moduleId;
    placePending(first);
    const redeployedActive = evaluateClassFactory().traits.has("m_guard") && factory.wires.length === 1;
    const branch = createPart("module", "m_spin");
    board[indexOf(1, 3)] = branch;
    const toolLink = createPart("tool", "router");
    const neighbor = createPart("tool", "amplifier");
    board[indexOf(4, 1)] = toolLink;
    board[indexOf(5, 1)] = neighbor;
    rebuildPhysicalWires();
    const neighborWire = factory.wires.find((wire) => wire.fromId === toolLink.id && wire.toId === neighbor.id);
    const branchLinesApply = evaluateClassFactory().traits.has("m_guard") && evaluateClassFactory().traits.has("m_spin") && factory.wires.filter((wire) => wire.fromId === BUS_SOURCE_ID).length === 2;
    const proximityOnly = Boolean(neighborWire) && neighborWire.fromEdge === "right" && neighborWire.toEdge === "left" && !findPhysicalPortMatch(neighbor.id, toolLink.id) && !connectPorts(toolLink.id, branch.id);
    const colsBeforeExtend = boardCols;
    extendBoard();
    const boardExtends = boardCols === colsBeforeExtend + EXTEND_BY && board.length === boardCols * ROWS;
    const noDropNoTool = factory.toolInventory.amplifier === 0;
    selectToolBlueprint("amplifier");
    const unlimitedToolBlocked = factory.pending === null;
    collectToolDrop({ id: 71, type: "amplifier", x: game.player.x, y: game.player.y, radius: 12 });
    selectToolBlueprint("amplifier");
    const droppedToolSelected = factory.pending?.type === "amplifier";
    placePending(indexOf(6, 0));
    const toolConsumed = factory.toolInventory.amplifier === 0 && board[indexOf(6, 0)]?.type === "amplifier";
    storeBoardModule(indexOf(6, 0));
    const toolRecovered = factory.toolInventory.amplifier === 1;
    const paletteTarget = indexOf(7, 0);
    factory.dragged = { kind: "tool-palette", type: "amplifier" };
    const toolPaletteDrag = dragTargetIsValid(paletteTarget) && completeFactoryDrop(paletteTarget) && board[paletteTarget]?.type === "amplifier" && factory.toolInventory.amplifier === 0;
    storeBoardModule(paletteTarget);
    const raritySizes = ["common", "rare", "legendary"].every((rarity) => moduleTypes.some((type) => MODULE_RARITIES[type] === rarity)) &&
      JSON.stringify([RARITIES.common.width, RARITIES.rare.width, RARITIES.legendary.width]) === JSON.stringify([1, 2, 4]);
    const portLayouts = (() => {
      const tool = createPart("tool", "router");
      const augment = createPart("module", "m_mark");
      return tool.ports.layout === "lego-tool-three-way" && PORT_EDGES.every((edge) => portOffsets(tool, edge).length) &&
        augment.ports.layout === "lego-augment-random" && augment.ports.edges.length >= 2 && augment.ports.edges.includes("left");
    })();
    commitFactory();
    const committed = game.mode === "playing" && document.querySelector("#factory-overlay").hidden && game.output.traits.has("m_guard");
    const capacities = [1, 2, 4, 8].map((level) => { game.player.level = level; return ramCapacity(); });
    const capacityProgression = JSON.stringify(capacities) === JSON.stringify([10, 12, 16, 24]);
    return { factoryOpened, placedRare, autoLegoActive, storedForRedeploy, pickupAndRedeploy, redeployedActive, branchLinesApply, proximityOnly, boardExtends, noDropNoTool, unlimitedToolBlocked, droppedToolSelected, toolConsumed, toolRecovered, toolPaletteDrag, raritySizes, portLayouts, committed, capacityProgression };
  })()`, runtime, { timeout: 1500 });
  check(Object.values(circuitAudit).every(Boolean), `드랍·단자 회로 흐름 검증 실패: ${JSON.stringify(circuitAudit)}`);
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
  console.log("30/30 augments · T1→T3 staged tools · tool 3-way / random 2+ augment jacks · drag/PICK/redeploy · 9/9 playstyles · high-tempo combat + crit impact rendering");
}
