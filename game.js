const $ = (selector) => document.querySelector(selector);
const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");
const TEST_MODE = new URLSearchParams(window.location.search).has("test");

const CLASS_PROFILES = {
  melee: {
    name: "근접 클래스", title: "절단 집행자", code: "BLADE", color: "#58d7d3", icon: "刃",
    attackName: "교대 횡베기", damage: 18, range: 104, arc: 118, cooldown: .5,
    description: "좌우 횡베기를 교대로 잇고, 표식·반격·돌진으로 적진 안에서 싸웁니다.",
    identity: "근접 압박 · 방향 콤보 · 반격", signature: "m_mark"
  },
  sniper: {
    name: "원거리 저격 클래스", title: "레일 관측자", code: "SNIPER", color: "#f6dc66", icon: "◎",
    attackName: "레일 저격", damage: 38, range: 760, arc: 0, cooldown: .82,
    description: "긴 사거리의 단발 레일탄으로 표식과 관통 경로를 설계하며 싸웁니다.",
    identity: "장거리 단발 · 표식 · 도탄", signature: "s_pierce"
  },
  artillery: {
    name: "광역 공격 클래스", title: "폭발 설계자", code: "BLAST", color: "#ff714f", icon: "✹",
    attackName: "중력 유탄", damage: 19, range: 540, arc: 0, cooldown: .88,
    description: "조준 지점에 유탄을 투사해 흡입·분열·지속 지대를 연쇄 설계합니다.",
    identity: "범위 제어 · 지연 폭발 · 연쇄 기폭", signature: "a_fire"
  }
};

const MODULES = {
  m_mark: { classId: "melee", name: "결투 표식기", code: "D", color: "#58d7d3", description: "한 방향 베기로 표식을 새기고 반대 방향 베기로 표식을 소비해 교차 절단합니다.", hint: "방향을 번갈아 맞히는 결투 콤보 생성" },
  m_spin: { classId: "melee", name: "회전 관절", code: "R", color: "#a48cff", description: "세 번째 공격이 전방 베기 대신 360도 회전 참격으로 변합니다.", hint: "포위 상황을 역전하는 마무리 공격" },
  m_hook: { classId: "melee", name: "자력 갈고리", code: "G", color: "#ef70c4", description: "베기에 닿은 적을 로봇 쪽으로 끌어당겨 다음 공격 범위에 묶어둡니다.", hint: "분산된 적을 근접 콤보 안으로 집결" },
  m_echo: { classId: "melee", name: "대시 잔상", code: "E", color: "#8b7fff", description: "대시 출발 지점에 잔상을 남기고 잠시 뒤 같은 방향을 다시 베게 합니다.", hint: "이동 자체가 지연 공격으로 전환" },
  m_guard: { classId: "melee", name: "반사 칼등", code: "P", color: "#e8f2f1", description: "횡베기 도중 닿은 적 탄환을 제거하고 사수 방향으로 되돌려 보냅니다.", hint: "공격 타이밍으로 원거리 패턴 대응" },
  m_execute: { classId: "melee", name: "처형 톱니", code: "X", color: "#f08080", description: "내구도가 한계에 도달한 적은 베기 적중 즉시 처형됩니다.", hint: "약해진 적을 확정 제거하는 마무리 규칙" },
  m_shock: { classId: "melee", name: "충격 파쇄기", code: "S", color: "#ffbd57", description: "세 번째 공격이 칼끝에서 전진하는 충격파를 방출합니다.", hint: "근접 콤보가 직선 군중 제어로 확장" },
  m_blood: { classId: "melee", name: "회수 펌프", code: "V", color: "#71efad", description: "결투 표식을 소비하거나 적을 처형하면 손상된 내구도를 회수합니다.", hint: "공격 성공 조건이 생존 자원으로 연결" },
  m_step: { classId: "melee", name: "점멸 보폭", code: "B", color: "#69a9ff", description: "조준 방향의 가까운 적에게 순간 접근한 뒤 횡베기를 시작합니다.", hint: "사거리 밖 적에게 진입하는 공격 이동" },
  m_riposte: { classId: "melee", name: "복수 회로", code: "C", color: "#ff9b4a", description: "피격 후 다음 베기가 강화 반격으로 변하며 짧은 무적을 얻습니다.", hint: "피격을 다음 공격의 반전 기회로 전환" },

  s_pierce: { classId: "sniper", name: "관통 레일", code: "P", color: "#f6dc66", description: "레일탄이 첫 표적에서 멈추지 않고 뒤의 적까지 꿰뚫습니다.", hint: "적을 한 줄로 정렬하는 관통 경로 플레이" },
  s_ricochet: { classId: "sniper", name: "도탄 렌즈", code: "R", color: "#69a9ff", description: "적중한 탄환이 주변의 아직 맞지 않은 적에게 꺾여 날아갑니다.", hint: "단발 사격이 위치 기반 연쇄 사격으로 변화" },
  s_mark: { classId: "sniper", name: "파열 표식탄", code: "M", color: "#ef70c4", description: "첫 탄환은 표식을 남기고 다음 탄환은 표식을 폭발시킵니다.", hint: "같은 표적을 두 번 노리는 집중 사격 루프" },
  s_homing: { classId: "sniper", name: "유도 보정기", code: "H", color: "#58d7d3", description: "레일탄이 조준선 근처의 적을 감지해 비행 경로를 미세하게 보정합니다.", hint: "빠른 적을 추적하는 탄도 제어" },
  s_mine: { classId: "sniper", name: "탄피 지뢰", code: "N", color: "#ff9b4a", description: "세 번째 사격마다 발사 위치에 적 접근 시 폭발하는 탄피 지뢰를 남깁니다.", hint: "후방 동선을 방어 구역으로 전환" },
  s_dashload: { classId: "sniper", name: "기동 장전", code: "L", color: "#d9ef59", description: "대시가 재장전을 끝내고 조준 방향으로 보조탄을 즉시 발사합니다.", hint: "회피와 공격 리듬을 하나의 행동으로 결합" },
  s_twin: { classId: "sniper", name: "쌍열 약실", code: "T", color: "#e8f2f1", description: "두 번째 사격마다 좌우로 갈라지는 한 쌍의 레일탄을 발사합니다.", hint: "단일 조준을 평행 사선으로 변환" },
  s_freeze: { classId: "sniper", name: "빙결 탄두", code: "F", color: "#57d8ee", description: "적중 지점에 적의 이동을 늦추는 냉각 지대를 생성합니다.", hint: "다음 사격을 위한 위치 고정 장치" },
  s_ghost: { classId: "sniper", name: "유령 조준대", code: "G", color: "#a48cff", description: "잠시 움직이지 않으면 다음 탄환이 거대한 관통 광선으로 충전됩니다.", hint: "정지 위험을 강력한 저격 기회로 교환" },
  s_drone: { classId: "sniper", name: "관측 드론", code: "O", color: "#71efad", description: "적을 처치하면 관측 드론이 다음 표적을 찾아 보조 사격합니다.", hint: "처치가 자동 후속 사격으로 이어지는 추적 루프" },

  a_sticky: { classId: "artillery", name: "점착 신관", code: "S", color: "#ffbd57", description: "유탄이 적에게 붙은 뒤 짧은 지연을 두고 그 적을 중심으로 폭발합니다.", hint: "이동하는 적을 폭발 중심으로 활용" },
  a_fire: { classId: "artillery", name: "소이 배양기", code: "F", color: "#ff714f", description: "폭발 지점에 일정 시간 적을 태우는 소이 지대를 남깁니다.", hint: "순간 폭발을 지속 영역 장악으로 전환" },
  a_chain: { classId: "artillery", name: "연쇄 기폭기", code: "C", color: "#f08080", description: "폭발로 처치된 적이 다시 작은 폭발을 일으켜 주변 적을 연쇄 기폭합니다.", hint: "적 무리 자체를 폭발 연결점으로 사용" },
  a_vacuum: { classId: "artillery", name: "진공 코어", code: "V", color: "#ef70c4", description: "폭발 직전 주변 적을 중심으로 끌어모아 범위 안에 가둡니다.", hint: "분산된 적을 한 번의 폭발로 압축" },
  a_shrapnel: { classId: "artillery", name: "파편 성형기", code: "P", color: "#e8f2f1", description: "폭발이 사방으로 적을 관통하는 파편탄을 방출합니다.", hint: "원형 폭발 뒤에 방사형 후속 공격 생성" },
  a_recursive: { classId: "artillery", name: "재귀 폭발식", code: "R", color: "#a48cff", description: "주 폭발이 사라진 자리에 잠시 뒤 두 번째 잔향 폭발이 발생합니다.", hint: "같은 공간을 시간차로 두 번 봉쇄" },
  a_dashbomb: { classId: "artillery", name: "긴급 투하기", code: "D", color: "#69a9ff", description: "대시 출발 지점에 즉시 작동하는 근접 방어 폭탄을 떨어뜨립니다.", hint: "회피 경로를 폭발 함정으로 전환" },
  a_super: { classId: "artillery", name: "과충전 구체", code: "O", color: "#f6dc66", description: "세 번째 유탄이 적 탄환까지 지우는 거대한 초신성 폭발로 변합니다.", hint: "공격 주기에 화면 정리용 대형 폭발 추가" },
  a_cluster: { classId: "artillery", name: "분열 탄두", code: "K", color: "#d9ef59", description: "주 유탄이 폭발한 뒤 세 방향으로 소형 유탄을 다시 분산시킵니다.", hint: "한 번의 조준을 여러 폭발 지점으로 확장" },
  a_orbit: { classId: "artillery", name: "궤도 폭격 드론", code: "B", color: "#71efad", description: "폭발할 때마다 잔여 에너지가 궤도탄으로 남아 다음 적을 자동 추적합니다.", hint: "폭발이 다음 폭발을 준비하는 순환 구조" }
};

const SYNERGY_DEFINITIONS = {
  melee: [
    { types: ["m_mark", "m_step"], kind: "duelist", name: "공간 절단", description: "점멸이 표식 대상을 우선 추적하고 표식 소비 시 교차 잔상이 한 번 더 벱니다." },
    { types: ["m_spin", "m_hook"], kind: "vortex", name: "자력 회오리", description: "회전 참격이 주변 적을 중심으로 끌어모은 뒤 두 번째 회전을 일으킵니다." },
    { types: ["m_echo", "m_shock"], kind: "aftershock", name: "잔상 파쇄", description: "대시 잔상도 충격파를 방출해 이동 경로 전체를 공격합니다." },
    { types: ["m_guard", "m_riposte"], kind: "perfect_counter", name: "완전 반격", description: "탄환 반사 성공 시 복수 회로가 즉시 충전되고 반사탄이 사수를 추적합니다." },
    { types: ["m_execute", "m_blood"], kind: "harvester", name: "회수 집행", description: "처형 시 내구도를 회수하고 대시를 즉시 다시 사용할 수 있습니다." }
  ],
  sniper: [
    { types: ["s_pierce", "s_ricochet"], kind: "prism_rail", name: "프리즘 레일", description: "관통을 마친 탄환이 마지막 표적에서 다시 도탄합니다." },
    { types: ["s_mark", "s_ghost"], kind: "dead_center", name: "데드 센터", description: "충전 광선이 경로상의 모든 표식을 동시에 폭발시킵니다." },
    { types: ["s_mine", "s_dashload"], kind: "escape_route", name: "탈출 사선", description: "대시 출발점에도 탄피 지뢰를 남기고 보조탄이 지뢰 표적을 우선합니다." },
    { types: ["s_twin", "s_homing"], kind: "hound_pair", name: "하운드 페어", description: "쌍열 탄환이 서로 다른 표적을 나누어 추적합니다." },
    { types: ["s_freeze", "s_drone"], kind: "cold_observer", name: "빙결 관측망", description: "관측 드론이 냉각 지대의 적을 우선 사격하고 적중 지대를 연장합니다." }
  ],
  artillery: [
    { types: ["a_fire", "a_vacuum"], kind: "inferno_vortex", name: "화염 소용돌이", description: "소이 지대가 지속적으로 적을 중심으로 끌어당깁니다." },
    { types: ["a_recursive", "a_cluster"], kind: "cascade", name: "폭발 캐스케이드", description: "분열 유탄도 한 번씩 잔향 폭발을 남깁니다." },
    { types: ["a_dashbomb", "a_shrapnel"], kind: "breach_field", name: "돌파 지뢰밭", description: "대시 폭탄이 폭발하며 이동 방향으로 집중 파편을 발사합니다." },
    { types: ["a_sticky", "a_chain"], kind: "living_fuse", name: "생체 신관", description: "점착된 적이 죽으면 즉시 기폭되고 연쇄 폭발 범위가 이어집니다." },
    { types: ["a_super", "a_orbit"], kind: "planetary", name: "행성 폭격", description: "초신성이 세 개의 궤도탄을 생성해 남은 적을 차례로 추적합니다." }
  ]
};

const ROWS = 5;
const INITIAL_COLS = 9;
const EXTEND_BY = 4;
let boardCols = INITIAL_COLS;
const MAIN_ROW = 2;
const ECHO_ROW = 1;
const GUARD_ROW = 3;
const LANE_NAMES = ["상단 지원", "연계 공정", "주 공격", "반응 공정", "하단 지원"];
const LANE_CODES = ["AUX", "LINK", "CORE", "REACT", "AUX"];
const moduleTypes = Object.keys(MODULES);
const board = Array(boardCols * ROWS).fill(null);
const indexOf = (col, row) => col * ROWS + row;
const positionOf = (index) => ({ col: Math.floor(index / ROWS), row: index % ROWS });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const isPlaceable = (index) => {
  const position = positionOf(index);
  return position.col > 0 && position.col < boardCols && position.row >= 0 && position.row < ROWS;
};

function showSystemToast(label, message, tone, duration) {
  const toast = $("#system-toast");
  clearTimeout(toastTimer);
  $("#toast-label").textContent = label;
  $("#toast-message").textContent = message;
  toast.className = "system-toast " + (tone || "") + " show";
  toastTimer = setTimeout(() => toast.classList.remove("show"), duration || 2200);
}

function flashDamageFeedback() {
  const flash = $("#damage-flash");
  flash.classList.remove("hit");
  void flash.offsetWidth;
  flash.classList.add("hit");
}

function selectClass(classId) {
  if (!CLASS_PROFILES[classId] || game.mode !== "start") return;
  game.selectedClass = classId;
  const profile = CLASS_PROFILES[classId];
  for (const card of document.querySelectorAll("[data-class]")) {
    const selected = card.dataset.class === classId;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  }
  $("#start-button").disabled = false;
  $("#start-button").childNodes[0].textContent = profile.name + " 가동 ";
  $("#selected-class-copy").textContent = profile.name + " · " + profile.identity;
  $("#game").dataset.combatClass = classId;
  $("#game").style.setProperty("--class-color", profile.color);
  $("#attack-name").textContent = profile.attackName;
  $("#attack-control-name").textContent = profile.attackName;
  $("#readout-label").textContent = profile.code + " OUTPUT";
  $("#frame-code").textContent = profile.code + " / FRAME";
  game.output = evaluateClassFactory();
  renderTestModuleButtons();
}

function renderTestModuleButtons() {
  if (!TEST_MODE) return;
  const types = game.selectedClass ? classModuleTypes(game.selectedClass) : [];
  $("#test-module-buttons").innerHTML = types.map((type) =>
    '<button type="button" data-test-module="' + type + '" title="' + MODULES[type].name + '">' + MODULES[type].code + '</button>'
  ).join("");
}

const factory = {
  pending: null, selectedIndex: null, dragged: null, manual: false,
  choiceSelection: null, lastPlacedId: null, placementNotice: null, nextId: 1
};
const game = {
  mode: "start", selectedClass: null, width: innerWidth, height: innerHeight, time: 0, room: 1,
  kills: 0, xp: 0, xpNext: 28, levelUpQueued: false, roomCleared: false,
  doorOpen: false, doorPulse: 0, roomBanner: 0, player: null, enemies: [],
  enemyBullets: [], playerShots: [], zones: [], delayedAttacks: [], orbitals: [],
  particles: [], floaters: [], echoes: [], keys: new Set(),
  mouse: { x: innerWidth * .7, y: innerHeight * .5 }, dashRequested: false,
  attackRequested: false, output: null, nextEnemyId: 1, shake: 0,
  pulses: [], hitConfirm: 0, missPulse: 0
};
let toastTimer = 0;

function neighbors(index) {
  const position = positionOf(index);
  return [
    position.col > 0 ? indexOf(position.col - 1, position.row) : -1,
    position.col < boardCols - 1 ? indexOf(position.col + 1, position.row) : -1,
    position.row > 0 ? indexOf(position.col, position.row - 1) : -1,
    position.row < ROWS - 1 ? indexOf(position.col, position.row + 1) : -1
  ].filter((item) => item >= 0);
}

function ensureBoardSpace(usedCol) {
  if (usedCol < boardCols - 2) return false;
  const previousLength = board.length;
  boardCols += EXTEND_BY;
  board.length = boardCols * ROWS;
  board.fill(null, previousLength);
  return true;
}

function modulesOnBoard() {
  return board.flatMap((module, index) => module ? [{ ...module, index, ...positionOf(index) }] : []);
}

function createAttackProfile(name, damage, range, arc) {
  return {
    name, damage, range, arc, cooldown: .5, knockback: 24, stun: .08,
    burn: 0, bleed: 0, chain: 0, crit: .05, critMultiplier: 1.75,
    explosion: 0, phase: false, repeats: 1, modules: new Set()
  };
}

function createGuardProfile() {
  return {
    maxHpBonus: 0, armor: 0, roomHeal: 0, dashCooldown: 1.2,
    dashDamage: 0, deflect: 0, thorns: 0, counterShock: 0, modules: new Set()
  };
}

function classModuleTypes(classId) {
  return moduleTypes.filter((type) => MODULES[type].classId === classId);
}

function findClassSynergy(typeA, typeB, classId) {
  const pairKey = [typeA, typeB].sort().join("+");
  return (SYNERGY_DEFINITIONS[classId] || []).find((item) => item.types.slice().sort().join("+") === pairKey) || null;
}

function evaluateClassFactory() {
  const classId = game.selectedClass || "melee";
  const classProfile = CLASS_PROFILES[classId];
  const modules = modulesOnBoard().filter((module) => MODULES[module.type]?.classId === classId);
  const activeIds = new Set(modules.map((module) => module.id));
  const activeTypes = new Set(modules.map((module) => module.type));
  const statuses = new Map(modules.map((module) => [module.id, "active"]));
  const primary = createAttackProfile(classProfile.attackName, classProfile.damage, classProfile.range, classProfile.arc);
  primary.cooldown = classProfile.cooldown;
  primary.classId = classId;
  primary.modules = new Set(activeIds);
  primary.blastRadius = classId === "artillery" ? 86 : 0;
  const echo = createAttackProfile("조합 프로토콜", Math.round(classProfile.damage * .55), classProfile.range, classProfile.arc);
  echo.cooldown = 0;
  echo.modules = new Set(activeIds);
  const guard = createGuardProfile();
  guard.modules = new Set(modules.filter((module) => module.row === GUARD_ROW).map((module) => module.id));
  const synergies = [];
  const synergyKinds = new Set();
  const synergyModuleIds = new Set();
  for (const module of modules) {
    for (const nearIndex of neighbors(module.index)) {
      const near = board[nearIndex];
      if (!near || module.id >= near.id || MODULES[near.type]?.classId !== classId) continue;
      const synergy = findClassSynergy(module.type, near.type, classId);
      if (!synergy || synergyKinds.has(synergy.kind)) continue;
      synergyKinds.add(synergy.kind);
      synergyModuleIds.add(module.id);
      synergyModuleIds.add(near.id);
      synergies.push({ kind: synergy.kind, name: synergy.name, description: synergy.description });
    }
  }
  return {
    primary, echo, guard, classId, classProfile, traits: activeTypes, synergyKinds, synergyModuleIds,
    statuses, synergies,
    activeCount: activeIds.size, inactiveCount: 0
  };
}

function moduleToken(module, status) {
  const def = MODULES[module.type];
  const isNew = module.id === factory.lastPlacedId ? " is-new" : "";
  return '<div class="module-token module-' + module.type + ' ' + status + isNew + '" draggable="true" data-module-id="' +
    module.id + '" data-label="' + def.name + '" style="--module-color:' + def.color + '">' + def.code + '</div>';
}

function renderPendingPart() {
  const target = $("#pending-part");
  if (!factory.pending) {
    target.innerHTML = '<div class="pending-empty">신규 부품 없음<br />기존 모듈을 재배치할 수 있습니다.</div>';
    return;
  }
  const def = MODULES[factory.pending.type];
  target.innerHTML = '<div class="pending-module module-' + factory.pending.type +
    '" draggable="true" data-pending-module="true" style="--module-color:' + def.color +
    '"><div class="module-large-icon">' + def.code + '</div><b>' + def.name +
    '</b><span>' + def.description + '</span><span>' + def.hint + '</span></div>';
}

function attackDescription(profile) {
  if (profile.classId === "sniper") {
    return "DMG " + Math.round(profile.damage) + " · RANGE " + Math.round(profile.range) + " · SINGLE RAIL · " + (1 / profile.cooldown).toFixed(1) + "/s";
  }
  if (profile.classId === "artillery") {
    return "DMG " + Math.round(profile.damage) + " · TARGET " + Math.round(profile.range) + " · BLAST " + Math.round(profile.blastRadius) + " · " + (1 / profile.cooldown).toFixed(1) + "/s";
  }
  const extras = [];
  if (profile.burn) extras.push("연소 " + Math.round(profile.burn));
  if (profile.bleed) extras.push("출혈 " + Math.round(profile.bleed));
  if (profile.chain) extras.push("전격 " + profile.chain);
  if (profile.explosion) extras.push("폭발 " + profile.explosion);
  if (profile.repeats > 1) extras.push("ECHO ×" + profile.repeats);
  return "DMG " + Math.round(profile.damage) + " · RANGE " + Math.round(profile.range) +
    " · ARC " + Math.round(profile.arc) + "°" + (extras.length ? " · " + extras.join(" · ") : "");
}

function renderFactoryDelta(output) {
  const previous = game.output || output;
  const addedTraits = [...output.traits].filter((type) => !previous.traits?.has(type));
  const addedSynergies = output.synergies.filter((item) => !previous.synergyKinds?.has(item.kind));
  const chips = [
    ...addedTraits.map((type) => '<span class="delta-chip positive">행동 해금 · ' + MODULES[type].name + '</span>'),
    ...addedSynergies.map((item) => '<span class="delta-chip synergy">조합 완성 · ' + item.name + '</span>')
  ].filter(Boolean);
  return '<div class="factory-delta-panel"><span>APPLY DELTA / 현재 전투 출력 대비</span>' +
    (chips.length ? chips.join("") : '<span class="delta-chip neutral">배치 변경 · 활성 행동 유지</span>') + '</div>';
}

function outputChangeSummary(previous, next) {
  if (!previous) return "새 생산 라인이 적용되었습니다.";
  const mechanics = [...next.traits].filter((type) => !previous.traits?.has(type)).map((type) => MODULES[type].name);
  const combos = next.synergies.filter((item) => !previous.synergyKinds?.has(item.kind)).map((item) => item.name);
  if (combos.length) return "조합 완성 · " + combos.join(" + ");
  if (mechanics.length) return "새 행동 해금 · " + mechanics.join(" + ");
  return "행동 조합 배치가 변경되었습니다.";
}

function renderFactoryBoard() {
  const output = evaluateClassFactory();
  const boardElement = $("#factory-board");
  const labelsElement = $(".board-column-labels");
  boardElement.style.setProperty("--board-cols", boardCols);
  labelsElement.style.setProperty("--board-cols", boardCols);
  boardElement.innerHTML = Array.from({ length: ROWS * boardCols }, (_, order) => {
    const position = { col: order % boardCols, row: Math.floor(order / boardCols) };
    const index = indexOf(position.col, position.row);
    const fixed = position.col === 0;
    const laneClass = position.row === MAIN_ROW ? "main-lane" :
      position.row === ECHO_ROW || position.row === GUARD_ROW ? "branch-lane" : "service-lane";
    const powered = Boolean(board[index] && output.synergyModuleIds.has(board[index].id));
    const selected = factory.selectedIndex === index;
    const validTarget = Boolean(factory.pending) && !fixed && !board[index];
    const invalidTarget = false;
    const fixedText = position.col === 0 ? LANE_CODES[position.row] : "";
    const status = board[index] ? output.statuses.get(board[index].id) : "";
    return '<div class="factory-cell ' + laneClass + (powered ? " powered" : "") +
      (fixed ? " fixed" : "") + (selected ? " selected" : "") + (validTarget ? " valid-target" : "") +
      (invalidTarget ? " invalid-target" : "") + '" data-cell-index="' + index + '" aria-label="' +
      LANE_NAMES[position.row] + ' ' + (position.col + 1) + '열">' +
      (fixedText ? '<span class="fixed-node">' + fixedText + '<small>' + LANE_NAMES[position.row] + '</small></span>' : "") +
      (board[index] ? moduleToken(board[index], status) : "") + '</div>';
  }).join("");
  renderPendingPart();
  const mechanicNames = [...output.traits].map((type) => MODULES[type].name);
  $("#factory-summary").innerHTML =
    '<article class="lane-summary" style="--lane-color:' + output.classProfile.color + '"><header><b>' + output.classProfile.attackName + '</b><span>' +
    output.primary.modules.size + ' MODULE</span></header><p>' + attackDescription(output.primary) + '</p></article>' +
    '<article class="lane-summary" style="--lane-color:#a48cff"><header><b>활성 행동 변형</b><span>' + mechanicNames.length + ' / 10</span></header><p>' +
      (mechanicNames.length ? mechanicNames.join(" · ") : "아직 해금된 전용 행동이 없습니다.") + '</p></article>' +
    '<article class="lane-summary" style="--lane-color:#ffbd57"><header><b>클래스 정체성</b><span>' + output.classProfile.code +
      '</span></header><p>' + output.classProfile.identity + '</p></article>' +
    renderFactoryDelta(output);
  $("#factory-synergy-list").innerHTML = output.synergies.length
    ? output.synergies.map((item) => '<div class="synergy-chip"><b>' + item.name + '</b>' + item.description + '</div>').join("")
    : '<span class="no-synergy">인접 조합 없음</span>';
  const commit = $("#factory-commit");
  commit.disabled = Boolean(factory.pending);
  commit.textContent = factory.pending ? "신규 부품을 먼저 배치하세요" : "라인 적용 · 전투 복귀";
  $("#factory-warning").textContent = factory.pending ? "신규 부품을 배치해야 전투로 돌아갈 수 있습니다." : "모든 배치가 정상 가동됩니다.";
  $("#board-message").textContent = factory.pending ? MODULES[factory.pending.type].name + " 배치 위치를 선택하세요. 밝게 점멸하는 셀에 놓을 수 있습니다." :
    factory.selectedIndex !== null ? "이동할 셀을 선택하세요. 같은 셀을 다시 누르면 선택이 해제됩니다." :
      factory.placementNotice || "종점 없이 오른쪽으로 계속 확장되는 무한 조립 레일입니다.";
  $("#board-message").className = "board-message " + (factory.pending ? "warning" : "ok");
}

function renderMiniBoard() {
  const output = evaluateClassFactory();
  const miniBoard = $("#mini-board");
  miniBoard.style.gridTemplateColumns = "repeat(" + boardCols + ", 1fr)";
  miniBoard.innerHTML = Array.from({ length: ROWS * boardCols }, (_, order) => {
    const col = order % boardCols;
    const row = Math.floor(order / boardCols);
    const module = board[indexOf(col, row)];
    const active = module && output.statuses.get(module.id) !== "inactive";
    return '<i class="' + (module ? "filled " + (active ? "active" : "inactive") : "") +
      '" style="' + (module ? "--dot:" + MODULES[module.type].color : "") + '"></i>';
  }).join("");
}

function placePending(index) {
  if (!factory.pending || !isPlaceable(index)) return;
  const position = positionOf(index);
  if (board[index]) {
    $("#board-message").textContent = "해당 셀에 부품이 있습니다. 먼저 기존 부품을 옮기세요.";
    $("#board-message").className = "board-message warning";
    return;
  }
  const placed = factory.pending;
  const def = MODULES[placed.type];
  board[index] = placed;
  factory.pending = null;
  factory.selectedIndex = null;
  factory.lastPlacedId = placed.id;
  factory.placementNotice = def.name + " · " + LANE_NAMES[position.row] + " 연결 완료. 오른쪽에서 변화량을 확인하세요.";
  ensureBoardSpace(position.col);
  renderFactoryBoard();
}

function moveBoardModule(from, to) {
  if (!isPlaceable(from) || !isPlaceable(to) || from === to) {
    factory.selectedIndex = null;
    renderFactoryBoard();
    return;
  }
  const moving = board[from];
  [board[from], board[to]] = [board[to], board[from]];
  factory.selectedIndex = null;
  factory.lastPlacedId = moving ? moving.id : null;
  factory.placementNotice = moving ? MODULES[moving.type].name + " · " + LANE_NAMES[positionOf(to).row] + "로 이동했습니다." : null;
  ensureBoardSpace(positionOf(to).col);
  renderFactoryBoard();
}

function openFactory(manual) {
  if (manual && !["playing", "paused", "factory"].includes(game.mode)) return;
  factory.manual = Boolean(manual);
  factory.selectedIndex = null;
  factory.lastPlacedId = null;
  factory.placementNotice = null;
  game.mode = "factory";
  $("#pause-overlay").hidden = true;
  $("#factory-overlay").hidden = false;
  $(".factory-header > div > span").textContent = CLASS_PROFILES[game.selectedClass].code + " AUGMENT ASSEMBLY";
  $(".factory-header h2").textContent = CLASS_PROFILES[game.selectedClass].name + " 증강 라인";
  renderFactoryBoard();
}

function syncPlayerDerivedStats(previousMax) {
  if (!game.player) return;
  const oldMax = previousMax || game.player.maxHp || 100;
  const nextMax = Math.round(100 + game.output.guard.maxHpBonus);
  const gained = Math.max(0, nextMax - oldMax);
  game.player.maxHp = nextMax;
  game.player.hp = clamp(game.player.hp + gained, 0, nextMax);
}

function commitFactory() {
  if (factory.pending) return;
  const previousMax = game.player ? game.player.maxHp : 100;
  const previousOutput = game.output;
  const nextOutput = evaluateClassFactory();
  game.output = nextOutput;
  syncPlayerDerivedStats(previousMax);
  factory.selectedIndex = null;
  factory.lastPlacedId = null;
  factory.placementNotice = null;
  $("#factory-overlay").hidden = true;
  game.mode = "playing";
  renderMiniBoard();
  updateOutputReadout();
  updateHud();
  showSystemToast("LINE UPDATED", outputChangeSummary(previousOutput, nextOutput), "success", 2600);
}

function ownedCount(type) {
  return board.filter((module) => module && module.type === type).length +
    (factory.pending && factory.pending.type === type ? 1 : 0);
}

function generateChoices() {
  const classTypes = classModuleTypes(game.selectedClass);
  const owned = new Set(modulesOnBoard().map((module) => module.type));
  const unowned = classTypes.filter((type) => !owned.has(type)).sort(() => Math.random() - .5);
  const pool = [...unowned, ...classTypes.filter((type) => owned.has(type)).sort(() => Math.random() - .5)];
  const choices = pool.slice(0, 3);
  const signature = CLASS_PROFILES[game.selectedClass].signature;
  if (game.player.level === 2 && !owned.has(signature) && !choices.includes(signature)) choices[2] = signature;
  return [...new Set(choices)].slice(0, 3);
}

function showLevelChoices() {
  const choices = generateChoices();
  const classProfile = CLASS_PROFILES[game.selectedClass];
  factory.choiceSelection = null;
  $(".choice-shell > header span").textContent = classProfile.code + " / CLASS AUGMENT DELIVERY";
  $(".choice-shell h2").textContent = classProfile.name + " 전용 증강 선택";
  $(".choice-shell header p").textContent = "10개 전용 증강은 수치 누적 대신 새로운 행동을 해금합니다. 인접 배치로 조합 시너지를 완성하세요.";
  $("#choice-cards").innerHTML = choices.map((type, index) => {
    const def = MODULES[type];
    return '<button class="augment-card" type="button" data-choice="' + type +
      '" data-choice-index="' + index + '" aria-pressed="false" style="--module-color:' + def.color +
      '"><span class="card-shortcut">' + (index + 1) + '</span><div class="card-top"><span>MODULE / ' +
      def.code + '</span><span>보유 ' + ownedCount(type) + '</span></div><div class="card-icon">' +
      def.code + '</div><h3>' + def.name + '</h3><p>' + def.description +
      '</p><div class="placement-hint">' + def.hint + '</div></button>';
  }).join("");
  $("#choice-status").innerHTML = '증강 카드를 선택하세요. <kbd>1–3</kbd> 선택 · <kbd>ENTER</kbd> 확정';
  $("#choice-confirm").innerHTML = '선택 확정 <kbd>ENTER</kbd>';
  $("#choice-confirm").disabled = true;
  $("#choice-overlay").hidden = false;
}

function previewAugmentChoice(type) {
  if (game.mode !== "choice" || !MODULES[type]) return;
  factory.choiceSelection = type;
  for (const card of $("#choice-cards").querySelectorAll("[data-choice]")) {
    const selected = card.dataset.choice === type;
    card.classList.toggle("selected", selected);
    card.setAttribute("aria-pressed", String(selected));
  }
  const def = MODULES[type];
  $("#choice-status").innerHTML = def.name + ' 선택됨 · 확정 전 변경 가능 · <kbd>ENTER</kbd> 확정';
  $("#choice-confirm").innerHTML = def.name + ' 선택 확정 <kbd>ENTER</kbd>';
  $("#choice-confirm").disabled = false;
}

function confirmAugmentChoice() {
  const type = factory.choiceSelection;
  if (game.mode !== "choice" || !MODULES[type]) return;
  factory.pending = { id: factory.nextId++, type };
  factory.choiceSelection = null;
  $("#choice-overlay").hidden = true;
  openFactory(false);
}

function resizeCanvas() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  game.width = rect.width;
  game.height = rect.height;
  if (game.player) {
    game.player.x = clamp(game.player.x, 75, game.width - 75);
    game.player.y = clamp(game.player.y, 120, game.height - 85);
  }
}

function roomBounds() {
  return { left: 70, right: game.width - 70, top: 112, bottom: game.height - 82 };
}

function resetGame() {
  boardCols = INITIAL_COLS;
  board.length = boardCols * ROWS;
  board.fill(null);
  factory.pending = null;
  factory.selectedIndex = null;
  factory.dragged = null;
  factory.choiceSelection = null;
  factory.lastPlacedId = null;
  factory.placementNotice = null;
  factory.nextId = 1;
  game.time = 0;
  game.room = 1;
  game.kills = 0;
  game.xp = 0;
  game.xpNext = 28;
  game.levelUpQueued = false;
  game.roomCleared = false;
  game.doorOpen = false;
  game.attackRequested = false;
  game.dashRequested = false;
  game.keys.clear();
  canvas.dataset.swingCount = "0";
  canvas.dataset.swingDirection = "ready-left-to-right";
  canvas.dataset.lastSpecial = "none";
  game.player = {
    x: game.width * .5, y: game.height - 145, radius: 17,
    hp: 100, maxHp: 100, level: 1, speed: 225,
    aim: -Math.PI / 2, attackCooldown: 0, dashCooldown: 0, dashTime: 0,
    invulnerable: 0, combo: 0, slash: null, nextSwingDirection: 1, swingCount: 0,
    attackBuffer: 0, shotCount: 0, stillTime: 0, attackFlash: 0, riposteReady: false,
    lastMoveX: 0, lastMoveY: -1
  };
  game.enemies = [];
  game.enemyBullets = [];
  game.playerShots = [];
  game.zones = [];
  game.delayedAttacks = [];
  game.orbitals = [];
  game.particles = [];
  game.floaters = [];
  game.echoes = [];
  game.pulses = [];
  game.hitConfirm = 0;
  game.missPulse = 0;
  game.nextEnemyId = 1;
  game.shake = 0;
  $("#game").classList.remove("low-health");
  $("#damage-flash").classList.remove("hit");
  $("#system-toast").classList.remove("show");
  game.output = evaluateClassFactory();
  enterRoom(1);
  renderMiniBoard();
  updateOutputReadout();
  updateHud();
}

function startGame() {
  if (!game.selectedClass) {
    $("#selected-class-copy").textContent = "근접·원거리 저격·광역 공격 중 하나를 먼저 선택하세요.";
    return;
  }
  resetGame();
  $("#start-overlay").hidden = true;
  $("#gameover-overlay").hidden = true;
  $("#pause-overlay").hidden = true;
  game.mode = "playing";
  showSystemToast("ROOM OBJECTIVE", "적을 모두 폐기하고 북쪽 출구를 개방하세요.", "", 3200);
}

function roomType(room) {
  if (room % 5 === 0) return "엘리트";
  if (room % 3 === 0) return "기계실";
  return "전투실";
}

function enterRoom(room) {
  game.room = room;
  game.roomCleared = false;
  game.doorOpen = false;
  game.doorPulse = 0;
  game.roomBanner = 1.6;
  game.enemyBullets = [];
  game.playerShots = [];
  game.zones = [];
  game.delayedAttacks = [];
  game.orbitals = [];
  game.echoes = [];
  const bounds = roomBounds();
  game.player.x = game.width * .5;
  game.player.y = bounds.bottom - 45;
  const count = Math.min(8, 3 + Math.ceil(room * .72));
  for (let index = 0; index < count; index += 1) {
    let type = "drone";
    if (room >= 2 && index % 3 === 1) type = "turret";
    if (room >= 3 && index % 4 === 3) type = "brute";
    if (room % 5 === 0 && index === count - 1) type = "guardian";
    const angle = (index / count) * Math.PI * 2 + .35;
    const radius = Math.min(game.width, game.height) * (.23 + (index % 2) * .07);
    spawnEnemy(type, game.width * .5 + Math.cos(angle) * radius, game.height * .48 + Math.sin(angle) * radius * .55);
  }
  $("#door-prompt").hidden = true;
}

function spawnEnemy(type, x, y) {
  const scale = 1 + (game.room - 1) * .11;
  const data = {
    drone: { hp: 32, speed: 88, radius: 14, damage: 12, xp: 8, color: "#e95757" },
    turret: { hp: 42, speed: 45, radius: 16, damage: 10, xp: 10, color: "#e7a050" },
    brute: { hp: 82, speed: 54, radius: 22, damage: 19, xp: 15, color: "#bb596d" },
    guardian: { hp: 210, speed: 58, radius: 29, damage: 24, xp: 34, color: "#ff873f" }
  }[type];
  const bounds = roomBounds();
  game.enemies.push({
    id: game.nextEnemyId++, type,
    x: clamp(x, bounds.left + 35, bounds.right - 35),
    y: clamp(y, bounds.top + 45, bounds.bottom - 55),
    radius: data.radius, hp: data.hp * scale, maxHp: data.hp * scale,
    speed: data.speed + game.room * 1.4, damage: data.damage, xp: data.xp,
    color: data.color, attackCooldown: .5 + Math.random() * .5,
    shootCooldown: 1 + Math.random(), chargeCooldown: 1.8,
    shootWindup: 0, chargeWindup: 0, chargeTime: 0, chargeAngle: 0,
    burnTime: 0, burnDps: 0, bleedTime: 0, bleedDps: 0,
    stun: 0, flash: 0, dead: false
  });
}

function addParticles(x, y, color, count, speed) {
  const amount = count || 8;
  const velocity = speed || 120;
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const force = velocity * (.3 + Math.random() * .7);
    game.particles.push({
      x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force,
      life: .22 + Math.random() * .35, maxLife: .57,
      size: 1.5 + Math.random() * 3.5, color
    });
  }
}

function addPulse(x, y, color, radius, duration) {
  game.pulses.push({
    x, y, color, radius: radius || 46,
    life: duration || .28, maxLife: duration || .28
  });
}

function addFloater(x, y, text, color) {
  game.floaters.push({ x, y, text, color: color || "#c9f05a", life: .85, maxLife: .85 });
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  game.kills += 1;
  game.xp += enemy.xp;
  addParticles(enemy.x, enemy.y, enemy.color, enemy.type === "guardian" ? 28 : 13, 190);
  addPulse(enemy.x, enemy.y, enemy.color, enemy.type === "guardian" ? 82 : 48, .38);
  addFloater(enemy.x, enemy.y - enemy.radius, "XP +" + enemy.xp);
  game.shake = Math.max(game.shake, enemy.type === "guardian" ? 10 : 4);
  if (game.xp >= game.xpNext) game.levelUpQueued = true;
}

function triggerLevelUp() {
  game.levelUpQueued = false;
  game.xp -= game.xpNext;
  game.player.level += 1;
  game.xpNext = Math.round(game.xpNext * 1.27 + 6);
  game.player.hp = Math.min(game.player.maxHp, game.player.hp + 10);
  game.mode = "choice";
  showLevelChoices();
  updateHud();
}

function finishRoom() {
  if (game.roomCleared) return;
  game.roomCleared = true;
  game.doorOpen = true;
  game.doorPulse = 1;
  const repair = Math.round(game.output.guard.roomHeal);
  if (repair > 0) {
    game.player.hp = Math.min(game.player.maxHp, game.player.hp + repair);
    addFloater(game.player.x, game.player.y - 30, "REPAIR +" + repair, "#71efad");
  }
  $("#door-prompt").hidden = false;
  addFloater(game.width * .5, 145, "NORTH GATE OPEN", "#58d7d3");
  addPulse(game.width * .5, roomBounds().top, "#58d7d3", 110, .55);
  showSystemToast("SECTOR CLEAR", "북쪽 출구가 열렸습니다. 문 근처에서 E를 누르세요.", "success", 3000);
}

function tryNextRoom(force) {
  if (game.mode !== "playing" || !game.doorOpen) return;
  const nearDoor = Math.abs(game.player.x - game.width * .5) < 92 && game.player.y < roomBounds().top + 92;
  if (force || nearDoor) enterRoom(game.room + 1);
  else {
    addFloater(game.player.x, game.player.y - 30, "북쪽 문으로 이동", "#58d7d3");
    showSystemToast("MOVE TO EXIT", "열린 북쪽 문 가까이에서 E를 누르세요.", "warning", 1900);
  }
}

function damageEnemy(enemy, damage, profile, angle, canCrit) {
  if (enemy.dead) return;
  const crit = Boolean(canCrit) && Math.random() < profile.crit;
  const dealt = damage * (crit ? profile.critMultiplier : 1);
  enemy.hp -= dealt;
  enemy.flash = .12;
  enemy.stun = Math.max(enemy.stun, profile.stun);
  enemy.x += Math.cos(angle) * profile.knockback;
  enemy.y += Math.sin(angle) * profile.knockback;
  if (profile.burn) {
    enemy.burnTime = Math.max(enemy.burnTime, 2.3);
    enemy.burnDps = Math.max(enemy.burnDps, profile.burn);
  }
  if (profile.bleed) {
    enemy.bleedTime = Math.max(enemy.bleedTime, 2.7);
    enemy.bleedDps = Math.max(enemy.bleedDps, profile.bleed);
  }
  addFloater(enemy.x, enemy.y - enemy.radius, Math.round(dealt) + (crit ? " CRIT" : ""), crit ? "#f6dc66" : "#e7f2ef");
  addParticles(enemy.x, enemy.y, crit ? "#f6dc66" : "#8ce1dc", crit ? 10 : 6, 110);
  addPulse(enemy.x, enemy.y, crit ? "#f6dc66" : "#8ce1dc", crit ? 38 : 24, crit ? .26 : .18);
  if (enemy.hp <= 0) killEnemy(enemy);
}

function applyAreaExplosion(x, y, radius, damage, excludedId) {
  if (!radius) return;
  addParticles(x, y, "#b7f1e9", 17, 185);
  for (const enemy of game.enemies) {
    if (enemy.dead || enemy.id === excludedId) continue;
    if ((enemy.x - x) ** 2 + (enemy.y - y) ** 2 <= radius ** 2) {
      enemy.hp -= damage * .45;
      enemy.flash = .1;
      if (enemy.hp <= 0) killEnemy(enemy);
    }
  }
}

function applyChain(origin, count, damage) {
  let source = origin;
  const hit = new Set([origin.id]);
  for (let index = 0; index < count; index += 1) {
    const target = game.enemies.filter((enemy) => !enemy.dead && !hit.has(enemy.id))
      .sort((a, b) => distanceSquared(a, source) - distanceSquared(b, source))[0];
    if (!target || distanceSquared(target, source) > 155 ** 2) break;
    hit.add(target.id);
    target.hp -= damage * .38;
    target.flash = .1;
    game.particles.push({
      x: source.x, y: source.y, vx: target.x - source.x, vy: target.y - source.y,
      life: .12, maxLife: .12, size: 2, color: "#69a9ff", beam: true
    });
    if (target.hp <= 0) killEnemy(target);
    source = target;
  }
}

function hasTrait(type) {
  return Boolean(game.output?.traits?.has(type));
}

function hasSynergy(kind) {
  return Boolean(game.output?.synergyKinds?.has(kind));
}

function nearestEnemyInDirection(angle, maxDistance, maxAngle) {
  return game.enemies.filter((enemy) => {
    if (enemy.dead) return false;
    const dx = enemy.x - game.player.x;
    const dy = enemy.y - game.player.y;
    return Math.hypot(dx, dy) <= maxDistance && Math.abs(angleDelta(Math.atan2(dy, dx), angle)) <= maxAngle;
  }).sort((a, b) => distanceSquared(a, game.player) - distanceSquared(b, game.player))[0] || null;
}

function executeSlash(profile, angle, damageScale, echo, meta) {
  const player = game.player;
  const context = meta || {};
  const originX = context.x ?? player.x;
  const originY = context.y ?? player.y;
  const hitEnemies = [];
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - originX;
    const dy = enemy.y - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > profile.range + enemy.radius) continue;
    if (Math.abs(angleDelta(Math.atan2(dy, dx), angle)) > profile.arc * Math.PI / 360) continue;
    if (game.selectedClass === "melee" && hasTrait("m_hook")) {
      enemy.x += (originX - enemy.x) * .24;
      enemy.y += (originY - enemy.y) * .24;
    }
    let strikeScale = damageScale;
    let consumedMark = false;
    if (game.selectedClass === "melee" && hasTrait("m_mark") && !context.synthetic) {
      if (enemy.duelMark && enemy.markDirection !== context.direction) {
        strikeScale *= 1.7;
        enemy.duelMark = 0;
        consumedMark = true;
        addFloater(enemy.x, enemy.y - enemy.radius - 12, "CROSS CUT", "#58d7d3");
      } else {
        enemy.duelMark = 4;
        enemy.markDirection = context.direction;
      }
    }
    damageEnemy(enemy, profile.damage * strikeScale, profile, Math.atan2(dy, dx), true);
    if (game.selectedClass === "melee" && hasTrait("m_execute") && !enemy.dead && enemy.hp / enemy.maxHp <= .22) {
      addFloater(enemy.x, enemy.y - enemy.radius - 10, "EXECUTE", "#f08080");
      killEnemy(enemy);
      if (hasTrait("m_blood")) player.hp = Math.min(player.maxHp, player.hp + 8);
      if (hasSynergy("harvester")) player.dashCooldown = 0;
    }
    if (hasTrait("m_blood") && consumedMark) player.hp = Math.min(player.maxHp, player.hp + 4);
    if (consumedMark && hasSynergy("duelist")) {
      game.delayedAttacks.push({ delay: .11, kind: "slash", angle, damageScale: .65, synthetic: true });
    }
    hitEnemies.push(enemy);
    applyAreaExplosion(enemy.x, enemy.y, profile.explosion, profile.damage, enemy.id);
    if (profile.chain) applyChain(enemy, profile.chain, profile.damage);
  }
  if (profile.phase) player.invulnerable = Math.max(player.invulnerable, .18);
  game.shake = Math.max(game.shake, hitEnemies.length ? (echo ? 3 : 5) : 1);
  if (hitEnemies.length) game.hitConfirm = .16;
  else if (!echo) game.missPulse = .12;
  addParticles(
    originX + Math.cos(angle) * profile.range * .58,
    originY + Math.sin(angle) * profile.range * .58,
    echo ? "#a48cff" : "#58d7d3", echo ? 5 : 8, 75
  );
  if (context.finisher && hasTrait("m_shock")) {
    const shockX = originX + Math.cos(angle) * 82;
    const shockY = originY + Math.sin(angle) * 82;
    createPlayerExplosion(shockX, shockY, 14, 72, { source: "melee-shock", noAugments: true });
  }
  if (context.finisher && hasSynergy("vortex") && !context.synthetic) {
    game.delayedAttacks.push({ delay: .14, kind: "spin", angle, damageScale: .7, synthetic: true });
  }
}

function spawnRailShot(angle, options) {
  const settings = options || {};
  const speed = settings.speed || 920;
  game.playerShots.push({
    kind: settings.kind || "rail", x: settings.x ?? game.player.x, y: settings.y ?? game.player.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle,
    damage: settings.damage ?? game.output.primary.damage, radius: settings.radius || 4,
    life: settings.life || 1.25, pierce: settings.pierce ?? (hasTrait("s_pierce") ? 2 : 0),
    ricochet: settings.ricochet ?? (hasTrait("s_ricochet") ? 1 : 0),
    homing: settings.homing ?? hasTrait("s_homing"), homingTargetId: settings.homingTargetId || null,
    charged: Boolean(settings.charged), drone: Boolean(settings.drone), hitIds: new Set(),
    color: settings.color || (settings.charged ? "#f6dc66" : "#d9f4ff")
  });
}

function fireSniperAttack(angle) {
  const player = game.player;
  player.shotCount += 1;
  const charged = hasTrait("s_ghost") && player.stillTime >= 1.05;
  const twin = hasTrait("s_twin") && player.shotCount % 2 === 0;
  if (charged) canvas.dataset.lastSpecial = "charged-rail";
  if (twin) canvas.dataset.lastSpecial = hasSynergy("hound_pair") ? "hound-pair" : "twin-rail";
  if (twin) {
    const splitTargets = hasSynergy("hound_pair")
      ? game.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distanceSquared(a, player) - distanceSquared(b, player)).slice(0, 2)
      : [];
    const leftAngle = splitTargets[0] ? Math.atan2(splitTargets[0].y - player.y, splitTargets[0].x - player.x) : angle - .075;
    const rightAngle = splitTargets[1] ? Math.atan2(splitTargets[1].y - player.y, splitTargets[1].x - player.x) : angle + .075;
    spawnRailShot(leftAngle, { charged, homingTargetId: splitTargets[0]?.id });
    spawnRailShot(rightAngle, { charged, homingTargetId: splitTargets[1]?.id });
  } else {
    spawnRailShot(angle, { charged, radius: charged ? 8 : 4, pierce: charged ? 99 : undefined });
  }
  if (hasTrait("s_mine") && player.shotCount % 3 === 0) {
    game.zones.push({ kind: "mine", x: player.x, y: player.y, radius: 48, life: 12, tick: 0, color: "#ff9b4a" });
  }
  player.stillTime = 0;
  player.attackFlash = .12;
  addParticles(player.x + Math.cos(angle) * 34, player.y + Math.sin(angle) * 34, charged ? "#f6dc66" : "#d9f4ff", charged ? 15 : 7, 145);
}

function launchGrenade(angle, options) {
  const player = game.player;
  const settings = options || {};
  const targetDistance = Math.min(game.output.primary.range, Math.hypot(game.mouse.x - player.x, game.mouse.y - player.y));
  const targetX = settings.targetX ?? player.x + Math.cos(angle) * targetDistance;
  const targetY = settings.targetY ?? player.y + Math.sin(angle) * targetDistance;
  const speed = settings.speed || 440;
  game.playerShots.push({
    kind: "grenade", x: settings.x ?? player.x, y: settings.y ?? player.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle,
    targetX, targetY, damage: settings.damage ?? game.output.primary.damage,
    radius: settings.radius || 8, blastRadius: settings.blastRadius || game.output.primary.blastRadius,
    life: 1.5, fragment: Boolean(settings.fragment), dashBomb: Boolean(settings.dashBomb),
    dashAngle: settings.dashAngle ?? angle, supernova: Boolean(settings.supernova), orbital: Boolean(settings.orbital),
    attachedId: null, color: settings.color || "#ff9b4a"
  });
}

function fireArtilleryAttack(angle) {
  const player = game.player;
  player.shotCount += 1;
  const supernova = hasTrait("a_super") && player.shotCount % 3 === 0;
  if (supernova) canvas.dataset.lastSpecial = hasSynergy("planetary") ? "planetary-supernova" : "supernova";
  launchGrenade(angle, { supernova, blastRadius: supernova ? 148 : game.output.primary.blastRadius, damage: supernova ? 34 : game.output.primary.damage, color: supernova ? "#f6dc66" : "#ff9b4a" });
  player.attackFlash = .14;
}

function startSlash() {
  const player = game.player;
  if (game.mode !== "playing" || player.attackCooldown > 0 || player.dashTime > 0) return false;
  const output = game.output;
  player.attackCooldown = output.primary.cooldown;
  player.swingCount += 1;
  canvas.dataset.swingCount = String(player.swingCount);
  if (game.selectedClass === "sniper") {
    canvas.dataset.swingDirection = "rail-shot";
    fireSniperAttack(player.aim);
    return true;
  }
  if (game.selectedClass === "artillery") {
    canvas.dataset.swingDirection = "grenade-launch";
    fireArtilleryAttack(player.aim);
    return true;
  }
  player.combo = (player.combo + 1) % 3;
  const finisher = player.combo === 0;
  const direction = player.nextSwingDirection;
  if (hasTrait("m_step")) {
    const markedTarget = hasSynergy("duelist") ? game.enemies.filter((enemy) => {
      if (enemy.dead || enemy.duelMark <= 0) return false;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      return Math.hypot(dx, dy) <= 260 && Math.abs(angleDelta(Math.atan2(dy, dx), player.aim)) <= .7;
    }).sort((a, b) => distanceSquared(a, player) - distanceSquared(b, player))[0] : null;
    const target = markedTarget || nearestEnemyInDirection(player.aim, 230, .5);
    if (target) {
      const targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
      const advance = Math.max(0, Math.hypot(target.x - player.x, target.y - player.y) - 62);
      player.x += Math.cos(targetAngle) * advance;
      player.y += Math.sin(targetAngle) * advance;
      addPulse(player.x, player.y, "#69a9ff", 38, .22);
    }
  }
  player.nextSwingDirection *= -1;
  canvas.dataset.swingDirection = direction > 0 ? "left-to-right" : "right-to-left";
  const swingDuration = Math.min(finisher ? .46 : .42, output.primary.cooldown * .92);
  const slashArc = finisher && hasTrait("m_spin") ? 360 : output.primary.arc;
  if (finisher && hasTrait("m_spin")) canvas.dataset.lastSpecial = hasSynergy("vortex") ? "magnetic-vortex" : "spin-finisher";
  player.slash = {
    time: 0, duration: swingDuration, angle: player.aim,
    direction,
    arc: slashArc, range: output.primary.range, echo: false
  };
  const meleeProfile = { ...output.primary, arc: slashArc, phase: player.riposteReady };
  const riposteScale = player.riposteReady ? 1.8 : 1;
  if (player.riposteReady) player.invulnerable = Math.max(player.invulnerable, .24);
  player.riposteReady = false;
  executeSlash(meleeProfile, player.aim, (finisher ? 1.28 : 1) * riposteScale, false, { direction, finisher });
  return true;
}

function damagePlayer(amount, sourceX, sourceY) {
  const player = game.player;
  if (player.invulnerable > 0 || game.mode !== "playing") return;
  const dealt = Math.max(1, amount * (1 - game.output.guard.armor));
  player.hp -= dealt;
  player.invulnerable = .62;
  game.shake = 10;
  flashDamageFeedback();
  if (game.selectedClass === "melee" && hasTrait("m_riposte")) {
    player.riposteReady = true;
    addFloater(player.x, player.y - 34, "RIPOSTE READY", "#ff9b4a");
  }
  const angle = Math.atan2(player.y - sourceY, player.x - sourceX);
  player.x += Math.cos(angle) * 20;
  player.y += Math.sin(angle) * 20;
  addParticles(player.x, player.y, "#ef5b57", 14, 155);
  addPulse(player.x, player.y, "#ef5b57", 58, .34);
  addFloater(player.x, player.y - 25, "-" + Math.round(dealt), "#ff7d78");
  if (game.player.hp <= 0) endGame();
}

function endGame() {
  game.player.hp = 0;
  game.mode = "gameover";
  $("#final-time").textContent = formatRoom();
  $("#final-kills").textContent = game.kills;
  $("#final-level").textContent = game.player.level;
  $("#restart-button").childNodes[0].textContent = CLASS_PROFILES[game.selectedClass].name + " 재시작 ";
  $("#gameover-overlay").hidden = false;
  $("#door-prompt").hidden = true;
  updateHud();
}

function returnToClassSelection() {
  game.mode = "start";
  $("#gameover-overlay").hidden = true;
  $("#pause-overlay").hidden = true;
  $("#choice-overlay").hidden = true;
  $("#factory-overlay").hidden = true;
  $("#start-overlay").hidden = false;
  $("#selected-class-copy").textContent = CLASS_PROFILES[game.selectedClass].name + " 선택됨 · 다른 클래스로 변경할 수 있습니다.";
}

function updatePlayer(dt) {
  const player = game.player;
  const bounds = roomBounds();
  player.attackCooldown -= dt;
  player.dashCooldown -= dt;
  player.invulnerable -= dt;
  player.aim = Math.atan2(game.mouse.y - player.y, game.mouse.x - player.x);
  let moveX = 0;
  let moveY = 0;
  if (game.keys.has("KeyW") || game.keys.has("ArrowUp")) moveY -= 1;
  if (game.keys.has("KeyS") || game.keys.has("ArrowDown")) moveY += 1;
  if (game.keys.has("KeyA") || game.keys.has("ArrowLeft")) moveX -= 1;
  if (game.keys.has("KeyD") || game.keys.has("ArrowRight")) moveX += 1;
  const length = Math.hypot(moveX, moveY) || 1;
  moveX /= length;
  moveY /= length;
  if (moveX || moveY) {
    player.lastMoveX = moveX;
    player.lastMoveY = moveY;
    player.stillTime = 0;
  } else {
    player.stillTime += dt;
  }
  player.attackFlash = Math.max(0, player.attackFlash - dt);
  if (game.dashRequested && player.dashCooldown <= 0) {
    const dashAngle = Math.atan2(player.lastMoveY, player.lastMoveX);
    if (game.selectedClass === "melee" && hasTrait("m_echo")) {
      game.delayedAttacks.push({ delay: .18, kind: "slash", angle: dashAngle, damageScale: .72, x: player.x, y: player.y, synthetic: true, aftershock: hasSynergy("aftershock") });
    }
    if (game.selectedClass === "sniper" && hasTrait("s_dashload")) {
      player.attackCooldown = 0;
      spawnRailShot(player.aim, { damage: 22, color: "#d9ef59", pierce: 0, ricochet: 0 });
      if (hasSynergy("escape_route")) game.zones.push({ kind: "mine", x: player.x, y: player.y, radius: 52, life: 12, tick: 0, color: "#ff9b4a" });
    }
    if (game.selectedClass === "artillery" && hasTrait("a_dashbomb")) {
      launchGrenade(dashAngle + Math.PI, { x: player.x, y: player.y, targetX: player.x, targetY: player.y, speed: 1, damage: 17, blastRadius: 74, dashBomb: true, dashAngle });
    }
    player.dashTime = .17;
    player.dashCooldown = game.output.guard.dashCooldown;
    player.invulnerable = Math.max(player.invulnerable, .28);
    game.dashRequested = false;
    addPulse(player.x, player.y, "#58d7d3", 42, .24);
  }
  const dashing = player.dashTime > 0;
  if (dashing) {
    player.dashTime -= dt;
    moveX = player.lastMoveX;
    moveY = player.lastMoveY;
    if (Math.random() < .75) addParticles(player.x, player.y, "#58d7d3", 1, 15);
    if (game.output.guard.dashDamage > 0) {
      for (const enemy of game.enemies) {
        if (enemy.dead || enemy.dashHit) continue;
        if (distanceSquared(enemy, player) < (enemy.radius + player.radius + 10) ** 2) {
          enemy.dashHit = true;
          enemy.hp -= game.output.guard.dashDamage;
          enemy.stun = .25;
          if (enemy.hp <= 0) killEnemy(enemy);
        }
      }
    }
  } else {
    for (const enemy of game.enemies) enemy.dashHit = false;
  }
  const speed = dashing ? 610 : player.speed;
  player.x = clamp(player.x + moveX * speed * dt, bounds.left + player.radius, bounds.right - player.radius);
  player.y = clamp(player.y + moveY * speed * dt, bounds.top + player.radius, bounds.bottom - player.radius);
  player.attackBuffer = Math.max(0, player.attackBuffer - dt);
  if (game.attackRequested) {
    player.attackBuffer = .16;
    game.attackRequested = false;
  }
  if (player.attackBuffer > 0 && player.attackCooldown <= 0 && player.dashTime <= 0 && startSlash()) {
    player.attackBuffer = 0;
  }
  if (player.slash) {
    player.slash.time += dt;
    if (player.slash.time >= player.slash.duration) player.slash = null;
  }
}

function fireEnemyBullet(enemy, speed, count) {
  const base = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
  const amount = count || 1;
  for (let index = 0; index < amount; index += 1) {
    const offset = (index - (amount - 1) / 2) * .16;
    const angle = base + offset;
    game.enemyBullets.push({
      x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: enemy.type === "guardian" ? 7 : 5, damage: enemy.damage, life: 3.2, dead: false
    });
  }
}

function updateEnemies(dt) {
  const player = game.player;
  const bounds = roomBounds();
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    enemy.flash -= dt;
    enemy.attackCooldown -= dt;
    enemy.shootCooldown -= dt;
    enemy.chargeCooldown -= dt;
    enemy.stun -= dt;
    enemy.duelMark = Math.max(0, (enemy.duelMark || 0) - dt);
    enemy.sniperMark = Math.max(0, (enemy.sniperMark || 0) - dt);
    enemy.slowed = game.zones.some((zone) => zone.kind === "slow" && distanceSquared(enemy, zone) <= zone.radius ** 2);
    if (enemy.burnTime > 0) {
      enemy.burnTime -= dt;
      enemy.hp -= enemy.burnDps * dt;
      if (Math.random() < dt * 9) addParticles(enemy.x, enemy.y, "#ff714f", 1, 35);
    }
    if (enemy.bleedTime > 0) {
      enemy.bleedTime -= dt;
      enemy.hp -= enemy.bleedDps * dt;
      if (Math.random() < dt * 7) addParticles(enemy.x, enemy.y, "#f08080", 1, 28);
    }
    if (enemy.hp <= 0) { killEnemy(enemy); continue; }
    if (enemy.stun > 0) continue;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    let move = 1;
    if (enemy.type === "turret") {
      if (distance < 190) move = -1;
      else if (distance < 285) move = 0;
      if (enemy.shootWindup > 0) {
        enemy.shootWindup -= dt;
        move = 0;
        if (enemy.shootWindup <= 0) fireEnemyBullet(enemy, 280 + game.room * 3, 1);
      } else if (enemy.shootCooldown <= 0) {
        enemy.shootWindup = .38;
        enemy.shootCooldown = Math.max(.75, 1.55 - game.room * .025);
      }
    }
    if (enemy.type === "guardian") {
      if (enemy.shootWindup > 0) {
        enemy.shootWindup -= dt;
        if (enemy.shootWindup <= 0) fireEnemyBullet(enemy, 245, 3);
      } else if (enemy.shootCooldown <= 0) {
        enemy.shootWindup = .42;
        enemy.shootCooldown = 1.25;
      }
    }
    let charging = false;
    if (enemy.chargeWindup > 0) {
      enemy.chargeWindup -= dt;
      move = 0;
      if (enemy.chargeWindup <= 0) enemy.chargeTime = enemy.type === "guardian" ? .3 : .24;
    } else if (enemy.chargeTime > 0) {
      enemy.chargeTime -= dt;
      charging = true;
    } else if ((enemy.type === "brute" || enemy.type === "guardian") && enemy.chargeCooldown <= 0 && distance > 90) {
      enemy.chargeWindup = enemy.type === "guardian" ? .5 : .42;
      enemy.chargeCooldown = enemy.type === "guardian" ? 1.5 : 2.2;
      enemy.chargeAngle = angle;
      move = 0;
    }
    const movementAngle = charging ? enemy.chargeAngle : angle;
    const velocity = enemy.speed * move * (charging ? 3.15 : 1) * (enemy.slowed ? .52 : 1);
    enemy.x = clamp(enemy.x + Math.cos(movementAngle) * velocity * dt, bounds.left + enemy.radius, bounds.right - enemy.radius);
    enemy.y = clamp(enemy.y + Math.sin(movementAngle) * velocity * dt, bounds.top + enemy.radius, bounds.bottom - enemy.radius);
    if (distance < player.radius + enemy.radius + 3 && enemy.attackCooldown <= 0) {
      damagePlayer(enemy.damage, enemy.x, enemy.y);
      enemy.attackCooldown = enemy.type === "guardian" ? .8 : 1.05;
      if (game.output.guard.thorns > 0) {
        enemy.hp -= game.output.guard.thorns;
        if (enemy.hp <= 0) killEnemy(enemy);
      }
    }
  }
}

function updateEnemyBullets(dt) {
  const player = game.player;
  const bounds = roomBounds();
  for (const bullet of game.enemyBullets) {
    if (bullet.dead) continue;
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.life <= 0 || bullet.x < bounds.left || bullet.x > bounds.right ||
      bullet.y < bounds.top || bullet.y > bounds.bottom) bullet.dead = true;
    if (bullet.dead) continue;
    if (distanceSquared(bullet, player) < (bullet.radius + player.radius) ** 2) {
      const parrying = game.selectedClass === "melee" && hasTrait("m_guard") && Boolean(player.slash);
      if (Math.random() < game.output.guard.deflect || parrying) {
        bullet.dead = true;
        addParticles(bullet.x, bullet.y, "#8b7fff", 8, 130);
        if (parrying && hasSynergy("perfect_counter")) {
          player.riposteReady = true;
          const shooter = game.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distanceSquared(a, bullet) - distanceSquared(b, bullet))[0];
          if (shooter) spawnRailShot(Math.atan2(shooter.y - bullet.y, shooter.x - bullet.x), { x: bullet.x, y: bullet.y, damage: 18, homing: true, pierce: 0, ricochet: 0, color: "#8b7fff" });
        }
        if (game.output.guard.counterShock > 0) {
          const nearest = game.enemies.filter((enemy) => !enemy.dead)
            .sort((a, b) => distanceSquared(a, player) - distanceSquared(b, player))[0];
          if (nearest) {
            nearest.hp -= 7 * game.output.guard.counterShock;
            if (nearest.hp <= 0) killEnemy(nearest);
          }
        }
      } else {
        bullet.dead = true;
        damagePlayer(bullet.damage, bullet.x, bullet.y);
      }
    }
  }
  game.enemyBullets = game.enemyBullets.filter((bullet) => !bullet.dead);
}

function createPlayerExplosion(x, y, damage, radius, options) {
  const settings = options || {};
  const augmented = game.selectedClass === "artillery" && !settings.noAugments;
  const color = settings.supernova ? "#f6dc66" : settings.color || (game.selectedClass === "artillery" ? "#ff714f" : "#58d7d3");
  addPulse(x, y, color, radius, settings.supernova ? .58 : .4);
  addParticles(x, y, color, settings.supernova ? 34 : 20, settings.supernova ? 250 : 185);
  game.shake = Math.max(game.shake, settings.supernova ? 13 : 7);
  if (settings.supernova) {
    for (const bullet of game.enemyBullets) {
      if (!bullet.dead && (bullet.x - x) ** 2 + (bullet.y - y) ** 2 <= (radius * 1.15) ** 2) bullet.dead = true;
    }
  }
  const killed = [];
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (augmented && hasTrait("a_vacuum") && distance <= radius * 1.55) {
      enemy.x += (x - enemy.x) * .34;
      enemy.y += (y - enemy.y) * .34;
    }
    if (distance > radius + enemy.radius) continue;
    const wasAlive = !enemy.dead;
    const profile = { ...game.output.primary, knockback: settings.source === "melee-shock" ? 34 : 12, stun: .12 };
    damageEnemy(enemy, damage, profile, Math.atan2(enemy.y - y, enemy.x - x), false);
    if (wasAlive && enemy.dead) killed.push(enemy);
  }
  if (augmented && hasTrait("a_fire") && !settings.recursive) {
    game.zones.push({ kind: "fire", x, y, radius: radius * .72, life: 3.2, tick: 0, color: "#ff714f", vortex: hasSynergy("inferno_vortex") });
  }
  if (augmented && hasTrait("a_shrapnel") && !settings.shrapnel) {
    const amount = settings.dashBomb && hasSynergy("breach_field") ? 6 : 10;
    const baseAngle = settings.dashAngle || 0;
    for (let index = 0; index < amount; index += 1) {
      const angle = settings.dashBomb && hasSynergy("breach_field")
        ? baseAngle + (index - (amount - 1) / 2) * .16
        : index / amount * Math.PI * 2;
      spawnRailShot(angle, { kind: "shrapnel", x, y, speed: 520, damage: 8, life: .65, pierce: 1, ricochet: 0, homing: false, color: "#ffd6a0" });
    }
  }
  const recursiveAllowed = augmented && hasTrait("a_recursive") && !settings.recursive && (!settings.fragment || hasSynergy("cascade"));
  if (recursiveAllowed) {
    game.delayedAttacks.push({ delay: .42, kind: "explosion", x, y, damage: damage * .62, radius: radius * .72, options: { recursive: true, color: "#a48cff" } });
  }
  if (augmented && hasTrait("a_cluster") && !settings.fragment && !settings.dashBomb) {
    for (let index = 0; index < 3; index += 1) {
      const angle = index / 3 * Math.PI * 2 + .35;
      launchGrenade(angle, { x, y, targetX: x + Math.cos(angle) * 105, targetY: y + Math.sin(angle) * 105, speed: 360, damage: damage * .52, blastRadius: radius * .55, fragment: true, color: "#d9ef59" });
    }
  }
  if (augmented && hasTrait("a_chain") && !settings.chain) {
    for (const enemy of killed.slice(0, 3)) {
      game.delayedAttacks.push({ delay: .12, kind: "explosion", x: enemy.x, y: enemy.y, damage: damage * .5, radius: radius * .58, options: { chain: true, color: "#f08080" } });
    }
  }
  if (augmented && hasTrait("a_orbit") && !settings.orbital && game.orbitals.length < 6) {
    const count = settings.supernova && hasSynergy("planetary") ? 3 : 1;
    for (let index = 0; index < count; index += 1) game.orbitals.push({ x, y, angle: index / count * Math.PI * 2, delay: .35 + index * .14, color: "#71efad" });
  }
}

function ricochetShot(shot, origin) {
  const target = game.enemies.filter((enemy) => !enemy.dead && !shot.hitIds.has(enemy.id))
    .sort((a, b) => distanceSquared(a, origin) - distanceSquared(b, origin))[0];
  if (!target || distanceSquared(target, origin) > 300 ** 2) return false;
  const angle = Math.atan2(target.y - shot.y, target.x - shot.x);
  const speed = Math.hypot(shot.vx, shot.vy);
  shot.vx = Math.cos(angle) * speed;
  shot.vy = Math.sin(angle) * speed;
  shot.angle = angle;
  shot.ricochet -= 1;
  addPulse(shot.x, shot.y, "#69a9ff", 24, .18);
  return true;
}

function updatePlayerShots(dt) {
  const bounds = roomBounds();
  for (const shot of game.playerShots) {
    if (shot.dead) continue;
    shot.life -= dt;
    if (shot.kind === "grenade" && shot.attachedId) {
      const attached = game.enemies.find((enemy) => enemy.id === shot.attachedId && !enemy.dead);
      shot.fuse -= dt;
      if (attached) { shot.x = attached.x; shot.y = attached.y; }
      if (!attached || shot.fuse <= 0) {
        shot.dead = true;
        createPlayerExplosion(shot.x, shot.y, shot.damage, shot.blastRadius, { fragment: shot.fragment, dashBomb: shot.dashBomb, supernova: shot.supernova, orbital: shot.orbital, dashAngle: shot.dashAngle });
      }
      continue;
    }
    if (shot.homing && (shot.kind === "rail" || shot.kind === "shrapnel")) {
      const assignedTarget = shot.homingTargetId
        ? game.enemies.find((enemy) => enemy.id === shot.homingTargetId && !enemy.dead && !shot.hitIds.has(enemy.id))
        : null;
      const target = assignedTarget || game.enemies.filter((enemy) => !enemy.dead && !shot.hitIds.has(enemy.id))
        .sort((a, b) => distanceSquared(a, shot) - distanceSquared(b, shot))[0];
      if (target && distanceSquared(target, shot) < 260 ** 2) {
        const targetAngle = Math.atan2(target.y - shot.y, target.x - shot.x);
        shot.angle += angleDelta(targetAngle, shot.angle) * Math.min(1, dt * 4.8);
        const speed = Math.hypot(shot.vx, shot.vy);
        shot.vx = Math.cos(shot.angle) * speed;
        shot.vy = Math.sin(shot.angle) * speed;
      }
    }
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.kind === "grenade") {
      if (hasTrait("a_sticky") && !shot.fragment && !shot.dashBomb) {
        const target = game.enemies.find((enemy) => !enemy.dead && distanceSquared(enemy, shot) <= (enemy.radius + shot.radius) ** 2);
        if (target) {
          shot.attachedId = target.id;
          shot.fuse = .34;
          shot.vx = 0; shot.vy = 0;
          addFloater(target.x, target.y - target.radius, "STICK", "#ffbd57");
          continue;
        }
      }
      if (Math.hypot(shot.x - shot.targetX, shot.y - shot.targetY) <= Math.max(18, Math.hypot(shot.vx, shot.vy) * dt) || shot.life <= 0) {
        shot.dead = true;
        createPlayerExplosion(shot.x, shot.y, shot.damage, shot.blastRadius, { fragment: shot.fragment, dashBomb: shot.dashBomb, supernova: shot.supernova, orbital: shot.orbital, dashAngle: shot.dashAngle });
      }
      continue;
    }
    for (const enemy of game.enemies) {
      if (enemy.dead || shot.hitIds.has(enemy.id) || distanceSquared(enemy, shot) > (enemy.radius + shot.radius) ** 2) continue;
      shot.hitIds.add(enemy.id);
      const wasAlive = !enemy.dead;
      if (game.selectedClass === "sniper" && hasTrait("s_mark") && shot.kind === "rail") {
        if (enemy.sniperMark > 0) {
          enemy.sniperMark = 0;
          createPlayerExplosion(enemy.x, enemy.y, 15, 58, { source: "mark", noAugments: true, color: "#ef70c4" });
          addFloater(enemy.x, enemy.y - enemy.radius - 10, "MARK BREAK", "#ef70c4");
        } else {
          enemy.sniperMark = 5;
        }
      }
      damageEnemy(enemy, shot.damage, game.output.primary, shot.angle, shot.kind === "rail");
      if (game.selectedClass === "sniper" && hasTrait("s_freeze")) {
        game.zones.push({ kind: "slow", x: enemy.x, y: enemy.y, radius: 70, life: 2.8, tick: 0, color: "#57d8ee" });
      }
      if (shot.charged && hasSynergy("dead_center")) {
        for (const marked of game.enemies.filter((item) => !item.dead && item.sniperMark > 0)) {
          marked.sniperMark = 0;
          createPlayerExplosion(marked.x, marked.y, 18, 62, { source: "dead-center", noAugments: true, color: "#a48cff" });
        }
      }
      if (wasAlive && enemy.dead && game.selectedClass === "sniper" && hasTrait("s_drone")) {
        game.delayedAttacks.push({ delay: .22, kind: "drone", x: enemy.x, y: enemy.y, cold: hasSynergy("cold_observer") });
      }
      if (shot.pierce > 0) { shot.pierce -= 1; continue; }
      if (shot.ricochet > 0 && ricochetShot(shot, enemy)) break;
      shot.dead = true;
      break;
    }
    if (shot.life <= 0 || shot.x < bounds.left - 30 || shot.x > bounds.right + 30 || shot.y < bounds.top - 30 || shot.y > bounds.bottom + 30) shot.dead = true;
  }
  game.playerShots = game.playerShots.filter((shot) => !shot.dead);
}

function updateZones(dt) {
  for (const zone of game.zones) {
    zone.life -= dt;
    zone.tick -= dt;
    if (zone.vortex) {
      for (const enemy of game.enemies) {
        if (!enemy.dead && distanceSquared(enemy, zone) <= (zone.radius * 1.4) ** 2) {
          enemy.x += (zone.x - enemy.x) * dt * .85;
          enemy.y += (zone.y - enemy.y) * dt * .85;
        }
      }
    }
    if (zone.kind === "mine") {
      const target = game.enemies.find((enemy) => !enemy.dead && distanceSquared(enemy, zone) <= zone.radius ** 2);
      if (target) {
        zone.life = 0;
        createPlayerExplosion(zone.x, zone.y, 22, 72, { source: "mine", noAugments: game.selectedClass !== "artillery", color: zone.color });
      }
    }
    if (zone.kind === "fire" && zone.tick <= 0) {
      zone.tick = .3;
      for (const enemy of game.enemies) {
        if (!enemy.dead && distanceSquared(enemy, zone) <= (zone.radius + enemy.radius) ** 2) {
          damageEnemy(enemy, 5, { ...game.output.primary, knockback: 0, stun: 0 }, 0, false);
        }
      }
    }
  }
  game.zones = game.zones.filter((zone) => zone.life > 0);
}

function updateDelayedAttacks(dt) {
  for (const attack of game.delayedAttacks) {
    attack.delay -= dt;
    if (attack.delay > 0 || attack.fired) continue;
    attack.fired = true;
    if (attack.kind === "explosion") createPlayerExplosion(attack.x, attack.y, attack.damage, attack.radius, attack.options);
    if (attack.kind === "slash" || attack.kind === "spin") {
      const profile = { ...game.output.primary, arc: attack.kind === "spin" ? 360 : 112 };
      executeSlash(profile, attack.angle, attack.damageScale, true, { synthetic: true, x: attack.x, y: attack.y, direction: 0 });
      if (attack.aftershock) createPlayerExplosion(attack.x + Math.cos(attack.angle) * 70, attack.y + Math.sin(attack.angle) * 70, 12, 66, { noAugments: true, source: "aftershock" });
    }
    if (attack.kind === "drone") {
      const targets = game.enemies.filter((enemy) => !enemy.dead);
      const target = targets.sort((a, b) =>
        (attack.cold ? Number(b.slowed) - Number(a.slowed) : 0) || distanceSquared(a, attack) - distanceSquared(b, attack)
      )[0];
      if (target) spawnRailShot(Math.atan2(target.y - attack.y, target.x - attack.x), { x: attack.x, y: attack.y, damage: 16, drone: true, homing: true, color: "#71efad" });
    }
  }
  game.delayedAttacks = game.delayedAttacks.filter((attack) => !attack.fired);
  for (const orbital of game.orbitals) {
    orbital.delay -= dt;
    orbital.angle += dt * 5;
    if (orbital.delay > 0 || orbital.fired) continue;
    const target = game.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distanceSquared(a, orbital) - distanceSquared(b, orbital))[0];
    if (target) {
      const angle = Math.atan2(target.y - orbital.y, target.x - orbital.x);
      launchGrenade(angle, { x: orbital.x, y: orbital.y, targetX: target.x, targetY: target.y, speed: 520, damage: 13, blastRadius: 54, fragment: true, orbital: true, color: "#71efad" });
    }
    orbital.fired = true;
  }
  game.orbitals = game.orbitals.filter((orbital) => !orbital.fired);
}

function updateEchoes(dt) {
  for (const echo of game.echoes) {
    if (echo.fired) continue;
    echo.delay -= dt;
    if (echo.delay <= 0) {
      echo.fired = true;
      executeSlash(game.output.echo, echo.angle, echo.damageScale, true);
    }
  }
  game.echoes = game.echoes.filter((echo) => !echo.fired);
}

function updateEffects(dt) {
  for (const particle of game.particles) {
    particle.life -= dt;
    if (!particle.beam) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= .94;
      particle.vy *= .94;
    }
  }
  for (const floater of game.floaters) {
    floater.life -= dt;
    floater.y -= 34 * dt;
  }
  for (const pulse of game.pulses) pulse.life -= dt;
  game.hitConfirm = Math.max(0, game.hitConfirm - dt);
  game.missPulse = Math.max(0, game.missPulse - dt);
  game.particles = game.particles.filter((particle) => particle.life > 0);
  game.floaters = game.floaters.filter((floater) => floater.life > 0);
  game.pulses = game.pulses.filter((pulse) => pulse.life > 0);
}

function update(dt) {
  game.time += dt;
  game.roomBanner -= dt;
  game.doorPulse += dt;
  updatePlayer(dt);
  updateEnemies(dt);
  updateEnemyBullets(dt);
  updatePlayerShots(dt);
  updateZones(dt);
  updateDelayedAttacks(dt);
  updateEchoes(dt);
  updateEffects(dt);
  game.enemies = game.enemies.filter((enemy) => !enemy.dead);
  game.shake = Math.max(0, game.shake - dt * 32);
  if (!game.roomCleared && game.enemies.length === 0) finishRoom();
  updateHud();
  if (game.levelUpQueued && game.mode === "playing") triggerLevelUp();
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawArena() {
  const bounds = roomBounds();
  ctx.fillStyle = "#070a0b";
  ctx.fillRect(0, 0, game.width, game.height);
  const gradient = ctx.createRadialGradient(game.width * .5, game.height * .48, 40, game.width * .5, game.height * .48, game.width * .65);
  gradient.addColorStop(0, "#192326");
  gradient.addColorStop(1, "#0b1012");
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
  const tile = 48;
  ctx.strokeStyle = "rgba(106,139,143,.11)";
  ctx.lineWidth = 1;
  for (let x = bounds.left; x <= bounds.right; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, bounds.top); ctx.lineTo(x, bounds.bottom); ctx.stroke();
  }
  for (let y = bounds.top; y <= bounds.bottom; y += tile) {
    ctx.beginPath(); ctx.moveTo(bounds.left, y); ctx.lineTo(bounds.right, y); ctx.stroke();
  }
  ctx.fillStyle = "#263234";
  ctx.fillRect(bounds.left - 18, bounds.top - 18, bounds.right - bounds.left + 36, 18);
  ctx.fillRect(bounds.left - 18, bounds.bottom, bounds.right - bounds.left + 36, 18);
  ctx.fillRect(bounds.left - 18, bounds.top, 18, bounds.bottom - bounds.top);
  ctx.fillRect(bounds.right, bounds.top, 18, bounds.bottom - bounds.top);
  ctx.fillStyle = "#101719";
  for (let x = bounds.left; x < bounds.right; x += 78) {
    ctx.fillRect(x, bounds.top - 17, 50, 8);
    ctx.fillRect(x + 25, bounds.bottom + 5, 50, 8);
  }
  const doorWidth = 126;
  const doorX = game.width * .5 - doorWidth * .5;
  ctx.fillStyle = game.doorOpen ? "#163434" : "#321f22";
  ctx.fillRect(doorX, bounds.top - 21, doorWidth, 35);
  ctx.strokeStyle = game.doorOpen ? "#58d7d3" : "#ef5b57";
  ctx.lineWidth = 3;
  ctx.strokeRect(doorX, bounds.top - 21, doorWidth, 35);
  if (!game.doorOpen) {
    for (let x = doorX + 13; x < doorX + doorWidth; x += 18) ctx.fillRect(x, bounds.top - 19, 5, 31);
  } else {
    const glow = .2 + Math.sin(game.doorPulse * 4) * .1;
    ctx.fillStyle = "rgba(88,215,211," + glow + ")";
    ctx.fillRect(doorX + 5, bounds.top - 17, doorWidth - 10, 29);
    ctx.fillStyle = "#bff7f3";
    ctx.font = "700 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText("NEXT SECTOR", game.width * .5, bounds.top);
  }
  ctx.fillStyle = "#334045";
  const pillars = [
    [bounds.left + 42, bounds.top + 42], [bounds.right - 42, bounds.top + 42],
    [bounds.left + 42, bounds.bottom - 42], [bounds.right - 42, bounds.bottom - 42]
  ];
  for (const pillar of pillars) {
    ctx.fillRect(pillar[0] - 14, pillar[1] - 14, 28, 28);
    ctx.strokeStyle = "#526167";
    ctx.strokeRect(pillar[0] - 10, pillar[1] - 10, 20, 20);
  }
}

function drawEnemyTelegraphs() {
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    ctx.save();
    if (enemy.shootWindup > 0) {
      const maxWindup = enemy.type === "guardian" ? .42 : .38;
      const readiness = 1 - clamp(enemy.shootWindup / maxWindup, 0, 1);
      ctx.globalAlpha = .18 + readiness * .52;
      ctx.strokeStyle = enemy.type === "guardian" ? "#ff873f" : "#e7a050";
      ctx.lineWidth = 1 + readiness * 2;
      ctx.setLineDash([4 + readiness * 5, 7 - readiness * 3]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(game.player.x, game.player.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 8 + readiness * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (enemy.chargeWindup > 0) {
      const maxWindup = enemy.type === "guardian" ? .5 : .42;
      const readiness = 1 - clamp(enemy.chargeWindup / maxWindup, 0, 1);
      ctx.globalAlpha = .28 + readiness * .6;
      ctx.strokeStyle = "#ff675f";
      ctx.lineWidth = 2 + readiness * 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 10 + Math.sin(readiness * Math.PI * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,82,74,.12)";
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.arc(enemy.x, enemy.y, 86, enemy.chargeAngle - .12, enemy.chargeAngle + .12);
      ctx.closePath();
      ctx.fill();
    }
    if (enemy.chargeTime > 0) {
      ctx.globalAlpha = .42;
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = enemy.radius * .7;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x - Math.cos(enemy.chargeAngle) * 38, enemy.y - Math.sin(enemy.chargeAngle) * 38);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  const flash = enemy.flash > 0;
  ctx.shadowBlur = flash ? 22 : 10;
  ctx.shadowColor = enemy.color;
  ctx.fillStyle = flash ? "#ffffff" : enemy.color;
  if (enemy.type === "drone") {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-enemy.radius * .7, -enemy.radius * .7, enemy.radius * 1.4, enemy.radius * 1.4);
    ctx.fillStyle = "#270e12";
    ctx.fillRect(-5, -5, 10, 10);
  } else if (enemy.type === "turret") {
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const radius = index % 2 ? enemy.radius * .72 : enemy.radius;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x));
    ctx.fillStyle = "#201512";
    ctx.fillRect(0, -4, enemy.radius + 7, 8);
  } else {
    drawRoundedRect(-enemy.radius, -enemy.radius * .75, enemy.radius * 2, enemy.radius * 1.5, 7);
    ctx.fill();
    ctx.fillStyle = "#261015";
    ctx.fillRect(-enemy.radius * .52, -5, enemy.radius * 1.04, 10);
    ctx.fillStyle = "#ffcf68";
    ctx.fillRect(-enemy.radius * .34, -2, enemy.radius * .18, 4);
    ctx.fillRect(enemy.radius * .16, -2, enemy.radius * .18, 4);
  }
  ctx.restore();
  if (enemy.duelMark > 0) {
    ctx.strokeStyle = enemy.markDirection > 0 ? "#58d7d3" : "#a48cff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + 7, -.8, 2.3); ctx.stroke();
  }
  if (enemy.sniperMark > 0) {
    ctx.strokeStyle = "#ef70c4";
    ctx.lineWidth = 2;
    ctx.strokeRect(enemy.x - enemy.radius - 6, enemy.y - enemy.radius - 6, enemy.radius * 2 + 12, enemy.radius * 2 + 12);
  }
  if (enemy.slowed) {
    ctx.strokeStyle = "rgba(87,216,238,.7)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2); ctx.stroke();
  }
  const width = enemy.radius * 2.2;
  ctx.fillStyle = "#1a0d10";
  ctx.fillRect(enemy.x - width * .5, enemy.y - enemy.radius - 12, width, 4);
  ctx.fillStyle = enemy.color;
  ctx.fillRect(enemy.x - width * .5, enemy.y - enemy.radius - 12, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 4);
}

function drawRobot() {
  const player = game.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.aim);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2) ctx.globalAlpha = .42;
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#58d7d3";
  ctx.fillStyle = "#172b2d";
  ctx.strokeStyle = "#7ce7e1";
  ctx.lineWidth = 2;
  drawRoundedRect(-16, -14, 32, 28, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#dbe8e6";
  drawRoundedRect(-9, -9, 17, 18, 4);
  ctx.fill();
  ctx.fillStyle = "#0d1718";
  ctx.fillRect(-2, -6, 7, 12);
  ctx.fillStyle = "#c9f05a";
  ctx.fillRect(1, -4, 3, 8);
  ctx.fillStyle = "#58d7d3";
  ctx.fillRect(-15, -20, 8, 7);
  ctx.fillRect(-15, 13, 8, 7);
  const attackReady = 1 - clamp(player.attackCooldown / game.output.primary.cooldown, 0, 1);
  const dashReady = 1 - clamp(player.dashCooldown / game.output.guard.dashCooldown, 0, 1);
  const classColor = CLASS_PROFILES[game.selectedClass].color;
  ctx.save();
  ctx.rotate(-player.aim);
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.globalAlpha = .25;
  ctx.strokeStyle = classColor;
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = attackReady >= .999 ? 1 : .7;
  ctx.strokeStyle = classColor;
  ctx.beginPath(); ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * attackReady); ctx.stroke();
  ctx.strokeStyle = "rgba(201,240,90,.18)";
  ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = dashReady >= .999 ? "#c9f05a" : "rgba(201,240,90,.65)";
  ctx.beginPath(); ctx.arc(0, 0, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashReady); ctx.stroke();
  ctx.restore();
  if (game.selectedClass === "sniper") {
    const charged = hasTrait("s_ghost") && player.stillTime >= 1.05;
    ctx.save();
    ctx.translate(9, 0);
    ctx.shadowBlur = player.attackFlash > 0 ? 30 : charged ? 22 : 10;
    ctx.shadowColor = charged ? "#f6dc66" : "#69a9ff";
    ctx.fillStyle = "#65757a";
    drawRoundedRect(-5, -6, 42, 12, 4); ctx.fill();
    ctx.fillStyle = charged ? "#f6dc66" : "#d9f4ff";
    ctx.fillRect(27, -3, 39, 6);
    ctx.fillStyle = "#1a2427";
    ctx.fillRect(7, -12, 15, 7);
    ctx.strokeStyle = charged ? "#f6dc66" : "#69a9ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(9, -14, 11, 10);
    if (charged) {
      ctx.globalAlpha = .45 + Math.sin(game.time * 10) * .2;
      ctx.beginPath(); ctx.arc(66, 0, 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    return;
  }
  if (game.selectedClass === "artillery") {
    ctx.save();
    ctx.translate(8, 0);
    ctx.shadowBlur = player.attackFlash > 0 ? 28 : 12;
    ctx.shadowColor = "#ff714f";
    ctx.fillStyle = "#596a6e";
    drawRoundedRect(-5, -10, 42, 20, 8); ctx.fill();
    ctx.fillStyle = "#1b2426";
    ctx.beginPath(); ctx.arc(33, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ff714f";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(33, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#f6dc66";
    ctx.beginPath(); ctx.arc(33, 0, 3 + Math.sin(game.time * 8), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
    return;
  }
  const slash = player.slash;
  const progress = slash ? clamp(slash.time / slash.duration, 0, 1) : 0;
  const eased = .5 - Math.cos(progress * Math.PI) * .5;
  const swingStart = slash && slash.direction < 0 ? 1.18 : -1.18;
  const swingEnd = -swingStart;
  const idleAngle = player.nextSwingDirection > 0 ? -1.18 : 1.18;
  const swordAngle = slash ? swingStart + (swingEnd - swingStart) * eased : idleAngle;
  const bladeLength = slash ? clamp(slash.range * .78, 68, 104) : 68;
  const bladeColor = slash && slash.echo ? "#b6a8ff" : "#eafffd";

  if (slash) {
    const trailStart = swordAngle - slash.direction * (.42 + progress * .18);
    ctx.save();
    ctx.translate(10, 0);
    ctx.globalAlpha = .18 + Math.sin(progress * Math.PI) * .38;
    ctx.strokeStyle = slash.echo ? "#a48cff" : "#58d7d3";
    ctx.lineWidth = 13 - progress * 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, bladeLength * .82, trailStart, swordAngle, slash.direction < 0);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(10, 0);
  ctx.rotate(swordAngle);
  ctx.shadowBlur = slash ? 24 : 10;
  ctx.shadowColor = slash && slash.echo ? "#8b7fff" : "#58d7d3";
  ctx.fillStyle = "#718084";
  drawRoundedRect(-4, -5, 22, 10, 4);
  ctx.fill();
  ctx.fillStyle = "#c9f05a";
  ctx.fillRect(13, -11, 5, 22);
  ctx.fillStyle = bladeColor;
  ctx.beginPath();
  ctx.moveTo(18, -6);
  ctx.lineTo(bladeLength - 10, -5);
  ctx.lineTo(bladeLength, 0);
  ctx.lineTo(bladeLength - 10, 5);
  ctx.lineTo(18, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = slash && slash.echo ? "#8b7fff" : "#8ce1dc";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(13,28,30,.5)";
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(bladeLength - 9, 0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawZones() {
  for (const zone of game.zones) {
    ctx.save();
    const alpha = clamp(zone.life / 1.2, 0, 1);
    ctx.globalAlpha = .12 + alpha * .16;
    ctx.fillStyle = zone.kind === "slow" ? "#57d8ee" : zone.kind === "fire" ? "#ff714f" : zone.color || "#ff9b4a";
    ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .55;
    ctx.strokeStyle = zone.kind === "slow" ? "#57d8ee" : zone.kind === "fire" ? "#ff714f" : zone.color || "#ff9b4a";
    ctx.setLineDash(zone.kind === "mine" ? [5, 6] : [12, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(zone.x, zone.y, zone.radius * (.9 + Math.sin(game.time * 4) * .04), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  for (const orbital of game.orbitals) {
    const orbitX = orbital.x + Math.cos(orbital.angle) * 24;
    const orbitY = orbital.y + Math.sin(orbital.angle) * 24;
    ctx.fillStyle = orbital.color;
    ctx.shadowBlur = 16;
    ctx.shadowColor = orbital.color;
    ctx.beginPath(); ctx.arc(orbitX, orbitY, 6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawProjectiles() {
  for (const shot of game.playerShots) {
    ctx.save();
    ctx.shadowBlur = shot.charged ? 24 : 14;
    ctx.shadowColor = shot.color;
    if (shot.kind === "grenade") {
      ctx.fillStyle = shot.color;
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff5d0";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius + 4 + Math.sin(game.time * 12) * 2, 0, Math.PI * 2); ctx.stroke();
    } else {
      const speed = Math.hypot(shot.vx, shot.vy) || 1;
      const tail = shot.charged ? 76 : shot.kind === "shrapnel" ? 18 : 38;
      ctx.strokeStyle = shot.color;
      ctx.lineWidth = shot.charged ? 7 : shot.kind === "shrapnel" ? 2 : 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(shot.x - shot.vx / speed * tail, shot.y - shot.vy / speed * tail);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const bullet of game.enemyBullets) {
    ctx.fillStyle = "#ff695d";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff3c36";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawEffects() {
  for (const pulse of game.pulses) {
    const progress = 1 - clamp(pulse.life / pulse.maxLife, 0, 1);
    ctx.globalAlpha = (1 - progress) * .75;
    ctx.strokeStyle = pulse.color;
    ctx.lineWidth = 3 * (1 - progress) + .5;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, 6 + pulse.radius * progress, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const particle of game.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = particle.color;
    ctx.fillStyle = particle.color;
    if (particle.beam) {
      ctx.lineWidth = particle.size;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x + particle.vx, particle.y + particle.vy);
      ctx.stroke();
    } else {
      ctx.fillRect(particle.x - particle.size * .5, particle.y - particle.size * .5, particle.size, particle.size);
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.font = "700 11px monospace";
  for (const floater of game.floaters) {
    ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
}

function drawRoomBanner() {
  if (game.roomBanner <= 0) return;
  const alpha = clamp(game.roomBanner / .5, 0, 1);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#dfe9e7";
  ctx.textAlign = "center";
  ctx.font = "900 26px sans-serif";
  ctx.fillText("B" + Math.ceil(game.room / 5) + " — ROOM " + String(((game.room - 1) % 5) + 1).padStart(2, "0"), game.width * .5, game.height * .49);
  ctx.fillStyle = "#8aa0a2";
  ctx.font = "10px monospace";
  ctx.fillText(roomType(game.room).toUpperCase(), game.width * .5, game.height * .49 + 21);
  ctx.globalAlpha = 1;
}

function drawAimReticle() {
  if (game.mode !== "playing" || !game.player) return;
  const bounds = roomBounds();
  const x = clamp(game.mouse.x, bounds.left + 8, bounds.right - 8);
  const y = clamp(game.mouse.y, bounds.top + 8, bounds.bottom - 8);
  const ready = 1 - clamp(game.player.attackCooldown / game.output.primary.cooldown, 0, 1);
  const radius = game.hitConfirm > 0 ? 13 : 10 + game.missPulse * 18;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = game.hitConfirm > 0 ? "#f6dc66" : ready >= .999 ? CLASS_PROFILES[game.selectedClass].color : "rgba(164,184,187,.72)";
  ctx.lineWidth = game.hitConfirm > 0 ? 2.4 : 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ready);
  ctx.stroke();
  const gap = 5;
  const arm = game.hitConfirm > 0 ? 17 : 14;
  ctx.beginPath();
  ctx.moveTo(-arm, 0); ctx.lineTo(-gap, 0);
  ctx.moveTo(arm, 0); ctx.lineTo(gap, 0);
  ctx.moveTo(0, -arm); ctx.lineTo(0, -gap);
  ctx.moveTo(0, arm); ctx.lineTo(0, gap);
  ctx.stroke();
  if (game.hitConfirm > 0) {
    ctx.beginPath();
    ctx.moveTo(-4, -4); ctx.lineTo(4, 4);
    ctx.moveTo(4, -4); ctx.lineTo(-4, 4);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
  drawArena();
  drawZones();
  drawEnemyTelegraphs();
  for (const enemy of game.enemies) drawEnemy(enemy);
  drawProjectiles();
  if (game.player) drawRobot();
  drawEffects();
  drawRoomBanner();
  ctx.restore();
  drawAimReticle();
}

function formatRoom() {
  return "B" + Math.ceil(game.room / 5) + "-" + String(((game.room - 1) % 5) + 1).padStart(2, "0");
}

function updateHud() {
  if (!game.player) return;
  const xpRatio = clamp(game.xp / game.xpNext, 0, 1);
  const healthRatio = clamp(game.player.hp / game.player.maxHp, 0, 1);
  const attackRatio = 1 - clamp(game.player.attackCooldown / game.output.primary.cooldown, 0, 1);
  const dashRatio = 1 - clamp(game.player.dashCooldown / game.output.guard.dashCooldown, 0, 1);
  $("#health-fill").style.width = clamp(game.player.hp / game.player.maxHp, 0, 1) * 100 + "%";
  $("#health-text").textContent = Math.ceil(game.player.hp) + " / " + game.player.maxHp;
  $("#xp-fill").style.width = xpRatio * 100 + "%";
  $("#xp-text").textContent = game.xp + " / " + game.xpNext;
  $("#level-text").textContent = game.player.level;
  $("#time-text").textContent = formatRoom();
  $("#kill-text").textContent = game.kills;
  $("#danger-text").textContent = game.roomCleared ? "정리 완료" : roomType(game.room);
  $("#objective-text").textContent = game.roomCleared ? "북쪽 출구로 이동" : "적 전멸";
  $("#objective-count").textContent = game.roomCleared ? "GATE OPEN" : game.enemies.length + " TARGET" + (game.enemies.length === 1 ? "" : "S");
  $("#combat-objective").classList.toggle("complete", game.roomCleared);
  $("#attack-ready-fill").style.width = attackRatio * 100 + "%";
  $("#dash-ready-fill").style.width = dashRatio * 100 + "%";
  $("#attack-status").textContent = attackRatio >= .999 ? "READY" : Math.max(0, game.player.attackCooldown).toFixed(1) + "s";
  $("#dash-status").textContent = dashRatio >= .999 ? "READY" : Math.max(0, game.player.dashCooldown).toFixed(1) + "s";
  $("#attack-ability").classList.toggle("ready", attackRatio >= .999);
  $("#dash-ability").classList.toggle("ready", dashRatio >= .999);
  $("#game").classList.toggle("low-health", healthRatio > 0 && healthRatio <= .3 && game.mode === "playing");
  canvas.dataset.combatClass = game.selectedClass;
  canvas.dataset.activeTraits = [...game.output.traits].join(",");
  canvas.dataset.synergies = [...game.output.synergyKinds].join(",");
  canvas.dataset.playerShots = String(game.playerShots.length);
  canvas.dataset.zones = String(game.zones.length);
  canvas.dataset.delayedAttacks = String(game.delayedAttacks.length);
  canvas.dataset.orbitals = String(game.orbitals.length);
}

function updateOutputReadout() {
  const output = game.output || evaluateClassFactory();
  const detail = output.classId === "melee"
    ? "DMG " + Math.round(output.primary.damage) + " · ARC " + Math.round(output.primary.arc) + "° · " + (1 / output.primary.cooldown).toFixed(1) + "/s"
    : output.classId === "sniper"
      ? "DMG " + Math.round(output.primary.damage) + " · RANGE " + Math.round(output.primary.range) + " · " + (1 / output.primary.cooldown).toFixed(1) + "/s"
      : "DMG " + Math.round(output.primary.damage) + " · BLAST " + Math.round(output.primary.blastRadius) + " · " + (1 / output.primary.cooldown).toFixed(1) + "/s";
  $("#lane-readout").innerHTML = '<b>' + output.classProfile.attackName + '</b><span>' + detail + '</span>';
  const mechanics = [...output.traits].map((type) => MODULES[type].name);
  $("#synergy-readout").textContent = output.synergies.length
    ? "조합 · " + output.synergies.map((item) => item.name).join(" + ")
    : mechanics.length ? "활성 · " + mechanics.join(" · ") : "전용 증강 0 / 10 · 인접 조합 대기";
}

function togglePause() {
  if (game.mode === "playing") {
    game.mode = "paused";
    $("#pause-overlay").hidden = false;
  } else if (game.mode === "paused") {
    game.mode = "playing";
    $("#pause-overlay").hidden = true;
  }
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(.033, (now - lastFrame) / 1000);
  lastFrame = now;
  if (game.mode === "playing") update(dt);
  else if (game.mode !== "start") updateEffects(dt);
  draw();
  requestAnimationFrame(frame);
}

$("#start-button").addEventListener("click", startGame);
$(".class-cards").addEventListener("click", (event) => {
  const card = event.target.closest("[data-class]");
  if (card) selectClass(card.dataset.class);
});
$("#restart-button").addEventListener("click", startGame);
$("#change-class-button").addEventListener("click", returnToClassSelection);
$("#factory-toggle").addEventListener("click", () => openFactory(true));
$("#factory-commit").addEventListener("click", commitFactory);
$("#resume-button").addEventListener("click", togglePause);
$("#pause-factory-button").addEventListener("click", () => openFactory(true));
$("#choice-cards").addEventListener("click", (event) => {
  const card = event.target.closest("[data-choice]");
  if (card) previewAugmentChoice(card.dataset.choice);
});
$("#choice-confirm").addEventListener("click", confirmAugmentChoice);

$("#factory-board").addEventListener("click", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (!cell) return;
  const index = Number(cell.dataset.cellIndex);
  if (!isPlaceable(index)) return;
  if (factory.pending) { placePending(index); return; }
  if (factory.selectedIndex !== null) { moveBoardModule(factory.selectedIndex, index); return; }
  if (board[index]) {
    factory.selectedIndex = index;
    renderFactoryBoard();
  }
});

$("#factory-board").addEventListener("dragstart", (event) => {
  const token = event.target.closest("[data-module-id]");
  if (!token) return;
  const moduleId = Number(token.dataset.moduleId);
  const index = board.findIndex((module) => module && module.id === moduleId);
  factory.dragged = index >= 0 ? { kind: "board", index } : null;
  event.dataTransfer.effectAllowed = "move";
});

$("#pending-part").addEventListener("dragstart", (event) => {
  if (!event.target.closest("[data-pending-module]") || !factory.pending) return;
  factory.dragged = { kind: "pending" };
  event.dataTransfer.effectAllowed = "move";
});

$("#factory-board").addEventListener("dragover", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (!cell || !isPlaceable(Number(cell.dataset.cellIndex))) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
});

$("#factory-board").addEventListener("drop", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (!cell || !factory.dragged) return;
  event.preventDefault();
  const target = Number(cell.dataset.cellIndex);
  if (factory.dragged.kind === "pending") placePending(target);
  if (factory.dragged.kind === "board") moveBoardModule(factory.dragged.index, target);
  factory.dragged = null;
});

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Tab"].includes(event.code)) event.preventDefault();
  if (game.mode === "start") {
    const classIndex = ["Digit1", "Digit2", "Digit3"].indexOf(event.code);
    if (classIndex >= 0) {
      selectClass(["melee", "sniper", "artillery"][classIndex]);
      return;
    }
  }
  if (game.mode === "start" && (event.code === "Enter" || event.code === "Space")) {
    startGame();
    return;
  }
  if (game.mode === "choice") {
    const choiceIndex = ["Digit1", "Digit2", "Digit3"].indexOf(event.code);
    if (choiceIndex >= 0) {
      const card = $("#choice-cards").querySelector('[data-choice-index="' + choiceIndex + '"]');
      if (card) previewAugmentChoice(card.dataset.choice);
      return;
    }
    if (event.code === "Enter") {
      confirmAugmentChoice();
      return;
    }
  }
  if (game.mode === "gameover" && (event.code === "KeyR" || event.code === "Enter")) {
    startGame();
    return;
  }
  game.keys.add(event.code);
  if (event.code === "Space" && game.mode === "playing") game.dashRequested = true;
  if (event.code === "KeyJ" && !event.repeat && game.mode === "playing") game.attackRequested = true;
  if (event.code === "KeyE" && game.mode === "playing") tryNextRoom(false);
  if (event.code === "Tab" && game.mode === "playing") openFactory(true);
  if ((event.code === "KeyP" || event.code === "Escape") && ["playing", "paused"].includes(game.mode)) togglePause();
  else if (event.code === "Escape" && game.mode === "factory" && !factory.pending) commitFactory();
  else if (event.code === "Escape" && game.mode === "factory" && factory.pending) {
    $("#board-message").textContent = "신규 부품을 먼저 밝게 표시된 셀에 배치해야 전투로 복귀할 수 있습니다.";
    $("#board-message").className = "board-message warning";
  }
});
window.addEventListener("keyup", (event) => game.keys.delete(event.code));
window.addEventListener("blur", () => game.keys.clear());
canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  game.mouse.x = event.clientX - rect.left;
  game.mouse.y = event.clientY - rect.top;
});
canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0 && game.mode === "playing") game.attackRequested = true;
});
window.addEventListener("resize", resizeCanvas);

if (TEST_MODE) {
  $("#test-panel").hidden = false;
  renderTestModuleButtons();
  $("#test-scrap").addEventListener("click", () => {
    if (game.mode !== "playing") return;
    for (const enemy of [...game.enemies]) killEnemy(enemy);
    game.enemies = [];
    finishRoom();
    updateHud();
  });
  $("#test-level").addEventListener("click", () => {
    if (game.mode !== "playing") return;
    game.xp = game.xpNext;
    game.levelUpQueued = true;
  });
  $("#test-next-room").addEventListener("click", () => {
    if (game.mode !== "playing") return;
    if (!game.doorOpen) {
      for (const enemy of [...game.enemies]) killEnemy(enemy);
      game.enemies = [];
      finishRoom();
    }
    tryNextRoom(true);
  });
  $("#test-module-buttons").addEventListener("click", (event) => {
    const button = event.target.closest("[data-test-module]");
    if (!button || game.mode !== "playing") return;
    factory.pending = { id: factory.nextId++, type: button.dataset.testModule };
    openFactory(false);
  });
}

resizeCanvas();
game.output = evaluateClassFactory();
renderMiniBoard();
updateOutputReadout();
requestAnimationFrame(frame);
