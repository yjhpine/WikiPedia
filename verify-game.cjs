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
const toolCombinations = [...source.matchAll(/\{ types: \["(router|splitter|amplifier|repeater|focuser|inverter)", "(router|splitter|amplifier|repeater|focuser|inverter)"\], name: "([^"]+)"/g)]
  .map((match) => ({ a: match[1], b: match[2], name: match[3] }));
const growthEntries = [...source.matchAll(/^\s{2}([msa]_[a-z]+): \["/gm)].map((match) => match[1]);
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
check(protocols.length === 15, `완성형 진화 정의 ${protocols.length}/15`);
check(toolCombinations.length === 6, `도구 X 조합 정의 ${toolCombinations.length}/6`);
check(new Set(growthEntries).size === 30, `증강 랭크 성장표 ${new Set(growthEntries).size}/30`);
check(new Set(playstyleIds).size === 9, `주력 플레이스타일 정의 ${new Set(playstyleIds).size}/9`);
check(new Set(ramEntries).size === 30, `모듈 RAM 비용 정의 ${new Set(ramEntries).size}/30`);
check(toolIds.every((id) => source.includes(`  ${id}: {`)), "공정 도구 6종 정의 누락");
check(html.includes('id="test-audit"'), "브라우저 자동 진단 버튼 누락");
check(html.includes("styles.css?v=prototype-23") && html.includes("game.js?v=prototype-23") && html.includes('id="critical-flash"'), "치명타 화면 효과 또는 캐시 버전 prototype-23 누락");
check(["build-signature", "pending-archive", "reserve-parts", "factory-tools", "factory-recipe-list", "factory-tool-combo-list", "factory-synergy-list", "hud-ram-text", "hud-ram-fill", "choice-ram-capacity", "factory-ram-meta", "factory-tab-ram"].every((id) => html.includes(`id="${id}"`)), "빌드/RAM 성장/공정 도구 UI 항목 누락");
check(html.includes('id="ui-stage"') && html.includes('viewport-fit=cover'), "전체 UI 스테이지 또는 안전 영역 viewport 설정 누락");
check(source.includes("runFactoryToolAudits") && source.includes("augmentHardwarePreview") && source.includes("augmentChoicePreviewPart") && source.includes("NEW JACK LAYOUT") && source.includes("AUGMENT_MAX_RANK = 3") && source.includes("AUGMENT_EVOLUTION_RANK = 2") && source.includes("TOOL_COMBINATIONS") && source.includes("findToolCombination") && source.includes("RAM_PER_LEVEL = 2") && source.includes("ramCapacityAtLevel") && source.includes("setFactoryView") && source.includes("clearMovementInput") && source.includes('canvas.addEventListener("contextmenu"') && source.includes("seed % 6 === 0") && source.includes("minimum + offsetSeed %") && source.includes("previewPartPlacement") && source.includes("operationalCircuit") && source.includes("spawnToolDrop") && source.includes("rebuildPhysicalWires") && source.includes("findPhysicalPortMatch") && source.includes("lego-tool-three-way") && source.includes("lego-augment-random") && source.includes("COMBAT_TEMPO") && source.includes("MELEE_WEAPON_SCALE = 2") && source.includes("range: 104 * MELEE_WEAPON_SCALE") && source.includes("ctx.scale(MELEE_WEAPON_SCALE, MELEE_WEAPON_SCALE)") && source.includes("availableToolTypes") && source.includes("dragTargetIsValid") && source.includes("tool-palette") && source.includes("triggerImpactFeedback") && source.includes("flashCriticalFeedback") && source.includes("hitStop"), "우클릭 입력 정리·희소 단자·도구 진행·전투 템포·치명타·근접 무기 진단 누락");

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
check(styles.includes(".augment-card .placement-hint { position: static;") && styles.includes(".build-affinity { position: static;") && styles.includes(".augment-hardware") && styles.includes(".hardware-grid.size-4") && styles.includes(".hardware-jack.input") && styles.includes(".hardware-legend"), "증강 카드 설명·희귀도·크기·단자 미리보기 스타일 누락");
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
  querySelectorAll() { return []; },
  addEventListener() {}
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
  const inputResetAudit = vm.runInContext(`(() => {
    game.keys.add("KeyW");
    game.keys.add("KeyD");
    game.keys.add("KeyJ");
    clearMovementInput();
    const movementCleared = !game.keys.has("KeyW") && !game.keys.has("KeyD");
    const nonMovementPreserved = game.keys.has("KeyJ");
    game.attackRequested = true;
    game.dashRequested = true;
    clearAllCombatInput();
    return { movementCleared, nonMovementPreserved, allKeysCleared: game.keys.size === 0, requestsCleared: !game.attackRequested && !game.dashRequested };
  })()`, runtime, { timeout: 1000 });
  check(Object.values(inputResetAudit).every(Boolean), `우클릭·포커스 입력 정리 검증 실패: ${JSON.stringify(inputResetAudit)}`);
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
    const factoryOpened = game.mode === "factory" && !document.querySelector("#factory-overlay").hidden;

    board.fill(null);
    factory.wires = [];
    const offCenter = ensurePartPorts({ id: 7000, kind: "module", type: "m_spin", ports: { layout: "lego-augment-random", edges: ["left", "right"], offsets: { left: 0, right: 0 } } });
    board[indexOf(1, 0)] = offCenter;
    rebuildPhysicalWires();
    const offCenterBusBlocked = !evaluateClassFactory().operationalIds.has(offCenter.id) && !factory.wires.some((wire) => wire.fromId === BUS_SOURCE_ID);
    board.fill(null);
    rebuildPhysicalWires();

    factory.pending = createPart("module", "m_guard");
    const validStarts = board.map((_, index) => index).filter((index) => {
      const preview = previewPartPlacement(index, factory.pending);
      return preview.connected && preview.ram <= ramCapacity();
    });
    const first = validStarts[0];
    const leftOffset = portOffsets(factory.pending, "left")[0];
    const centerOnlyStart = validStarts.length === 1 && positionOf(first).col === 1 && positionOf(first).row + leftOffset === MAIN_ROW;
    const disconnectedTarget = board.map((_, index) => index).find((index) => isPlaceable(index) && canPlacePart(index, factory.pending) && !validStarts.includes(index));
    placePending(disconnectedTarget);
    const disconnectedPlacementBlocked = factory.pending?.type === "m_guard" && !board[disconnectedTarget];
    placePending(first);
    const placedRare = board[first]?.type === "m_guard" && partFootprint(board[first]).width === 2 && partFootprint(board[first]).height === 2;
    const moduleId = board[first].id;
    const autoLegoActive = evaluateClassFactory().traits.has("m_guard") && factory.wires.length === 1 &&
      factory.wires[0]?.fromId === BUS_SOURCE_ID && factory.wires[0]?.fromRow === MAIN_ROW && factory.wires[0]?.toEdge === "left";
    storeBoardModule(first);
    const storedForRedeploy = factory.reserve.some((part) => part.id === moduleId) && !board[first];
    activateReserve(moduleId);
    const pickupAndRedeploy = factory.pending?.id === moduleId;
    placePending(first);
    const redeployedActive = evaluateClassFactory().traits.has("m_guard") && factory.wires.length === 1;

    const toolLink = createPart("tool", "router");
    const neighbor = createPart("tool", "amplifier");
    board[indexOf(6, 0)] = toolLink;
    board[indexOf(7, 0)] = neighbor;
    rebuildPhysicalWires();
    const disconnectedPairPhysical = Boolean(findPhysicalPortMatch(toolLink.id, neighbor.id));
    const proximityOnly = disconnectedPairPhysical && !factory.wires.some((wire) => wire.fromId === toolLink.id || wire.toId === toolLink.id || wire.fromId === neighbor.id || wire.toId === neighbor.id);
    board[indexOf(6, 0)] = null;
    board[indexOf(7, 0)] = null;
    rebuildPhysicalWires();

    const colsBeforeExtend = boardCols;
    extendBoard();
    const boardExtends = boardCols === colsBeforeExtend + EXTEND_BY && board.length === boardCols * ROWS;
    const noDropNoTool = factory.toolInventory.amplifier === 0;
    selectToolBlueprint("amplifier");
    const unlimitedToolBlocked = factory.pending === null;
    collectToolDrop({ id: 71, type: "amplifier", x: game.player.x, y: game.player.y, radius: 12 });
    selectToolBlueprint("amplifier");
    const droppedToolSelected = factory.pending?.type === "amplifier";
    const toolTarget = board.map((_, index) => index).find((index) => {
      const preview = previewPartPlacement(index, factory.pending);
      return preview.connected && preview.ram <= ramCapacity();
    });
    placePending(toolTarget);
    const toolConsumed = factory.toolInventory.amplifier === 0 && board[toolTarget]?.type === "amplifier";
    storeBoardModule(toolTarget);
    const toolRecovered = factory.toolInventory.amplifier === 1;
    factory.dragged = { kind: "tool-palette", type: "amplifier" };
    const paletteTarget = board.map((_, index) => index).find((index) => dragTargetIsValid(index));
    const toolPaletteDrag = Number.isInteger(paletteTarget) && completeFactoryDrop(paletteTarget) && board[paletteTarget]?.type === "amplifier" && factory.toolInventory.amplifier === 0;
    storeBoardModule(paletteTarget);

    const raritySizes = ["common", "rare", "legendary"].every((rarity) => moduleTypes.some((type) => MODULE_RARITIES[type] === rarity)) &&
      JSON.stringify([RARITIES.common.width, RARITIES.rare.width, RARITIES.legendary.width]) === JSON.stringify([1, 2, 4]);
    const portLayouts = (() => {
      const tool = createPart("tool", "router");
      const samples = Array.from({ length: 120 }, (_, index) => ensurePartPorts({ id: 24000 + index, kind: "module", type: "m_mark" }));
      const branches = samples.filter((part) => part.ports.edges.length === 3).length;
      const legendaryType = moduleTypes.find((type) => MODULE_RARITIES[type] === "legendary");
      const largeSamples = Array.from({ length: 16 }, (_, index) => ensurePartPorts({ id: 25000 + index, kind: "module", type: legendaryType }));
      return tool.ports.layout === "lego-tool-three-way" && PORT_EDGES.every((edge) => portOffsets(tool, edge).length === 1) &&
        samples.every((part) => part.ports.layout === "lego-augment-random" && part.ports.edges.length >= 2 && part.ports.edges.length <= 3 && part.ports.edges.includes("left") && part.ports.edges.every((edge) => portOffsets(part, edge).length === 1)) &&
        branches >= 12 && branches <= 28 && largeSamples.every((part) => part.ports.edges.every((edge) => portOffsets(part, edge).length === 1)) &&
        new Set(largeSamples.map((part) => portOffsets(part, "left")[0])).size > 1 &&
        largeSamples.every((part) => { const offset = portOffsets(part, "left")[0]; const row = MAIN_ROW - offset; return row >= 0 && row + partFootprint(part).height <= ROWS; });
    })();
    commitFactory();
    const committed = game.mode === "playing" && document.querySelector("#factory-overlay").hidden && game.output.traits.has("m_guard");
    const capacities = [1, 2, 4, 8, 12].map((level) => { game.player.level = level; return ramCapacity(); });
    const capacityProgression = JSON.stringify(capacities) === JSON.stringify([10, 12, 16, 24, 32]);
    return { factoryOpened, offCenterBusBlocked, centerOnlyStart, disconnectedPlacementBlocked, placedRare, autoLegoActive, storedForRedeploy, pickupAndRedeploy, redeployedActive, proximityOnly, boardExtends, noDropNoTool, unlimitedToolBlocked, droppedToolSelected, toolConsumed, toolRecovered, toolPaletteDrag, raritySizes, portLayouts, committed, capacityProgression };
  })()`, runtime, { timeout: 1800 });
  check(Object.values(circuitAudit).every(Boolean), `드랍·단자 회로 흐름 검증 실패: ${JSON.stringify(circuitAudit)}`);
  const rankProgressionAudit = vm.runInContext(`(() => {
    game.selectedClass = "melee";
    resetGame();
    wireInstalledParts([{ id: 8100, kind: "module", type: "m_mark", rank: 1 }]);
    game.output = evaluateClassFactory();
    const startingRam = ramUsage(game.output);
    const upgrade = () => {
      game.mode = "choice";
      factory.choiceSelection = "m_mark";
      confirmAugmentChoice();
      return ownedRank("m_mark");
    };
    const rank2 = upgrade() === 2;
    const partnerSuggested = generateChoices().includes("m_step");
    const rank3 = upgrade() === 3;
    const limitRank = upgrade() === 3 && ownedLimit("m_mark") === 1;
    wireInstalledParts([
      { id: 8100, kind: "module", type: "m_mark", rank: 3, limit: 1 },
      { id: 8101, kind: "module", type: "m_step", rank: 2 }
    ]);
    const evolved = evaluateClassFactory();
    const rankDoesNotDuplicate = modulesOnBoard().filter((part) => part.type === "m_mark").length === 1;
    const fixedModuleRam = startingRam === MODULE_RAM.m_mark && ramUsage(evolved) === MODULE_RAM.m_mark + MODULE_RAM.m_step + PROTOCOL_RAM;
    const evolutionActive = evolved.synergyKinds.has("first_mark") && evolved.synergies[0]?.name === "붉은 추격선";
    const rankPipsVisible = (rankPips(2).match(/class="filled"/g) || []).length === 2;
    const rarityPreviewCoverage = ["m_mark", "m_guard", "m_step"].every((type, index) => {
      const preview = augmentChoicePreviewPart(type);
      const footprint = partFootprint(preview.part);
      const markup = augmentHardwarePreview(preview.part, "TEST LAYOUT");
      return footprint.width === [1, 2, 4][index] && markup.includes('data-rarity="' + ["common", "rare", "legendary"][index] + '"') &&
        markup.includes('data-footprint="' + footprint.width + '×' + footprint.height + '"') && markup.includes('data-input-count="1"') &&
        markup.includes('data-output-count="' + (preview.part.ports.edges.length - 1) + '"') && markup.includes("IN 좌 · OUT ");
    });
    const savedNextId = factory.nextId;
    const predicted = augmentChoicePreviewPart("m_riposte").part;
    const predictedLayout = JSON.stringify({ id: predicted.id, edges: predicted.ports.edges, offsets: predicted.ports.offsets });
    const created = createPart("module", "m_riposte");
    const previewMatchesCreatedPart = predictedLayout === JSON.stringify({ id: created.id, edges: created.ports.edges, offsets: created.ports.offsets });
    factory.nextId = savedNextId;
    const ownedPreview = augmentChoicePreviewPart("m_mark");
    const rankKeepsPhysicalLayout = ownedPreview.locked && ownedPreview.part.id === 8100 && augmentHardwarePreview(ownedPreview.part, "LAYOUT LOCKED").includes("LAYOUT LOCKED");
    return { rank2, partnerSuggested, rank3, limitRank, rankDoesNotDuplicate, fixedModuleRam, evolutionActive, rankPipsVisible, rarityPreviewCoverage, previewMatchesCreatedPart, rankKeepsPhysicalLayout };
  })()`, runtime, { timeout: 1800 });
  check(Object.values(rankProgressionAudit).every(Boolean), `증강 랭크·리미트·진화 선택 흐름 실패: ${JSON.stringify(rankProgressionAudit)}`);
  const fullAudit = vm.runInContext(`runAllAugmentAudits()`, runtime, { timeout: 5000 });
  check(fullAudit.pass && fullAudit.playstyles.length === 9 && fullAudit.playstyles.every((report) => report.pass) && fullAudit.factoryTools.pass, `전체 런타임 검증 실패: ${JSON.stringify(fullAudit)}`);
} catch (error) {
  failures.push(`초기 화면 런타임 오류: ${error.message}`);
}

for (const [classId, prefix] of Object.entries(classPrefixes)) {
  const classModules = modules.filter((module) => module.classId === classId);
  const classEvolutions = protocols.filter((protocol) => protocol.from.startsWith(prefix));
  const unorderedPairs = new Set(classEvolutions.map((protocol) => [protocol.from, protocol.to].sort().join("×")));
  check(classModules.length === 10, `${classId}: 증강 ${classModules.length}/10`);
  check(classEvolutions.length === 5, `${classId}: 완성형 진화 ${classEvolutions.length}/5`);
  check(classEvolutions.every((protocol) => protocol.to.startsWith(prefix)), `${classId}: 다른 클래스 진화 연결 존재`);
  check(classModules.every((module) => augmentEvents.has(module.id)), `${classId}: 런타임 증강 기록 누락`);
  check(classEvolutions.every((protocol) => protocolEvents.has(protocol.kind)), `${classId}: 런타임 진화 기록 누락`);
  check(classModules.every((module) => classEvolutions.filter((evolution) => evolution.from === module.id || evolution.to === module.id).length === 1), `${classId}: 진화 파트너가 정확히 1개가 아닌 증강 존재`);
  check(unorderedPairs.size === classEvolutions.length, `${classId}: 중복 진화 쌍 존재`);
}

if (failures.length) {
  console.error("AUGMENT AUDIT FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("GAME AUDIT PASS");
  console.log("30 augments × 3 ranks · 15 unordered evolutions · 6 tool X combinations · 9/9 builds · responsive circuit UX");
}
