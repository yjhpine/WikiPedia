const $ = (selector) => document.querySelector(selector);
const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");
const uiStage = $("#ui-stage");
const TEST_MODE = new URLSearchParams(window.location.search).has("test");

const UI_LAYOUT_PROFILES = [
  { id: "portrait", maxAspect: .82, width: 520, height: 920 },
  { id: "compact", maxAspect: 1.45, width: 1100, height: 900 },
  { id: "wide", maxAspect: Infinity, width: 1600, height: 900 }
];
const UI_REFERENCE_ANCHORS = [
  { aspect: .72, width: 520, height: 920 },
  { aspect: 1, width: 1100, height: 900 },
  { aspect: 1.25, width: 1100, height: 900 },
  { aspect: 1.6, width: 1600, height: 900 }
];
const UI_SCALE_MIN = .56;
const UI_SCALE_MAX = 1.6;
const COMBAT_TEMPO = Object.freeze({ unitMove: 1.42, attackRate: 1.52, projectile: 1.62 });

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
  m_blood: { classId: "melee", name: "회수 펌프", code: "V", color: "#71efad", description: "근접 공격으로 적을 처치하면 회복 파편을 회수하며 표식 소비·처형 시 추가 회수합니다.", hint: "공격 성공 조건이 생존 자원으로 연결" },
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
    { types: ["m_step", "m_mark"], kind: "first_mark", name: "선제 각인", description: "점멸로 접근한 첫 베기가 대상에게 반대 방향 표식을 미리 새겨 즉시 교차 절단합니다." },
    { types: ["m_mark", "m_blood"], kind: "blood_loop", name: "혈인 순환", description: "표식 소비가 회복과 함께 같은 궤도의 지연 잔상을 한 번 더 남깁니다." },
    { types: ["m_blood", "m_execute"], kind: "harvester", name: "회수 집행", description: "처형 시 내구도를 회수하고 대시를 즉시 다시 사용할 수 있습니다." },
    { types: ["m_execute", "m_spin"], kind: "execution_wheel", name: "처형 회전", description: "마무리 회전 중 처형한 위치에서 작은 회전 참격이 다시 발생합니다." },
    { types: ["m_spin", "m_hook"], kind: "vortex", name: "자력 회오리", description: "회전 참격이 주변 적을 끌어모은 뒤 두 번째 회전을 일으킵니다." },
    { types: ["m_hook", "m_shock"], kind: "compression_break", name: "압축 파쇄", description: "세 번째 충격파가 적을 중심선으로 압축한 뒤 더 넓게 파열합니다." },
    { types: ["m_shock", "m_echo"], kind: "aftershock", name: "잔상 파쇄", description: "대시 잔상도 충격파를 방출해 이동 경로 전체를 공격합니다." },
    { types: ["m_echo", "m_guard"], kind: "phantom_guard", name: "잔상 방벽", description: "대시 잔상이 발동할 때 출발 지점 주변의 적 탄환을 소거합니다." },
    { types: ["m_guard", "m_riposte"], kind: "perfect_counter", name: "완전 반격", description: "탄환 반사 성공 시 복수 회로가 즉시 충전되고 반사탄이 사수를 추적합니다." },
    { types: ["m_riposte", "m_step"], kind: "vengeance_step", name: "복수 추격", description: "반격이 준비되면 점멸 보폭이 마지막 공격자를 우선 추적합니다." }
  ],
  sniper: [
    { types: ["s_ghost", "s_mark"], kind: "dead_center", name: "데드 센터", description: "충전 광선이 적중할 때 전장의 모든 파열 표식을 동시에 폭발시킵니다." },
    { types: ["s_mark", "s_pierce"], kind: "rupture_line", name: "파열 관통선", description: "표식을 파열한 레일탄이 추가 관통력을 얻어 뒤의 적까지 계속 나아갑니다." },
    { types: ["s_pierce", "s_ricochet"], kind: "prism_rail", name: "프리즘 레일", description: "관통을 모두 마친 탄환이 마지막 표적에서 다시 도탄합니다." },
    { types: ["s_ricochet", "s_homing"], kind: "smart_rebound", name: "지능 도탄", description: "첫 도탄이 다음 표적을 추적하고 한 번 더 꺾일 기회를 얻습니다." },
    { types: ["s_homing", "s_twin"], kind: "hound_pair", name: "하운드 페어", description: "쌍열 탄환이 서로 다른 표적을 나누어 지정 추적합니다." },
    { types: ["s_twin", "s_mine"], kind: "crossfire_mine", name: "교차 탄피진", description: "쌍열 사격이 남긴 지뢰가 기폭될 때 사방으로 레일 파편을 발사합니다." },
    { types: ["s_mine", "s_dashload"], kind: "escape_route", name: "탈출 사선", description: "대시 장전 시 출발점에 탄피 지뢰를 추가로 남깁니다." },
    { types: ["s_dashload", "s_freeze"], kind: "cold_escape", name: "빙결 탈출선", description: "대시 장전이 출발 지점에 냉각 지대를 만들고 보조탄도 냉기를 운반합니다." },
    { types: ["s_freeze", "s_drone"], kind: "cold_observer", name: "빙결 관측망", description: "관측 드론이 냉각 지대의 적을 우선 사격하고 적중 지대를 연장합니다." },
    { types: ["s_drone", "s_ghost"], kind: "spectral_observer", name: "유령 관측기", description: "관측 드론의 보조 사격이 충전 광선으로 변해 적을 관통합니다." }
  ],
  artillery: [
    { types: ["a_vacuum", "a_fire"], kind: "inferno_vortex", name: "화염 소용돌이", description: "진공 코어 뒤의 소이 지대가 지속적으로 적을 중심으로 끌어당깁니다." },
    { types: ["a_fire", "a_chain"], kind: "wildfire_chain", name: "들불 기폭", description: "소이 지대에서 죽은 적이 주변으로 작은 연쇄 폭발을 전달합니다." },
    { types: ["a_chain", "a_sticky"], kind: "living_fuse", name: "생체 신관", description: "점착 대상이 죽는 즉시 신관이 커진 범위로 폭발해 연쇄를 이어갑니다." },
    { types: ["a_sticky", "a_cluster"], kind: "parasite_cluster", name: "기생 분열탄", description: "점착 폭발의 소형 유탄이 살아 있는 적을 각각 추적합니다." },
    { types: ["a_cluster", "a_recursive"], kind: "cascade", name: "폭발 캐스케이드", description: "분열 유탄도 한 번씩 잔향 폭발을 남깁니다." },
    { types: ["a_recursive", "a_shrapnel"], kind: "echo_shrapnel", name: "잔향 파편", description: "재귀 폭발도 파편을 방출해 같은 구역을 두 번 절단합니다." },
    { types: ["a_shrapnel", "a_dashbomb"], kind: "breach_field", name: "돌파 지뢰밭", description: "대시 폭탄이 이동 방향으로 집중 파편을 발사합니다." },
    { types: ["a_dashbomb", "a_super"], kind: "nova_mine", name: "초신성 지뢰", description: "세 번째 대시 폭탄이 적 탄환을 지우는 대형 초신성으로 변합니다." },
    { types: ["a_super", "a_orbit"], kind: "planetary", name: "행성 폭격", description: "초신성이 세 개의 궤도탄을 생성해 남은 적을 차례로 추적합니다." },
    { types: ["a_orbit", "a_vacuum"], kind: "gravity_satellite", name: "중력 위성", description: "궤도탄 폭발에도 진공 코어가 전달되어 표적 무리를 끌어당깁니다." }
  ]
};

const PLAYSTYLES = {
  melee: [
    {
      id: "pursuit", name: "추적 처형", color: "#ff7c6b", attackName: "추적 횡베기",
      protocols: ["first_mark", "blood_loop", "harvester", "execution_wheel"],
      identity: "표적 사이를 점멸하며 교차 절단과 처형으로 끊임없이 전진합니다.",
      tiers: ["공격마다 먼 표적에게 돌진", "교차 절단이 추격 잔상을 생성", "처치 시 다음 표적으로 자동 사냥 베기"]
    },
    {
      id: "maelstrom", name: "자력 회오리", color: "#b88cff", attackName: "광역 회오리",
      protocols: ["vortex", "compression_break", "aftershock"],
      identity: "넓은 칼날과 자력으로 적 무리를 한 점에 모아 연속 회전으로 분쇄합니다.",
      tiers: ["모든 베기가 넓은 부채꼴로 확장", "두 번째 공격마다 전방위 회전", "회전 뒤 거대한 잔류 칼날 폭풍"]
    },
    {
      id: "counter", name: "반격 방벽", color: "#71efad", attackName: "방벽 반격",
      protocols: ["phantom_guard", "perfect_counter", "vengeance_step"],
      identity: "베기와 대시를 방어 타이밍으로 바꾸고 막아낸 탄환을 즉시 반격으로 전환합니다.",
      tiers: ["모든 베기가 주변 탄환을 소거", "대시가 방벽 잔상과 반격 충전을 생성", "반격 베기가 추적 파편 세 발을 방출"]
    }
  ],
  sniper: [
    {
      id: "deadeye", name: "관통 데드아이", color: "#f6dc66", attackName: "중관통 광선",
      protocols: ["dead_center", "rupture_line", "prism_rail"],
      identity: "연사 대신 매 발을 굵은 관통 광선으로 바꾸고 정렬된 적과 표식을 한꺼번에 파열합니다.",
      tiers: ["모든 사격이 굵은 관통 광선", "광선 적중이 파열 폭발을 연쇄", "광선이 전장의 모든 표식을 동시 기폭"]
    },
    {
      id: "hunter", name: "하운드 탄막", color: "#69a9ff", attackName: "추적 쌍열",
      protocols: ["smart_rebound", "hound_pair", "crossfire_mine"],
      identity: "한 발을 여러 추적탄으로 분할해 흩어진 표적을 자동으로 물고 늘어집니다.",
      tiers: ["모든 공격이 서로 다른 표적을 노리는 쌍열", "세 번째 추적탄과 추가 도탄", "처치마다 하운드 드론이 후속 광선 발사"]
    },
    {
      id: "ranger", name: "빙결 유격대", color: "#57d8ee", attackName: "기동 냉각탄",
      protocols: ["escape_route", "cold_escape", "cold_observer", "spectral_observer"],
      identity: "대시와 사격 자리에 지뢰·냉각 지대를 남기며 계속 이동하는 구역 통제형 저격수입니다.",
      tiers: ["모든 탄착점에 냉각 지대", "대시가 지뢰와 보조탄을 동시 전개", "대시 후 다음 공격이 세 갈래 유령 사격"]
    }
  ],
  artillery: [
    {
      id: "inferno", name: "중력 화염로", color: "#ff714f", attackName: "중력 소이탄",
      protocols: ["inferno_vortex", "wildfire_chain", "living_fuse"],
      identity: "모든 폭발이 적을 끌어당기는 화염 지대를 만들고 불붙은 적을 연쇄 기폭합니다.",
      tiers: ["모든 폭발이 흡인 화염 지대 생성", "화염 처치가 연쇄 폭발", "화염 지대가 커지고 오래 지속"]
    },
    {
      id: "cascade", name: "파편 캐스케이드", color: "#d9ef59", attackName: "분열 파편탄",
      protocols: ["parasite_cluster", "cascade", "echo_shrapnel"],
      identity: "한 번의 착탄을 분열탄·잔향·방사 파편으로 여러 차례 재생산합니다.",
      tiers: ["모든 폭발이 세 개의 분열탄 생성", "분열탄도 잔향 폭발", "모든 잔향이 방사 파편을 재생산"]
    },
    {
      id: "orbital", name: "기동 궤도포", color: "#71efad", attackName: "궤도 유도탄",
      protocols: ["breach_field", "nova_mine", "planetary", "gravity_satellite"],
      identity: "대시 폭탄과 자동 궤도탄을 쌓아 직접 조준보다 이동 경로로 전장을 포격합니다.",
      tiers: ["모든 폭발이 궤도탄 한 발 충전", "대시마다 초신성 지뢰 투하", "폭발마다 궤도탄 세 발 자동 추적"]
    }
  ]
};

const PLAYSTYLE_BY_PROTOCOL = Object.fromEntries(Object.values(PLAYSTYLES).flat()
  .flatMap((style) => style.protocols.map((kind) => [kind, style])));

const MODULE_RAM = {
  m_mark: 2, m_spin: 3, m_hook: 2, m_echo: 3, m_guard: 2,
  m_execute: 3, m_shock: 3, m_blood: 2, m_step: 3, m_riposte: 2,
  s_pierce: 2, s_ricochet: 3, s_mark: 2, s_homing: 2, s_mine: 2,
  s_dashload: 3, s_twin: 3, s_freeze: 2, s_ghost: 4, s_drone: 3,
  a_sticky: 2, a_fire: 2, a_chain: 3, a_vacuum: 3, a_shrapnel: 3,
  a_recursive: 4, a_dashbomb: 2, a_super: 4, a_cluster: 3, a_orbit: 3
};
const PROTOCOL_RAM = 1;

const RARITIES = {
  common: { id: "common", label: "일반", code: "COMMON", width: 1, height: 1, color: "#a7b8ba" },
  rare: { id: "rare", label: "희귀", code: "RARE", width: 2, height: 2, color: "#69a9ff" },
  legendary: { id: "legendary", label: "전설", code: "LEGENDARY", width: 4, height: 4, color: "#ffbd57" }
};

const TOOLS = {
  router: {
    name: "직선 라우터", code: "→", color: "#58d7d3", ram: 1, tier: 1, unlockRoom: 1, complexity: "BASIC",
    description: "닿아 있는 전방 잭으로 신호를 그대로 통과시킵니다.", tradeoff: "기초 배선 · 손실 없이 연결"
  },
  amplifier: {
    name: "과급 증폭기", code: "+", color: "#ff714f", ram: 1, tier: 1, unlockRoom: 1, complexity: "BASIC", power: 1, heat: .62,
    description: "다음 핵심 증강 하나의 출력만 단순하게 증폭합니다.", tradeoff: "피해·효과 상승 · 짧은 과열"
  },
  focuser: {
    name: "집속 렌즈", code: "◇", color: "#f6dc66", ram: 2, tier: 2, unlockRoom: 3, complexity: "TACTICAL", focus: 1,
    description: "다음 증강을 좁고 먼 정밀 신호로 가공합니다.", tradeoff: "사거리·피해 상승 · 공격 폭 감소"
  },
  splitter: {
    name: "병렬 분배기", code: "Y", color: "#d9ef59", ram: 2, tier: 2, unlockRoom: 4, complexity: "TACTICAL", splitThroughput: .78,
    description: "맞닿은 여러 전방 잭으로 신호를 복제해 병렬 라인을 만듭니다.", tradeoff: "다중 활성 · 갈래당 처리량 78%"
  },
  repeater: {
    name: "위상 리피터", code: "Ⅱ", color: "#a48cff", ram: 3, tier: 3, unlockRoom: 6, complexity: "ADVANCED", echo: 1, heat: .72,
    description: "다음 증강을 지연 복제해 한 번의 입력을 두 번 작동시킵니다.", tradeoff: "후속 공격 생성 · 설계된 과열"
  },
  inverter: {
    name: "극성 반전기", code: "±", color: "#71efad", ram: 3, tier: 3, unlockRoom: 8, complexity: "ADVANCED", utility: 1,
    description: "다음 증강을 제어·방어 회로로 반전해 범위와 생존력을 강화합니다.", tradeoff: "복합 보정 · 직접 피해 감소"
  }
};

const TOOL_TYPES = Object.keys(TOOLS);
const TOOL_TIER_LABELS = { 1: "초기", 2: "중급", 3: "고급" };

function isToolUnlocked(type, room = game.room) {
  return Boolean(TOOLS[type]) && room >= TOOLS[type].unlockRoom;
}

function availableToolTypes(room = game.room) {
  return TOOL_TYPES.filter((type) => isToolUnlocked(type, room));
}

function nextToolUnlock(room = game.room) {
  return TOOL_TYPES.map((type) => TOOLS[type]).filter((tool) => tool.unlockRoom > room)
    .sort((a, b) => a.unlockRoom - b.unlockRoom)[0] || null;
}
const DIRECTIONS = [
  { dc: 1, dr: 0, glyph: "→", name: "오른쪽" },
  { dc: 0, dr: 1, glyph: "↓", name: "아래" },
  { dc: -1, dr: 0, glyph: "←", name: "왼쪽" },
  { dc: 0, dr: -1, glyph: "↑", name: "위" }
];

const ROWS = 5;
const INITIAL_COLS = 11;
const EXTEND_BY = 8;
let boardCols = INITIAL_COLS;
const MAIN_ROW = 2;
const ECHO_ROW = 1;
const GUARD_ROW = 3;
const LANE_NAMES = ["상부 보조선", "상부 공정선", "중앙 버스", "하부 공정선", "하부 보조선"];
const LANE_CODES = ["AUX", "AUX", "BUS IN", "AUX", "AUX"];
const moduleTypes = Object.keys(MODULES);
const MODULE_RARITIES = Object.fromEntries(moduleTypes.map((type, index) => {
  const slot = index % 10;
  return [type, slot < 4 ? "common" : slot < 8 ? "rare" : "legendary"];
}));
const BUS_SOURCE_ID = "bus-source";
const BUS_SOURCE_LABEL = "BUS IN";
const board = Array(boardCols * ROWS).fill(null);
const indexOf = (col, row) => col * ROWS + row;
const positionOf = (index) => ({ col: Math.floor(index / ROWS), row: index % ROWS });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smoothFactor = (speed, dt) => 1 - Math.exp(-speed * dt);
const smoothAngle = (from, to, amount) => from + angleDelta(to, from) * amount;
const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const isPlaceable = (index) => {
  const position = positionOf(index);
  return position.col > 0 && position.col < boardCols && position.row >= 0 && position.row < ROWS;
};

function moduleRarity(type) {
  return RARITIES[MODULE_RARITIES[type] || "common"];
}

function partFootprint(part) {
  if (partKind(part) === "tool") return { width: 1, height: 1, rarity: null };
  const rarity = moduleRarity(part?.type);
  return { width: rarity.width, height: rarity.height, rarity };
}

function footprintIndices(part, anchorIndex) {
  const { col, row } = positionOf(anchorIndex);
  const { width, height } = partFootprint(part);
  const indices = [];
  for (let dc = 0; dc < width; dc += 1) {
    for (let dr = 0; dr < height; dr += 1) indices.push(indexOf(col + dc, row + dr));
  }
  return indices;
}

function partAt(index) {
  for (let anchor = 0; anchor < board.length; anchor += 1) {
    const part = board[anchor];
    if (!part) continue;
    if (footprintIndices(part, anchor).includes(index)) return part;
  }
  return null;
}

function anchorIndexAt(index) {
  for (let anchor = 0; anchor < board.length; anchor += 1) {
    const part = board[anchor];
    if (part && footprintIndices(part, anchor).includes(index)) return anchor;
  }
  return -1;
}

function canPlacePart(index, part, ignorePartId) {
  if (!isPlaceable(index) || !part) return false;
  const { col, row } = positionOf(index);
  const { width, height } = partFootprint(part);
  if (col + width > boardCols || row + height > ROWS) return false;
  return footprintIndices(part, index).every((cellIndex) => {
    const occupant = partAt(cellIndex);
    return !occupant || occupant.id === ignorePartId;
  });
}

const OUTPUT_EDGES = ["top", "right", "bottom"];
const PORT_EDGES = ["top", "right", "bottom", "left"];
const OPPOSITE_EDGE = { top: "bottom", right: "left", bottom: "top", left: "right" };
const EDGE_DELTA = { top: { dc: 0, dr: -1 }, right: { dc: 1, dr: 0 }, bottom: { dc: 0, dr: 1 }, left: { dc: -1, dr: 0 } };

function portSeed(part) {
  const value = String(part?.id ?? 0) + ":" + String(part?.type ?? "");
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function randomAugmentEdges(part) {
  const shuffled = [...OUTPUT_EDGES];
  let seed = portSeed(part);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  const outputCount = 1 + (seed % 2);
  const selected = new Set(shuffled.slice(0, outputCount));
  return PORT_EDGES.filter((edge) => edge === "left" || selected.has(edge));
}

function hasUsableAugmentPorts(part) {
  const edges = part?.ports?.edges;
  return Array.isArray(edges) && edges.length >= 2 && edges.length <= 3 && edges.includes("left") &&
    edges.some((edge) => OUTPUT_EDGES.includes(edge)) && edges.every((edge) => PORT_EDGES.includes(edge));
}

function ensurePartPorts(part) {
  if (!part) return part;
  if (partKind(part) === "tool") {
    part.ports = { layout: "lego-tool-three-way", edges: [...PORT_EDGES] };
    return part;
  }
  if (!hasUsableAugmentPorts(part)) {
    part.ports = { layout: "lego-augment-random", edges: randomAugmentEdges(part) };
  } else {
    part.ports = { layout: "lego-augment-random", edges: PORT_EDGES.filter((edge) => part.ports.edges.includes(edge)) };
  }
  return part;
}

function portOffsets(part, edge) {
  ensurePartPorts(part);
  if (!part.ports.edges.includes(edge)) return [];
  const footprint = partFootprint(part);
  const span = edge === "top" || edge === "bottom" ? footprint.width : footprint.height;
  return Array.from({ length: span }, (_, offset) => offset);
}

function portGridPoint(part, edge, offset) {
  const position = { col: part.col, row: part.row };
  const footprint = partFootprint(part);
  if (edge === "top") return { col: position.col + offset, row: position.row };
  if (edge === "right") return { col: position.col + footprint.width - 1, row: position.row + offset };
  if (edge === "bottom") return { col: position.col + offset, row: position.row + footprint.height - 1 };
  return { col: position.col, row: position.row + offset };
}

function createPart(kind, type) {
  const part = { id: factory.nextId++, kind, type };
  if (kind === "tool") part.dir = 0;
  return ensurePartPorts(part);
}

function wireKey(fromId, toId, fromEdge, fromOffset, toEdge, toOffset) {
  return [fromId, toId, fromEdge, fromOffset, toEdge, toOffset].join(">");
}

function clearWiresFor(partId) {
  factory.wires = factory.wires.filter((wire) => wire.fromId !== partId && wire.toId !== partId);
  if (factory.wireStart?.id === partId) factory.wireStart = null;
}

function circuitId(id) {
  if (id === BUS_SOURCE_ID) return id;
  const numeric = Number(id);
  return Number.isFinite(numeric) && String(numeric) === String(id) ? numeric : id;
}

function findPhysicalPortMatch(fromId, toId, preferred = {}) {
  fromId = circuitId(fromId);
  toId = circuitId(toId);
  const parts = partsOnBoard();
  const fromPart = parts.find((part) => part.id === fromId);
  const toPart = parts.find((part) => part.id === toId);
  if (!toPart || fromId === toId) return null;
  if (fromId === BUS_SOURCE_ID) {
    const toEdge = preferred.toEdge || "left";
    if ((preferred.fromEdge && preferred.fromEdge !== "right") || toEdge !== "left") return null;
    for (const toOffset of portOffsets(toPart, "left")) {
      const toPoint = portGridPoint(toPart, "left", toOffset);
      const fromRow = preferred.fromRow ?? toPoint.row;
      if (toPoint.col === 1 && toPoint.row === fromRow) {
        return { fromId, toId, fromEdge: "right", fromOffset: 0, fromRow, toEdge, toOffset };
      }
    }
    return null;
  }
  if (!fromPart) return null;
  const edgeChoices = preferred.fromEdge ? [preferred.fromEdge] : OUTPUT_EDGES;
  for (const fromEdge of edgeChoices) {
    if (!OUTPUT_EDGES.includes(fromEdge)) continue;
    const toEdge = OPPOSITE_EDGE[fromEdge];
    if (preferred.toEdge && preferred.toEdge !== toEdge) continue;
    const delta = EDGE_DELTA[fromEdge];
    const fromOffsets = preferred.fromOffset === undefined ? portOffsets(fromPart, fromEdge) : [Number(preferred.fromOffset)];
    const toOffsets = preferred.toOffset === undefined ? portOffsets(toPart, toEdge) : [Number(preferred.toOffset)];
    for (const fromOffset of fromOffsets) {
      if (!portOffsets(fromPart, fromEdge).includes(fromOffset)) continue;
      const fromPoint = portGridPoint(fromPart, fromEdge, fromOffset);
      for (const toOffset of toOffsets) {
        if (!portOffsets(toPart, toEdge).includes(toOffset)) continue;
        const toPoint = portGridPoint(toPart, toEdge, toOffset);
        if (toPoint.col === fromPoint.col + delta.dc && toPoint.row === fromPoint.row + delta.dr) {
          return { fromId, toId, fromEdge, fromOffset, toEdge, toOffset };
        }
      }
    }
  }
  return null;
}

function connectPorts(fromId, toId, preferred) {
  fromId = circuitId(fromId);
  toId = circuitId(toId);
  if (!fromId || !toId || fromId === toId || toId === BUS_SOURCE_ID) return false;
  const match = findPhysicalPortMatch(fromId, toId, preferred);
  if (!match) return false;
  factory.wires = factory.wires.filter((wire) => wire.toId !== toId && wireKey(wire.fromId, wire.toId, wire.fromEdge, wire.fromOffset, wire.toEdge, wire.toOffset) !== wireKey(match.fromId, match.toId, match.fromEdge, match.fromOffset, match.toEdge, match.toOffset));
  factory.wires.push({ id: factory.nextWireId++, ...match });
  return true;
}

function rebuildPhysicalWires() {
  const parts = partsOnBoard().sort((a, b) => a.col - b.col || a.row - b.row || a.id - b.id);
  factory.wires = [];
  for (const target of parts) connectPorts(BUS_SOURCE_ID, target.id);
  for (const from of parts) {
    for (const target of parts) {
      if (from.id !== target.id) connectPorts(from.id, target.id);
    }
  }
}

function disconnectWire(wireId) {
  const before = factory.wires.length;
  factory.wires = factory.wires.filter((wire) => wire.id !== wireId);
  return factory.wires.length !== before;
}

function ramCapacity() {
  const level = game.player?.level || 1;
  return Math.min(24, 8 + level * 2);
}

function ramUsage(output) {
  const partCost = partsOnBoard().reduce((total, part) => total + partRamCost(part), 0);
  return partCost + (output || evaluateClassFactory()).protocolRoutes.length * PROTOCOL_RAM;
}

function pendingPlacementUsage(index, type) {
  const pending = typeof type === "string" ? { id: -1, kind: "module", type } : type;
  if (!canPlacePart(index, pending)) return Infinity;
  const savedWires = factory.wires.slice();
  board[index] = pending;
  rebuildPhysicalWires();
  const projected = ramUsage(evaluateClassFactory());
  board[index] = null;
  factory.wires = savedWires;
  return projected;
}

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

function flashCriticalFeedback() {
  const flash = $("#critical-flash");
  flash.classList.remove("critical");
  void flash.offsetWidth;
  flash.classList.add("critical");
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
  pending: null, selectedIndex: null, dragged: null, pointerCandidate: null, ignoreBoardClickUntil: 0, manual: false,
  choiceSelection: null, lastPlacedId: null, placementNotice: null, reserve: [],
  wires: [], wireStart: null, toolInventory: Object.fromEntries(TOOL_TYPES.map((type) => [type, 0])),
  nextId: 1, nextWireId: 1
};
const game = {
  mode: "start", selectedClass: null, width: innerWidth, height: innerHeight, time: 0, room: 1,
  kills: 0, xp: 0, xpNext: 28, levelUpQueued: false, roomCleared: false,
  doorOpen: false, doorPulse: 0, roomBanner: 0, player: null, enemies: [],
  enemyBullets: [], playerShots: [], zones: [], delayedAttacks: [], orbitals: [], toolDrops: [],
  particles: [], floaters: [], echoes: [], keys: new Set(),
  mouse: { x: innerWidth * .7, y: innerHeight * .5 }, dashRequested: false,
  attackRequested: false, output: null, nextEnemyId: 1, shake: 0, hitStop: 0, criticalHits: 0,
  pulses: [], hitConfirm: 0, missPulse: 0, augmentEvents: {}, protocolEvents: {},
  cameraOffsetX: 0, cameraOffsetY: 0, cursorX: innerWidth * .7, cursorY: innerHeight * .5,
  nextDropId: 1
};
let toastTimer = 0;

function extendBoard() {
  const previousLength = board.length;
  boardCols += EXTEND_BY;
  board.length = boardCols * ROWS;
  board.fill(null, previousLength);
  return boardCols;
}

function ensureBoardSpace(usedCol) {
  if (usedCol < boardCols - 3) return false;
  extendBoard();
  return true;
}

function partKind(part) {
  return part?.kind === "tool" || TOOLS[part?.type] ? "tool" : "module";
}

function partDefinition(part) {
  return partKind(part) === "tool" ? TOOLS[part.type] : MODULES[part.type];
}

function partRamCost(part) {
  return partKind(part) === "tool" ? (TOOLS[part.type]?.ram || 0) : (MODULE_RAM[part.type] || 1);
}

function partsOnBoard() {
  return board.flatMap((part, index) => {
    if (!part) return [];
    ensurePartPorts(part);
    return [{ ...part, kind: partKind(part), index, ...positionOf(index), ...partFootprint(part) }];
  });
}

function modulesOnBoard() {
  return partsOnBoard().filter((part) => part.kind === "module");
}

function toolsOnBoard() {
  return partsOnBoard().filter((part) => part.kind === "tool");
}

function createAttackProfile(name, damage, range, arc) {
  return {
    name, damage, range, arc, cooldown: .5, knockback: 24, stun: .08,
    burn: 0, bleed: 0, chain: 0, crit: .12, critMultiplier: 2,
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

function playstylesForModule(type, classId) {
  const kinds = (SYNERGY_DEFINITIONS[classId] || [])
    .filter((protocol) => protocol.types.includes(type)).map((protocol) => protocol.kind);
  return [...new Map(kinds.map((kind) => {
    const style = PLAYSTYLE_BY_PROTOCOL[kind];
    return style ? [style.id, style] : null;
  }).filter(Boolean)).values()];
}

function findClassSynergy(typeA, typeB, classId) {
  return (SYNERGY_DEFINITIONS[classId] || []).find((item) => item.types[0] === typeA && item.types[1] === typeB) || null;
}

function evaluateLineReactors(protocolRoutes) {
  const adjacency = new Map();
  const incomingIds = new Set(protocolRoutes.map((route) => route.toId));
  for (const route of protocolRoutes) {
    if (!adjacency.has(route.fromId)) adjacency.set(route.fromId, []);
    adjacency.get(route.fromId).push(route);
  }
  const starters = protocolRoutes.filter((route) => !incomingIds.has(route.fromId));
  const chains = [];
  const signatures = new Set();
  function walk(route, chain, visited) {
    const routeKey = route.fromId + ">" + route.toId;
    if (visited.has(routeKey)) return;
    const nextChain = [...chain, route];
    const nextVisited = new Set(visited).add(routeKey);
    const nextRoutes = (adjacency.get(route.toId) || []).filter((next) => !nextVisited.has(next.fromId + ">" + next.toId));
    if (!nextRoutes.length) {
      const signature = nextChain.map((item) => item.fromId + ">" + item.toId).join("|");
      if (!signatures.has(signature)) {
        signatures.add(signature);
        chains.push(nextChain);
      }
      return;
    }
    nextRoutes.forEach((next) => walk(next, nextChain, nextVisited));
  }
  (starters.length ? starters : protocolRoutes).forEach((route) => walk(route, [], new Set()));
  const reactors = chains.map((routes) => {
    const styleScores = new Map();
    for (const route of routes) {
      const style = PLAYSTYLE_BY_PROTOCOL[route.kind];
      if (style) styleScores.set(style.id, (styleScores.get(style.id) || 0) + 1);
    }
    const firstStyle = PLAYSTYLE_BY_PROTOCOL[routes[0].kind];
    const style = [...styleScores.entries()].sort((a, b) => b[1] - a[1])[0];
    const resolvedStyle = Object.values(PLAYSTYLES).flat().find((item) => item.id === style?.[0]) || firstStyle;
    return {
      row: routes[0].fromRow, startCol: routes[0].fromCol, endCol: routes[routes.length - 1].toCol,
      links: routes.length, depth: routes.length + 1, tier: Math.min(3, routes.length),
      cohesion: style?.[1] || 0, routes, style: resolvedStyle,
      moduleIds: new Set(routes.flatMap((route) => [route.fromId, route.toId]))
    };
  });
  reactors.sort((a, b) => b.links - a.links || b.cohesion - a.cohesion || a.row - b.row || a.startCol - b.startCol);
  return { reactors, dominant: reactors[0] || null };
}

function emptyProcessState() {
  return { power: 0, echo: 0, focus: 0, inverted: false, heat: 0 };
}

function recipeMode(recipe) {
  if (recipe.inverted) return "UTILITY";
  if (recipe.echo) return "ECHO";
  if (recipe.power) return "OVERDRIVE";
  if (recipe.focus) return "PRECISION";
  if (recipe.feeds > 1) return "MERGED";
  return "RAW";
}

function buildFactoryTuning(recipes, activeTools) {
  const list = [...recipes.values()];
  const divisor = Math.max(1, list.length);
  const throughput = list.length ? list.reduce((sum, recipe) => sum + recipe.throughput, 0) / divisor : 0;
  const power = list.reduce((sum, recipe) => sum + recipe.power, 0) / divisor;
  const echo = list.reduce((maximum, recipe) => Math.max(maximum, recipe.echo), 0);
  const focus = list.reduce((sum, recipe) => sum + recipe.focus, 0) / divisor;
  const utility = list.reduce((sum, recipe) => sum + Number(recipe.inverted), 0) / divisor;
  const heat = list.reduce((sum, recipe) => sum + recipe.heat, 0) / divisor;
  const splitters = activeTools.filter((tool) => tool.type === "splitter").length;
  const damageMult = list.length ? clamp(throughput * (1 + power * .32 + focus * .18 - utility * .18), .45, 2.4) : 1;
  const cooldownMult = 1 + heat * .12 + echo * .1;
  const rangeMult = 1 + focus * .18;
  const areaMult = clamp(1 - focus * .14 + utility * .22, .6, 1.75);
  const controlMult = 1 + utility * .45;
  const mode = utility >= .5 ? "CONTROL" : echo ? "ECHO" : power >= .35 ? "OVERDRIVE" : focus >= .35 ? "PRECISION" : splitters ? "PARALLEL" : "RAW";
  return { throughput, power, echo, focus, utility, heat, splitters, damageMult, cooldownMult, rangeMult, areaMult, controlMult, mode };
}

function operationalCircuit(parts) {
  const partIds = new Set(parts.map((part) => part.id));
  const validWires = factory.wires.filter((wire) =>
    (wire.fromId === BUS_SOURCE_ID || partIds.has(wire.fromId)) &&
    partIds.has(wire.toId) && wire.fromId !== wire.toId
  );
  const outgoing = new Map();
  const incoming = new Map();
  for (const wire of validWires) {
    if (!outgoing.has(wire.fromId)) outgoing.set(wire.fromId, []);
    if (!incoming.has(wire.toId)) incoming.set(wire.toId, []);
    outgoing.get(wire.fromId).push(wire);
    incoming.get(wire.toId).push(wire);
  }
  const fromSource = new Set([BUS_SOURCE_ID]);
  const forwardQueue = [BUS_SOURCE_ID];
  while (forwardQueue.length) {
    const id = forwardQueue.shift();
    for (const wire of outgoing.get(id) || []) {
      if (!fromSource.has(wire.toId)) {
        fromSource.add(wire.toId);
        forwardQueue.push(wire.toId);
      }
    }
  }
  const operationalIds = new Set(parts.filter((part) => fromSource.has(part.id)).map((part) => part.id));
  return { validWires, outgoing, incoming, fromSource, operationalIds };
}

function evaluateClassFactory() {
  const classId = game.selectedClass || "melee";
  const classProfile = CLASS_PROFILES[classId];
  const parts = partsOnBoard();
  const partById = new Map(parts.map((part) => [part.id, part]));
  const placedModules = parts.filter((part) => part.kind === "module" && MODULES[part.type]?.classId === classId);
  const placedTools = parts.filter((part) => part.kind === "tool");
  const statuses = new Map(parts.map((part) => [part.id, "inactive"]));
  const activeIds = new Set();
  const activeToolIds = new Set();
  const activeTypes = new Set();
  const recipes = new Map();
  const flowDirections = new Map();
  const protocolRoutes = [];
  const protocolKeys = new Set();
  const circuit = operationalCircuit(parts);
  const queue = (circuit.outgoing.get(BUS_SOURCE_ID) || [])
    .filter((wire) => circuit.operationalIds.has(wire.toId))
    .map((wire) => ({ wire, lastModule: null, mods: emptyProcessState(), throughput: 1, toolIds: [], path: [] }));
  const visited = new Set();
  let processed = 0;

  while (queue.length && processed < 400) {
    const signal = queue.shift();
    const part = partById.get(signal.wire.toId);
    if (!part || !circuit.operationalIds.has(part.id) || signal.throughput < .16) continue;
    const visitKey = [signal.wire.id, signal.lastModule?.id || 0, signal.mods.power, signal.mods.echo, signal.mods.focus,
      Number(signal.mods.inverted), signal.throughput.toFixed(2)].join(":");
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);
    processed += 1;
    if (!flowDirections.has(part.id)) flowDirections.set(part.id, new Set([0]));

    if (part.kind === "module") {
      if (MODULES[part.type]?.classId !== classId) continue;
      activeIds.add(part.id);
      activeTypes.add(part.type);
      const previous = recipes.get(part.id) || {
        id: part.id, type: part.type, feeds: 0, throughput: 0, power: 0, echo: 0, focus: 0,
        inverted: false, heat: 0, toolIds: new Set()
      };
      previous.feeds += 1;
      previous.throughput = Math.min(1.5, previous.throughput + signal.throughput);
      previous.power = Math.max(previous.power, signal.mods.power);
      previous.echo = Math.max(previous.echo, signal.mods.echo);
      previous.focus = Math.max(previous.focus, signal.mods.focus);
      previous.inverted ||= signal.mods.inverted;
      previous.heat = Math.max(previous.heat, signal.mods.heat);
      signal.toolIds.forEach((id) => previous.toolIds.add(id));
      previous.mode = recipeMode(previous);
      recipes.set(part.id, previous);
      statuses.set(part.id, previous.mode.toLowerCase());

      if (signal.lastModule) {
        const synergy = findClassSynergy(signal.lastModule.type, part.type, classId);
        const routeKey = signal.lastModule.id + ">" + part.id;
        if (synergy && !protocolKeys.has(routeKey)) {
          protocolKeys.add(routeKey);
          protocolRoutes.push({
            kind: synergy.kind, fromId: signal.lastModule.id, toId: part.id,
            fromRow: signal.lastModule.row, fromCol: signal.lastModule.col, toRow: part.row, toCol: part.col,
            row: signal.lastModule.row, col: signal.lastModule.col, path: [...signal.path, part.id], toolIds: [...signal.toolIds]
          });
        }
      }
      const next = { lastModule: part, mods: emptyProcessState(), toolIds: [], path: [] };
      for (const wire of circuit.outgoing.get(part.id) || []) {
        if (circuit.operationalIds.has(wire.toId)) queue.push({ ...next, wire, throughput: signal.throughput });
      }
      continue;
    }

    const tool = TOOLS[part.type];
    if (!tool) continue;
    activeToolIds.add(part.id);
    statuses.set(part.id, "tool-active");
    const nextMods = { ...signal.mods };
    if (part.type === "amplifier") { nextMods.power += tool.power || 1; nextMods.heat += tool.heat || 0; }
    if (part.type === "repeater") { nextMods.echo += tool.echo || 1; nextMods.heat += tool.heat || 0; }
    if (part.type === "focuser") nextMods.focus += tool.focus || 1;
    if (part.type === "inverter") nextMods.inverted = !nextMods.inverted;
    const nextWires = (circuit.outgoing.get(part.id) || []).filter((wire) => circuit.operationalIds.has(wire.toId));
    const throughput = part.type === "splitter" && nextWires.length > 1 ? signal.throughput * (tool.splitThroughput || .72) : signal.throughput;
    for (const wire of nextWires) {
      queue.push({ wire, lastModule: signal.lastModule, mods: { ...nextMods }, throughput, toolIds: [...signal.toolIds, part.id], path: [...signal.path, part.id] });
    }
  }

  const activeTools = placedTools.filter((tool) => activeToolIds.has(tool.id));
  const tuning = buildFactoryTuning(recipes, activeTools);
  const primary = createAttackProfile(classProfile.attackName, classProfile.damage, classProfile.range, classProfile.arc);
  primary.damage = Math.round(primary.damage * tuning.damageMult * 10) / 10;
  primary.cooldown = classProfile.cooldown * tuning.cooldownMult / COMBAT_TEMPO.attackRate;
  primary.range *= tuning.rangeMult;
  primary.arc *= tuning.areaMult;
  primary.stun *= tuning.controlMult;
  const classCritBonus = classId === "sniper" ? .06 : classId === "artillery" ? .04 : .025;
  primary.crit = clamp(.12 + classCritBonus + tuning.focus * .045 + tuning.power * .025, .12, .42);
  primary.critMultiplier = 2 + tuning.power * .13 + tuning.focus * .08;
  primary.classId = classId;
  primary.modules = new Set(activeIds);
  primary.blastRadius = classId === "artillery" ? 86 * tuning.areaMult : 0;
  const echo = createAttackProfile("조합 프로토콜", Math.round(classProfile.damage * .55), classProfile.range, classProfile.arc);
  echo.cooldown = 0;
  echo.crit = Math.max(.04, primary.crit * .65);
  echo.critMultiplier = primary.critMultiplier;
  echo.modules = new Set(activeIds);
  const guard = createGuardProfile();
  guard.modules = new Set(placedModules.filter((module) => activeIds.has(module.id)).map((module) => module.id));
  guard.maxHpBonus += Math.round(tuning.utility * 24);
  guard.armor += tuning.utility * .12;
  guard.dashCooldown *= 1 - tuning.utility * .16;
  const synergies = [];
  const synergyKinds = new Set();
  const synergyModuleIds = new Set();
  const outgoingModuleIds = new Set();
  for (const route of protocolRoutes) {
    const synergy = (SYNERGY_DEFINITIONS[classId] || []).find((item) => item.kind === route.kind);
    if (!synergy) continue;
    synergyModuleIds.add(route.fromId);
    synergyModuleIds.add(route.toId);
    outgoingModuleIds.add(route.fromId);
    if (!synergyKinds.has(synergy.kind)) {
      synergyKinds.add(synergy.kind);
      synergies.push({ kind: synergy.kind, name: synergy.name, description: synergy.description });
    }
  }
  const lineReactors = evaluateLineReactors(protocolRoutes);
  const sequenceDepth = lineReactors.reactors.reduce((maximum, reactor) => Math.max(maximum, reactor.depth), 0);
  const build = lineReactors.dominant ? {
    id: lineReactors.dominant.style.id, name: lineReactors.dominant.style.name, color: lineReactors.dominant.style.color,
    attackName: lineReactors.dominant.style.attackName, identity: lineReactors.dominant.style.identity,
    tiers: lineReactors.dominant.style.tiers, tier: lineReactors.dominant.tier, depth: lineReactors.dominant.depth,
    row: lineReactors.dominant.row, moduleIds: lineReactors.dominant.moduleIds
  } : null;
  return {
    primary, echo, guard, classId, classProfile, traits: activeTypes, synergyKinds, synergyModuleIds, outgoingModuleIds,
    statuses, synergies, protocolRoutes, sequenceDepth, reactors: lineReactors.reactors, build,
    recipes, tuning, flowDirections, activeToolIds, activeCount: activeIds.size,
    inactiveCount: placedModules.length - activeIds.size, placedToolCount: placedTools.length, activeToolCount: activeTools.length,
    wires: circuit.validWires, operationalIds: circuit.operationalIds, connectedCount: circuit.operationalIds.size
  };
}
function portStyle(edge, offset, footprint) {
  const horizontal = edge === "top" || edge === "bottom";
  const percentage = (offset + .5) / (horizontal ? footprint.width : footprint.height) * 100;
  const left = edge === "left" ? 0 : edge === "right" ? 100 : percentage;
  const top = edge === "top" ? 0 : edge === "bottom" ? 100 : percentage;
  return "--port-left:" + left.toFixed(2) + "%;--port-top:" + top.toFixed(2) + "%";
}

function footprintCssSize(cells) {
  return "calc(var(--cell) * " + cells + " + var(--board-gap, 4px) * " + Math.max(0, cells - 1) + " - 8px)";
}

function portPads(part) {
  const footprint = partFootprint(part);
  const kind = partKind(part);
  const edges = PORT_EDGES.filter((edge) => portOffsets(part, edge).length);
  return edges.flatMap((edge) => portOffsets(part, edge).map((offset) => {
    const direction = edge === "left" ? "input" : "output";
    const label = edge === "left" ? "BUS 입력" : edge + " 방향 출력";
    const jackKind = kind === "tool" ? "tool-jack" : "augment-jack";
    return '<span class="circuit-port jack ' + jackKind + ' ' + direction + ' edge-' + edge + '" data-port-owner="' + part.id + '" data-port-kind="jack" data-port-edge="' + edge + '" data-port-offset="' + offset + '" style="' + portStyle(edge, offset, footprint) + '" aria-label="' + partDefinition(part).name + ' ' + label + ' 패드"></span>';
  })).join("");
}

function partToken(part, status, index) {
  const kind = partKind(part);
  const def = partDefinition(part);
  const footprint = partFootprint(part);
  const rarity = footprint.rarity;
  const isNew = part.id === factory.lastPlacedId ? " is-new" : "";
  const actionLabel = kind === "tool" ? "도구 인벤토리 회수" : "보관함으로 회수";
  const tokenClass = kind === "tool" ? "tool-token" : "module-token module-" + part.type;
  const sizeLabel = footprint.width + "×" + footprint.height;
  return '<div class="' + tokenClass + ' footprint-' + sizeLabel + ' size-' + footprint.width + ' ' + status + isNew + '" draggable="false" data-part-id="' +
    part.id + '" data-label="' + def.name + (rarity ? " · " + rarity.label + " " + sizeLabel : " · 공정 도구") + '" style="--module-color:' + def.color + ';--footprint-w:' + footprint.width + ';--footprint-h:' + footprint.height + ';--footprint-width:' + footprintCssSize(footprint.width) + ';--footprint-height:' + footprintCssSize(footprint.height) + '">' +
    '<span class="part-type">' + (kind === "tool" ? "PROCESS TOOL" : "AUGMENT NODE") + '</span><span class="part-code">' + def.code + '</span><span class="part-name">' + def.name + '</span>' +
    (rarity ? '<span class="rarity-badge" style="--rarity-color:' + rarity.color + '">' + rarity.label + ' ' + sizeLabel + '</span>' : '<span class="rarity-badge tool-badge">DROP</span>') +
    '<span class="module-ram">' + partRamCost(part) + 'R</span>' + portPads(part) +
    '<button class="module-store" type="button" data-store-index="' + index + '" aria-label="' + def.name + ' ' + actionLabel + '" title="' + actionLabel + '">PICK</button></div>';
}

function renderPendingPart() {
  const target = $("#pending-part");
  if (!factory.pending) {
    target.innerHTML = '<div class="pending-empty">신규 부품 없음<br />보관 부품·드랍 도구를 배치할 수 있습니다.</div>';
    $("#pending-archive").hidden = true;
    return;
  }
  const def = partDefinition(factory.pending);
  const isTool = partKind(factory.pending) === "tool";
  const footprint = partFootprint(factory.pending);
  const rarity = footprint.rarity;
  const toolTier = isTool ? TOOLS[factory.pending.type].tier : 0;
  target.innerHTML = '<div class="pending-module ' + (isTool ? "pending-tool" : "module-" + factory.pending.type) +
    '" draggable="false" data-pending-module="true" style="--module-color:' + def.color + '"><div class="module-large-icon">' + def.code + '</div><b>' + (isTool ? "T" + toolTier + " " : "") + def.name + ' · ' + partRamCost(factory.pending) + ' RAM' +
    '</b><span>' + (rarity ? rarity.label + ' ' + footprint.width + '×' + footprint.height + ' · 상·우·하 방향 레고 잭' : '드랍 공정 도구 · 빈 셀로 끌어 놓기') + '</span><span>' + def.description + '</span></div>';
  $("#pending-archive").textContent = isTool ? "드랍 도구 선택 취소" : "장착하지 않고 보관";
  $("#pending-archive").hidden = false;
}

function renderToolPalette() {
  const target = $("#factory-tools");
  const total = TOOL_TYPES.reduce((sum, type) => sum + (factory.toolInventory[type] || 0), 0);
  const label = document.querySelector(".tool-palette > header span");
  const next = nextToolUnlock();
  if (label) label.textContent = "R" + game.room + " · " + total + " DROPS" + (next ? " · NEXT R" + next.unlockRoom : " · ALL OPEN");
  target.innerHTML = TOOL_TYPES.map((type) => {
    const tool = TOOLS[type];
    const count = factory.toolInventory[type] || 0;
    const unlocked = isToolUnlocked(type);
    const selected = factory.pending?.kind === "tool" && factory.pending.type === type;
    const state = !unlocked ? " locked" : selected ? " selected" : "";
    const availability = !unlocked || !count ? "disabled" : "";
    const detail = unlocked ? tool.tradeoff : "R" + tool.unlockRoom + " 도달 시 해금";
    return '<button type="button" data-tool-type="' + type + '" draggable="false" class="tool-tier-' + tool.tier + state +
      '" style="--tool-color:' + tool.color + '" aria-pressed="' + selected + '" ' + availability + ' title="' + tool.description + '"><b>' + tool.code + '</b><span>' + tool.name +
      '</span><em>' + (unlocked ? "×" + count : "LOCK") + '</em><small>T' + tool.tier + " " + TOOL_TIER_LABELS[tool.tier] + " · " + tool.complexity + "<br>" + detail + '</small></button>';
  }).join("");
}

function renderReserveParts() {
  const target = $("#reserve-parts");
  $(".reserve-shelf > header span").textContent = factory.reserve.length + " PART · REDEPLOY";
  target.innerHTML = factory.reserve.length
    ? factory.reserve.map((module) => {
      const def = MODULES[module.type];
      const footprint = partFootprint(module);
      const rarity = footprint.rarity;
      return '<button type="button" draggable="false" data-reserve-id="' + module.id + '" style="--module-color:' + def.color + '" title="' + def.description + '"><b>' + def.code + '</b><span>' + def.name + ' · ' + rarity.label + ' ' + footprint.width + '×' + footprint.height + '</span><em>' + MODULE_RAM[module.type] + ' RAM</em></button>';
    }).join("")
    : '<span class="reserve-empty">비어 있음</span>';
}
function outputChangeSummary(previous, next) {
  if (!previous) return "새 생산 라인이 적용되었습니다.";
  if (previous.tuning?.mode !== next.tuning?.mode) {
    return "공정 모드 " + next.tuning.mode + " · 피해 ×" + next.tuning.damageMult.toFixed(2) + " · 처리량 " + Math.round(next.tuning.throughput * 100) + "%";
  }
  if (previous.build?.id !== next.build?.id || previous.build?.tier !== next.build?.tier) {
    if (!next.build) return "주력 리액터가 해제되어 기본 전투 규칙으로 복귀합니다.";
    return next.build.name + " TIER " + ["0", "I", "II", "III"][next.build.tier] + " · " + next.build.tiers[next.build.tier - 1];
  }
  const mechanics = [...next.traits].filter((type) => !previous.traits?.has(type)).map((type) => MODULES[type].name);
  const combos = next.synergies.filter((item) => !previous.synergyKinds?.has(item.kind)).map((item) => item.name);
  if (combos.length) return "순서 프로토콜 · " + combos.join(" + ");
  if (mechanics.length) return "새 행동 해금 · " + mechanics.join(" + ");
  return "행동 조합 배치가 변경되었습니다.";
}

function renderCircuitWires(output) {
  const boardElement = $("#factory-board");
  if (!boardElement?.getBoundingClientRect || !boardElement.querySelector) return;
  const boardRect = boardElement.getBoundingClientRect();
  if (!boardRect.width || !boardRect.height) return;
  const portCenter = (owner, edge, offset, row) => {
    const sourceRow = row === undefined ? "" : '[data-port-row="' + row + '"]';
    const port = boardElement.querySelector('[data-port-owner="' + owner + '"][data-port-edge="' + edge + '"][data-port-offset="' + offset + '"]' + sourceRow);
    if (!port?.getBoundingClientRect) return null;
    const rect = port.getBoundingClientRect();
    return { x: rect.left - boardRect.left + rect.width * .5, y: rect.top - boardRect.top + rect.height * .5 };
  };
  const paths = output.wires.map((wire) => {
    const from = portCenter(wire.fromId, wire.fromEdge, wire.fromOffset, wire.fromRow);
    const to = portCenter(wire.toId, wire.toEdge, wire.toOffset);
    if (!from || !to) return "";
    const midpoint = from.x + (to.x - from.x) * .5;
    const active = (wire.fromId === BUS_SOURCE_ID || output.operationalIds.has(wire.fromId)) && output.operationalIds.has(wire.toId);
    const selected = factory.wireStart?.id === wire.fromId;
    const pathData = "M " + from.x.toFixed(1) + " " + from.y.toFixed(1) + " H " + midpoint.toFixed(1) + " V " + to.y.toFixed(1) + " H " + to.x.toFixed(1);
    return '<path class="circuit-wire ' + (active ? "active" : "inactive") + (selected ? " selected" : "") + '" d="' + pathData + '"></path>';
  }).join("");
  if (paths) boardElement.insertAdjacentHTML("beforeend", '<svg class="circuit-wires" viewBox="0 0 ' + boardRect.width + ' ' + boardRect.height + '" aria-label="증강 회로 연결">' + paths + '</svg>');
}

function renderFactoryBoard() {
  const output = evaluateClassFactory();
  const boardElement = $("#factory-board");
  const labelsElement = $(".board-column-labels");
  boardElement.style.setProperty("--board-cols", boardCols);
  boardElement.style.setProperty("--reactor-color", output.build?.color || CLASS_PROFILES[game.selectedClass].color);
  labelsElement.style.setProperty("--board-cols", boardCols);
  boardElement.innerHTML = Array.from({ length: ROWS * boardCols }, (_, order) => {
    const position = { col: order % boardCols, row: Math.floor(order / boardCols) };
    const index = indexOf(position.col, position.row);
    const fixed = position.col === 0;
    const laneClass = position.row === MAIN_ROW ? "main-lane" : position.row === ECHO_ROW || position.row === GUARD_ROW ? "branch-lane" : "service-lane";
    const part = partAt(index);
    const anchor = part ? anchorIndexAt(index) : -1;
    const isAnchor = anchor === index;
    const powered = Boolean(part && output.statuses.get(part.id) !== "inactive");
    const sequenceOut = Boolean(part && output.outgoingModuleIds.has(part.id));
    const reactorCore = Boolean(part && output.build?.moduleIds.has(part.id));
    const selected = factory.selectedIndex === anchor;
    const projectedRam = factory.pending ? pendingPlacementUsage(index, factory.pending, output) : 0;
    const validTarget = Boolean(factory.pending) && !fixed && canPlacePart(index, factory.pending) && projectedRam <= ramCapacity();
    const invalidTarget = Boolean(factory.pending) && !fixed && !validTarget;
    let fixedText = "";
    if (position.col === 0) {
      fixedText = (position.row === MAIN_ROW ? '<span class="fixed-node"><b>' + BUS_SOURCE_LABEL + '</b><small>LEGO RAIL</small></span>' : '') +
        '<span class="circuit-port output bus-port" data-port-owner="' + BUS_SOURCE_ID + '" data-port-kind="source" data-port-edge="right" data-port-offset="0" data-port-row="' + position.row + '" style="' + portStyle("right", 0, { width: 1, height: 1 }) + '" aria-label="BUS 신호 레일 ' + LANE_NAMES[position.row] + '"></span>';
    }
    const status = part ? output.statuses.get(part.id) : "";
    return '<div class="factory-cell ' + laneClass + (part ? " occupied" : "") + (powered ? " powered" : "") + (sequenceOut ? " sequence-out" : "") +
      (reactorCore ? " reactor-core" : "") + (fixed ? " fixed" : "") + (selected ? " selected" : "") + (validTarget ? " valid-target" : "") +
      (invalidTarget ? " invalid-target" : "") + '" data-cell-index="' + index + '" aria-label="' + LANE_NAMES[position.row] + ' ' + (position.col + 1) + '열">' +
      fixedText + (isAnchor ? partToken(part, status, index) : "") + '</div>';
  }).join("");
  renderCircuitWires(output);
  renderPendingPart();
  renderReserveParts();
  renderToolPalette();
  const mechanicNames = [...output.traits].map((type) => MODULES[type].name);
  const build = output.build;
  const usedRam = ramUsage(output);
  const capacity = ramCapacity();
  const freeRam = capacity - usedRam;
  const moduleCost = modulesOnBoard().reduce((sum, module) => sum + partRamCost(module), 0);
  const toolCost = toolsOnBoard().reduce((sum, tool) => sum + partRamCost(tool), 0);
  const tuning = output.tuning;
  const tuningSummary = '<article class="lane-summary tuning-summary" style="--lane-color:#58d7d3"><header><b>' + tuning.mode + ' 공정</b><span>' + Math.round(tuning.throughput * 100) + '% FLOW</span></header><p>피해 ×' + tuning.damageMult.toFixed(2) + ' · 주기 ×' + tuning.cooldownMult.toFixed(2) + ' · 거리 ×' + tuning.rangeMult.toFixed(2) + ' · 범위 ×' + tuning.areaMult.toFixed(2) + (tuning.echo ? ' · 지연 복제 ' + tuning.echo + '회' : '') + '</p></article>';
  const buildSummary = build
    ? '<article class="lane-summary build-summary" style="--lane-color:' + build.color + '"><header><b>' + build.name + '</b><span>TIER ' + ["0", "I", "II", "III"][build.tier] + ' · ' + build.depth + ' MODULE</span></header><p>' + build.identity + '</p><strong>' + build.tiers[build.tier - 1] + '</strong></article>'
    : '<article class="lane-summary build-summary muted"><header><b>주력 플레이스타일</b><span>OFFLINE</span></header><p>BUS IN에서 도달한 증강 라인 전체가 즉시 적용됩니다. 도구를 사이에 두면 성능과 반동이 달라집니다.</p></article>';
  $("#factory-summary").innerHTML =
    '<article class="ram-summary"><header><b>FRAME RAM</b><span>' + usedRam + ' / ' + capacity + '</span></header><div><i style="width:' + Math.min(100, usedRam / capacity * 100) + '%"></i></div><p>핵심 ' + moduleCost + ' · 드랍 도구 ' + toolCost + ' · 프로토콜 ' + output.protocolRoutes.length + '×' + PROTOCOL_RAM + ' RAM</p></article>' +
    '<article class="lane-summary" style="--lane-color:#a48cff"><header><b>LEGO 회로 상태</b><span>' + output.connectedCount + ' ONLINE · ' + output.wires.length + ' LINK</span></header><p>블록의 상·우·하 잭이 바로 맞닿을 때만 자동 결합됩니다. BUS 레일은 왼쪽 입력 잭과만 맞물립니다.</p></article>' +
    tuningSummary + buildSummary +
    '<article class="lane-summary" style="--lane-color:#a48cff"><header><b>해금 행동</b><span>' + mechanicNames.length + ' / 10</span></header><p>' + (mechanicNames.length ? mechanicNames.join(" · ") : "아직 해금된 전용 행동이 없습니다.") + '</p></article>' +
    '<article class="lane-summary" style="--lane-color:#ffbd57"><header><b>순서 프로토콜</b><span>' + output.protocolRoutes.length + ' LINK</span></header><p>' + (output.sequenceDepth ? '최장 ' + output.sequenceDepth + ' MODULE 체인' : '입력·출력이 모두 이어진 핵심 증강의 순서가 프로토콜을 만듭니다.') + '</p></article>';
  const recipeItems = [...output.recipes.values()];
  $("#factory-recipe-list").innerHTML = recipeItems.length
    ? recipeItems.map((recipe) => { const def = MODULES[recipe.type]; const tags = [recipe.mode, Math.round(recipe.throughput * 100) + "%"]; if (recipe.power) tags.push("AMP×" + recipe.power); if (recipe.echo) tags.push("ECHO×" + recipe.echo); if (recipe.focus) tags.push("FOCUS×" + recipe.focus); return '<div class="recipe-chip" style="--recipe-color:' + def.color + '"><b>' + def.name + '</b><span>' + tags.join(" · ") + '</span></div>'; }).join("")
    : '<span class="no-synergy">BUS 레일 바로 오른쪽에 블록을 놓고, 다른 블록은 상·우·하로 맞닿게 배치하세요. 결합은 자동입니다.</span>';
  $("#factory-synergy-list").innerHTML = output.synergies.length ? output.synergies.map((item) => '<div class="synergy-chip"><b>→ ' + item.name + '</b>' + item.description + '</div>').join("") : '<span class="no-synergy">유효 회로의 순서 프로토콜 없음</span>';
  const commit = $("#factory-commit");
  commit.disabled = Boolean(factory.pending);
  commit.textContent = factory.pending ? "신규 부품을 먼저 배치하세요" : "회로 적용 · 전투 복귀";
  $("#factory-warning").textContent = factory.pending ? "배치하거나 취소해야 전투로 돌아갈 수 있습니다. 남은 RAM " + freeRam + "." : "RAM " + usedRam + "/" + capacity + " · 가동 핵심 " + output.activeCount + " · 미가동 핵심 " + output.inactiveCount + ".";
  const pendingDef = factory.pending ? partDefinition(factory.pending) : null;
  $("#board-message").textContent = factory.pending ? pendingDef.name + "(" + partRamCost(factory.pending) + " RAM)을 빈 셀로 끌어 놓으세요 · 상·우·하 잭이 반대쪽 잭과 맞닿으면 자동 결합됩니다. 남은 RAM " + freeRam + "." :
    factory.placementNotice || (output.inactiveCount ? "미가동 핵심 증강 " + output.inactiveCount + "개 · BUS 레일 바로 오른쪽 또는 가동 블록의 상·우·하에 맞닿게 드래그하면 자동 결합됩니다." : build ? build.name + " TIER " + ["0", "I", "II", "III"][build.tier] + " · " + tuning.mode + " 공정 가동" : "부품을 빈 셀로 끌어 놓아 배치하세요. 클릭으로 들어 올린 뒤 놓는 방식도 사용할 수 있습니다.");
  $("#board-message").className = "board-message " + (factory.pending || output.inactiveCount ? "warning" : "ok");
}
function placePending(index) {
  if (!factory.pending || !isPlaceable(index)) return;
  const pendingFootprint = partFootprint(factory.pending);
  const position = positionOf(index);
  ensureBoardSpace(position.col + pendingFootprint.width - 1);
  if (!canPlacePart(index, factory.pending)) {
    $("#board-message").textContent = "해당 위치에는 이 부품의 전체 크기만큼 빈 공간이 필요합니다.";
    $("#board-message").className = "board-message warning";
    return;
  }
  const projectedRam = pendingPlacementUsage(index, factory.pending);
  if (projectedRam > ramCapacity()) {
    $("#board-message").textContent = "RAM 부족 · 이 위치는 자동 결합 링크 비용을 포함해 " + projectedRam + "/" + ramCapacity() + " RAM입니다. 기존 모듈을 회수하세요.";
    $("#board-message").className = "board-message warning";
    return;
  }
  const placed = ensurePartPorts(factory.pending);
  const def = partDefinition(placed);
  board[index] = placed;
  rebuildPhysicalWires();
  if (partKind(placed) === "tool" && placed.fromInventory) factory.toolInventory[placed.type] = Math.max(0, (factory.toolInventory[placed.type] || 0) - 1);
  delete placed.fromInventory;
  delete placed.fromBoard;
  factory.pending = null;
  factory.selectedIndex = null;
  factory.lastPlacedId = placed.id;
  factory.placementNotice = def.name + " · " + LANE_NAMES[position.row] + " 설치 완료. 맞닿은 상·우·하 잭이 자동 결합되었습니다.";
  renderFactoryBoard();
}

function moveBoardModule(from, to) {
  const anchor = anchorIndexAt(from);
  if (anchor < 0 || !isPlaceable(to) || anchor === to) return;
  const moving = board[anchor];
  ensureBoardSpace(positionOf(to).col + partFootprint(moving).width - 1);
  if (!canPlacePart(to, moving, moving.id)) {
    factory.placementNotice = "이 위치에는 " + partFootprint(moving).width + "×" + partFootprint(moving).height + " 빈 공간이 필요합니다.";
    renderFactoryBoard();
    return;
  }
  board[anchor] = null;
  board[to] = moving;
  rebuildPhysicalWires();
  if (ramUsage(evaluateClassFactory()) > ramCapacity()) {
    board[to] = null;
    board[anchor] = moving;
    rebuildPhysicalWires();
    factory.placementNotice = "이 위치는 새 자동 결합 링크로 RAM을 초과합니다. PICK 버튼으로 회수해 다시 배치하세요.";
    renderFactoryBoard();
    return;
  }
  factory.selectedIndex = null;
  factory.lastPlacedId = moving.id;
  factory.placementNotice = partDefinition(moving).name + " 위치를 옮겼습니다. 물리적으로 닿는 잭만 다시 결합됩니다.";
  renderFactoryBoard();
}

function liftBoardPart(index) {
  const anchor = anchorIndexAt(index);
  if (anchor < 0 || !board[anchor] || factory.pending) return;
  const lifted = board[anchor];
  board[anchor] = null;
  rebuildPhysicalWires();
  factory.pending = ensurePartPorts({ ...lifted, kind: partKind(lifted), fromBoard: true });
  factory.selectedIndex = null;
  factory.lastPlacedId = null;
  factory.placementNotice = partDefinition(lifted).name + "을 들었습니다. 원하는 빈 셀에 끌어 놓거나 클릭해 옮기세요. 맞닿은 잭만 다시 결합됩니다.";
  renderFactoryBoard();
}

function storeBoardModule(index) {
  const anchor = anchorIndexAt(index);
  if (anchor < 0 || !board[anchor]) return;
  const stored = board[anchor];
  board[anchor] = null;
  const isTool = partKind(stored) === "tool";
  rebuildPhysicalWires();
  if (isTool) factory.toolInventory[stored.type] = (factory.toolInventory[stored.type] || 0) + 1;
  else factory.reserve.push({ ...stored, kind: "module" });
  factory.selectedIndex = null;
  factory.lastPlacedId = null;
  factory.placementNotice = partDefinition(stored).name + (isTool ? "를 회수했습니다. 드랍 도구 인벤토리로 돌아갑니다." : "을 회수했습니다. STORAGE에서 다시 배치할 수 있습니다.") + " 물리 결합은 자동으로 해제되었습니다.";
  renderFactoryBoard();
}

function archivePending() {
  if (!factory.pending) return;
  const stored = factory.pending;
  const isTool = partKind(stored) === "tool";
  if (isTool && stored.fromBoard) factory.toolInventory[stored.type] = (factory.toolInventory[stored.type] || 0) + 1;
  else if (!isTool) factory.reserve.push({ ...stored, kind: "module" });
  factory.pending = null;
  factory.placementNotice = partDefinition(stored).name + (isTool ? " 선택을 취소했습니다. 도구는 인벤토리에 남습니다." : "을 STORAGE에 보관했습니다.");
  renderFactoryBoard();
}

function selectToolBlueprint(type) {
  if (game.mode !== "factory" || !TOOLS[type]) return;
  if (!isToolUnlocked(type)) {
    factory.placementNotice = TOOLS[type].name + "은 R" + TOOLS[type].unlockRoom + "부터 해금됩니다.";
    renderFactoryBoard();
    return;
  }
  if (factory.pending && partKind(factory.pending) === "module") {
    factory.placementNotice = "먼저 신규 핵심 증강을 배치하거나 보관하세요.";
    renderFactoryBoard();
    return;
  }
  if (factory.pending?.kind === "tool" && factory.pending.type === type) {
    factory.pending = null;
    factory.placementNotice = TOOLS[type].name + " 선택을 취소했습니다.";
  } else if (!(factory.toolInventory[type] || 0)) {
    factory.placementNotice = TOOLS[type].name + " 드랍이 없습니다. 적을 처치해 공정 도구를 회수하세요.";
  } else {
    factory.pending = { ...createPart("tool", type), fromInventory: true };
    factory.selectedIndex = null;
    factory.placementNotice = TOOLS[type].name + " 드랍 도구를 배치할 위치를 선택하세요.";
  }
  renderFactoryBoard();
}

function rotateBoardTool(index) {
  const part = partAt(index);
  if (!part || partKind(part) !== "tool") return;
  factory.placementNotice = "이 보드의 잭은 상·우·하 방향으로 고정됩니다. PICK으로 회수한 뒤 다른 위치에 맞닿게 재배치하세요.";
  renderFactoryBoard();
}

function activateReserve(moduleId) {
  if (factory.pending) {
    factory.placementNotice = "현재 신규 부품을 먼저 장착하거나 보관하세요.";
    renderFactoryBoard();
    return;
  }
  const index = factory.reserve.findIndex((module) => module.id === moduleId);
  if (index < 0) return;
  factory.pending = ensurePartPorts({ ...factory.reserve.splice(index, 1)[0], kind: "module" });
  factory.selectedIndex = null;
  factory.placementNotice = null;
  renderFactoryBoard();
}

function draggedPart() {
  const drag = factory.dragged;
  if (!drag) return null;
  if (drag.kind === "board") return board[drag.from] || null;
  if (drag.kind === "pending") return factory.pending;
  if (drag.kind === "tool-palette") return { id: -1, kind: "tool", type: drag.type };
  if (drag.kind === "reserve") return factory.reserve.find((part) => part.id === drag.id) || null;
  return null;
}

function movingPlacementUsage(index, part, sourceAnchor) {
  if (!canPlacePart(index, part, part.id)) return Infinity;
  if (anchorIndexAt(index) === sourceAnchor) return ramUsage(evaluateClassFactory());
  const savedWires = factory.wires.slice();
  const sourcePart = board[sourceAnchor];
  const targetPart = board[index];
  board[sourceAnchor] = null;
  board[index] = part;
  rebuildPhysicalWires();
  const projected = ramUsage(evaluateClassFactory());
  board[index] = targetPart || null;
  board[sourceAnchor] = sourcePart;
  factory.wires = savedWires;
  return projected;
}

function dragTargetIsValid(index) {
  const drag = factory.dragged;
  const part = draggedPart();
  if (!drag || !part || !isPlaceable(index)) return false;
  if (drag.kind === "board" && anchorIndexAt(index) === drag.from) return true;
  if (!canPlacePart(index, part, drag.kind === "board" ? part.id : undefined)) return false;
  const projected = drag.kind === "board" ? movingPlacementUsage(index, part, drag.from) : pendingPlacementUsage(index, part);
  return projected <= ramCapacity();
}

function clearDragFeedback() {
  document.querySelectorAll(".factory-cell.drop-target, .factory-cell.drop-valid, .factory-cell.drop-invalid").forEach((cell) => cell.classList.remove("drop-target", "drop-valid", "drop-invalid"));
}

function showDragFeedback(cell, valid) {
  clearDragFeedback();
  cell.classList.add("drop-target", valid ? "drop-valid" : "drop-invalid");
}

function finishFactoryDrag() {
  factory.dragged = null;
  clearDragFeedback();
  document.querySelectorAll(".module-token.is-dragging, .tool-token.is-dragging, .pending-module.is-dragging, #factory-tools button.is-dragging, #reserve-parts button.is-dragging").forEach((part) => part.classList.remove("is-dragging"));
}

function placeDraggedPaletteTool(type, index) {
  if (factory.pending || !isToolUnlocked(type) || !(factory.toolInventory[type] || 0)) return;
  factory.pending = { ...createPart("tool", type), fromInventory: true };
  placePending(index);
}

function placeDraggedReservePart(id, index) {
  if (factory.pending) return;
  const reserveIndex = factory.reserve.findIndex((part) => part.id === id);
  if (reserveIndex < 0) return;
  factory.pending = ensurePartPorts({ ...factory.reserve.splice(reserveIndex, 1)[0], kind: "module" });
  placePending(index);
}

function completeFactoryDrop(target) {
  const drag = factory.dragged;
  if (!drag || !dragTargetIsValid(target)) {
    factory.placementNotice = "이 위치는 공간 또는 RAM 조건을 만족하지 않습니다. 밝게 표시된 빈 셀에 놓으세요.";
    renderFactoryBoard();
    finishFactoryDrag();
    return false;
  }
  if (drag.kind === "board") moveBoardModule(drag.from, target);
  if (drag.kind === "pending") placePending(target);
  if (drag.kind === "tool-palette") placeDraggedPaletteTool(drag.type, target);
  if (drag.kind === "reserve") placeDraggedReservePart(drag.id, target);
  finishFactoryDrag();
  return true;
}

function queuePointerDrag(event, drag, source) {
  if (event.button !== 0) return;
  factory.pointerCandidate = { ...drag, startX: event.clientX, startY: event.clientY, source, active: false };
}

function updatePointerDrag(event) {
  const candidate = factory.pointerCandidate;
  if (!candidate) return;
  if (!candidate.active && Math.hypot(event.clientX - candidate.startX, event.clientY - candidate.startY) < 7) return;
  if (!candidate.active) {
    candidate.active = true;
    factory.dragged = { kind: candidate.kind, from: candidate.from, id: candidate.id, type: candidate.type };
    candidate.source.classList.add("is-dragging");
  }
  const cell = event.target.closest?.("[data-cell-index]");
  if (cell && isPlaceable(Number(cell.dataset.cellIndex))) showDragFeedback(cell, dragTargetIsValid(Number(cell.dataset.cellIndex)));
  else clearDragFeedback();
}

function finishPointerDrag(event) {
  const candidate = factory.pointerCandidate;
  factory.pointerCandidate = null;
  if (!candidate?.active) return;
  factory.ignoreBoardClickUntil = performance.now() + 90;
  const element = document.elementFromPoint?.(event.clientX, event.clientY) || event.target;
  const cell = element?.closest?.("[data-cell-index]");
  if (cell && isPlaceable(Number(cell.dataset.cellIndex))) completeFactoryDrop(Number(cell.dataset.cellIndex));
  else finishFactoryDrag();
}

function openFactory(manual) {
  if (manual && !["playing", "paused", "factory"].includes(game.mode)) return;
  if (game.mode !== "factory") factory.returnMode = game.mode === "paused" ? "paused" : "playing";
  factory.manual = Boolean(manual);
  factory.selectedIndex = null;
  factory.lastPlacedId = null;
  factory.placementNotice = null;
  factory.wireStart = null;
  game.mode = "factory";
  $("#pause-overlay").hidden = true;
  $("#factory-overlay").hidden = false;
  const title = $(".factory-header h2");
  if (title) title.textContent = CLASS_PROFILES[game.selectedClass].name + " 회로 보드";
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
  if (ramUsage(nextOutput) > ramCapacity()) {
    factory.placementNotice = "RAM 용량을 초과한 라인은 적용할 수 없습니다. 모듈을 보관함으로 옮기세요.";
    renderFactoryBoard();
    return;
  }
  game.output = nextOutput;
  syncPlayerDerivedStats(previousMax);
  factory.selectedIndex = null;
  factory.lastPlacedId = null;
  factory.placementNotice = null;
  factory.wireStart = null;
  $("#factory-overlay").hidden = true;
  game.mode = factory.returnMode === "paused" ? "paused" : "playing";
  if (game.mode === "paused") $("#pause-overlay").hidden = false;
  updateHud();
  showSystemToast("CIRCUIT UPDATED", outputChangeSummary(previousOutput, nextOutput), "success", 2600);
}
function ownedCount(type) {
  return board.filter((module) => module && module.type === type).length +
    factory.reserve.filter((module) => module.type === type).length +
    (factory.pending && factory.pending.type === type ? 1 : 0);
}

function generateChoices() {
  const classTypes = classModuleTypes(game.selectedClass);
  const owned = new Set([...modulesOnBoard().map((module) => module.type), ...factory.reserve.map((module) => module.type)]);
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
  $(".choice-shell > header span").textContent = classProfile.code + " / FRAME RAM " + ramUsage(evaluateClassFactory()) + " / " + ramCapacity();
  $(".choice-shell h2").textContent = classProfile.name + " 전용 증강 선택";
  $(".choice-shell header p").textContent = "카드의 RAM 비용과 플레이스타일 태그를 비교하세요. 장착하지 않은 부품은 0 RAM 보관함에 둘 수 있습니다.";
  $("#choice-cards").innerHTML = choices.map((type, index) => {
    const def = MODULES[type];
    const affinities = playstylesForModule(type, game.selectedClass);
    return '<button class="augment-card" type="button" data-choice="' + type +
      '" data-choice-index="' + index + '" aria-pressed="false" style="--module-color:' + def.color +
      '"><span class="card-shortcut">' + (index + 1) + '</span><div class="card-top"><span>MODULE / ' +
      def.code + '</span><span>' + MODULE_RAM[type] + ' RAM · 보유 ' + ownedCount(type) + '</span></div><div class="card-icon">' +
      def.code + '</div><h3>' + def.name + '</h3><p>' + def.description +
      '</p><div class="build-affinity">' + affinities.map((style) => '<span style="--affinity-color:' + style.color + '">' + style.name + '</span>').join("") +
      '</div><div class="placement-hint">' + def.hint + '</div></button>';
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
  const styles = playstylesForModule(type, game.selectedClass).map((style) => style.name).join(" / ");
  $("#choice-status").innerHTML = def.name + ' · ' + MODULE_RAM[type] + ' RAM · ' + styles + ' · <kbd>ENTER</kbd> 확정';
  $("#choice-confirm").innerHTML = def.name + ' 선택 확정 <kbd>ENTER</kbd>';
  $("#choice-confirm").disabled = false;
}

function confirmAugmentChoice() {
  const type = factory.choiceSelection;
  if (game.mode !== "choice" || !MODULES[type]) return;
  factory.pending = createPart("module", type);
  factory.choiceSelection = null;
  $("#choice-overlay").hidden = true;
  openFactory(false);
}

function interfaceReference(aspect) {
  const first = UI_REFERENCE_ANCHORS[0];
  const last = UI_REFERENCE_ANCHORS.at(-1);
  if (aspect <= first.aspect) return first;
  if (aspect >= last.aspect) return last;
  const upperIndex = UI_REFERENCE_ANCHORS.findIndex((entry) => aspect <= entry.aspect);
  const lower = UI_REFERENCE_ANCHORS[upperIndex - 1];
  const upper = UI_REFERENCE_ANCHORS[upperIndex];
  const progress = (aspect - lower.aspect) / (upper.aspect - lower.aspect);
  return {
    width: lower.width + (upper.width - lower.width) * progress,
    height: lower.height + (upper.height - lower.height) * progress
  };
}

function interfaceMetrics(viewportWidth, viewportHeight) {
  const aspect = viewportWidth / Math.max(1, viewportHeight);
  const profile = UI_LAYOUT_PROFILES.find((entry) => aspect <= entry.maxAspect) || UI_LAYOUT_PROFILES.at(-1);
  const reference = interfaceReference(aspect);
  const fittedScale = Math.min(viewportWidth / reference.width, viewportHeight / reference.height);
  const scale = clamp(fittedScale, UI_SCALE_MIN, UI_SCALE_MAX);
  return {
    layout: profile.id,
    scale,
    width: viewportWidth / scale,
    height: viewportHeight / scale
  };
}

function resizeInterface() {
  const viewportWidth = Math.max(1, document.documentElement.clientWidth || innerWidth);
  const viewportHeight = Math.max(1, document.documentElement.clientHeight || innerHeight);
  const metrics = interfaceMetrics(viewportWidth, viewportHeight);
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--ui-scale", metrics.scale.toFixed(4));
  rootStyle.setProperty("--ui-width", metrics.width.toFixed(3) + "px");
  rootStyle.setProperty("--ui-height", metrics.height.toFixed(3) + "px");
  rootStyle.setProperty("--ui-vw", (metrics.width / 100).toFixed(4) + "px");
  rootStyle.setProperty("--ui-vh", (metrics.height / 100).toFixed(4) + "px");
  uiStage.dataset.layout = metrics.layout;
  uiStage.dataset.scale = metrics.scale.toFixed(3);
}

function resizeCanvas() {
  resizeInterface();
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
  factory.reserve = [];
  factory.wires = [];
  factory.wireStart = null;
  factory.toolInventory = Object.fromEntries(TOOL_TYPES.map((type) => [type, 0]));
  factory.nextId = 1;
  factory.nextWireId = 1;
  factory.returnMode = "playing";
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
  canvas.dataset.augmentEvents = "";
  canvas.dataset.protocolEvents = "";
  game.augmentEvents = {};
  game.protocolEvents = {};
  game.player = {
    x: game.width * .5, y: game.height - 145, radius: 17,
    hp: 100, maxHp: 100, level: 1, speed: 225 * COMBAT_TEMPO.unitMove,
    aim: -Math.PI / 2, facing: -Math.PI / 2, weaponFacing: -Math.PI / 2,
    renderX: game.width * .5, renderY: game.height - 145, aimHold: 0, bufferedAim: null,
    attackCooldown: 0, dashCooldown: 0, dashTime: 0,
    invulnerable: 0, combo: 0, slash: null, nextSwingDirection: 1, swingCount: 0,
    attackBuffer: 0, shotCount: 0, dashBombCount: 0, rangerVolley: 0, stillTime: 0, attackFlash: 0, riposteReady: false,
    riposteTargetId: null,
    lastMoveX: 0, lastMoveY: -1
  };
  game.enemies = [];
  game.enemyBullets = [];
  game.playerShots = [];
  game.zones = [];
  game.delayedAttacks = [];
  game.orbitals = [];
  game.toolDrops = [];
  game.nextDropId = 1;
  game.particles = [];
  game.floaters = [];
  game.echoes = [];
  game.pulses = [];
  game.hitConfirm = 0;
  game.missPulse = 0;
  game.hitStop = 0;
  game.criticalHits = 0;
  game.nextEnemyId = 1;
  game.shake = 0;
  game.cameraOffsetX = 0;
  game.cameraOffsetY = 0;
  game.cursorX = game.mouse.x;
  game.cursorY = game.mouse.y;
  $("#game").classList.remove("low-health");
  $("#damage-flash").classList.remove("hit");
  $("#critical-flash").classList.remove("critical");
  canvas.dataset.criticalHits = "0";
  $("#system-toast").classList.remove("show");
  game.output = evaluateClassFactory();
  enterRoom(1);
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
  game.player.renderX = game.player.x;
  game.player.renderY = game.player.y;
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
  const spawnX = clamp(x, bounds.left + 35, bounds.right - 35);
  const spawnY = clamp(y, bounds.top + 45, bounds.bottom - 55);
  game.enemies.push({
    id: game.nextEnemyId++, type,
    x: spawnX, y: spawnY, renderX: spawnX, renderY: spawnY,
    radius: data.radius, hp: data.hp * scale, maxHp: data.hp * scale,
    speed: (data.speed + game.room * 1.4) * COMBAT_TEMPO.unitMove, damage: data.damage, xp: data.xp,
    color: data.color, attackCooldown: (.5 + Math.random() * .5) / COMBAT_TEMPO.attackRate,
    shootCooldown: (1 + Math.random()) / COMBAT_TEMPO.attackRate, chargeCooldown: 1.8 / COMBAT_TEMPO.attackRate,
    shootWindup: 0, chargeWindup: 0, chargeTime: 0, chargeAngle: 0,
    burnTime: 0, burnDps: 0, bleedTime: 0, bleedDps: 0,
    stun: 0, flash: 0, critical: 0, dead: false
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

function addCriticalSparks(x, y) {
  for (let index = 0; index < 14; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const force = 145 + Math.random() * 185;
    const life = .22 + Math.random() * .16;
    game.particles.push({
      x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force,
      life, maxLife: life, size: 3 + Math.random() * 3, color: index % 3 ? "#f6dc66" : "#fff5b8", spark: true
    });
  }
}

function addPulse(x, y, color, radius, duration) {
  game.pulses.push({
    x, y, color, radius: radius || 46,
    life: duration || .28, maxLife: duration || .28
  });
}

function addFloater(x, y, text, color, options) {
  const settings = options || {};
  const life = settings.life || .85;
  game.floaters.push({
    x, y, text, color: color || "#c9f05a", life, maxLife: life,
    critical: Boolean(settings.critical)
  });
}

function spawnToolDrop(enemy) {
  const guaranteed = enemy.type === "guardian";
  const chance = Math.min(.72, .38 + game.room * .035);
  if (!guaranteed && Math.random() > chance) return null;
  const available = availableToolTypes();
  const type = available[(enemy.id * 3 + game.room + game.kills) % available.length];
  const tool = TOOLS[type];
  const drop = { id: game.nextDropId++, type, tier: tool.tier, x: enemy.x, y: enemy.y, radius: 13, life: 22, bob: Math.random() * Math.PI * 2 };
  game.toolDrops.push(drop);
  addFloater(drop.x, drop.y - 26, "T" + tool.tier + " TOOL DROP", tool.color);
  return drop;
}

function collectToolDrop(drop) {
  const tool = TOOLS[drop.type];
  factory.toolInventory[drop.type] = (factory.toolInventory[drop.type] || 0) + 1;
  addPulse(drop.x, drop.y, tool.color, 34, .26);
  addFloater(drop.x, drop.y - 22, "T" + tool.tier + " " + tool.code + " +1", tool.color);
  showSystemToast("PROCESS TOOL ACQUIRED", "T" + tool.tier + " " + tool.name + " · 공장 보드에서 끌어 놓을 수 있습니다.", "success", 2100);
}

function updateToolDrops(dt) {
  if (!game.player) return;
  for (const drop of game.toolDrops) {
    drop.life -= dt;
    drop.bob += dt * 3.4;
    if (distanceSquared(drop, game.player) <= (drop.radius + game.player.radius + 16) ** 2) {
      drop.picked = true;
      collectToolDrop(drop);
    }
  }
  game.toolDrops = game.toolDrops.filter((drop) => !drop.picked && drop.life > 0);
}

function drawToolDrops() {
  for (const drop of game.toolDrops) {
    const y = drop.y + Math.sin(drop.bob) * 4;
    const tool = TOOLS[drop.type];
    ctx.save();
    ctx.translate(drop.x, y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = tool.color;
    ctx.fillStyle = "#101719";
    ctx.strokeStyle = tool.color;
    ctx.lineWidth = 2;
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-10, -10, 20, 20);
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = tool.color;
    ctx.font = "900 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tool.code, 0, 1);
    ctx.restore();
    ctx.fillStyle = tool.color;
    ctx.font = "700 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DROP", drop.x, y + 23);
  }
}

function killEnemy(enemy) {
  if (enemy.dead) return;
  enemy.dead = true;
  game.kills += 1;
  game.xp += enemy.xp;
  addParticles(enemy.x, enemy.y, enemy.color, enemy.type === "guardian" ? 28 : 13, 190);
  addPulse(enemy.x, enemy.y, enemy.color, enemy.type === "guardian" ? 82 : 48, .38);
  addFloater(enemy.x, enemy.y - enemy.radius, "XP +" + enemy.xp);
  spawnToolDrop(enemy);
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

function triggerImpactFeedback(enemy, critical) {
  const isCritical = Boolean(critical);
  game.hitStop = Math.max(game.hitStop, isCritical ? .058 : .018);
  game.shake = Math.max(game.shake, isCritical ? 15 : 7);
  game.hitConfirm = Math.max(game.hitConfirm, isCritical ? .26 : .16);
  if (!isCritical) return;
  enemy.critical = Math.max(enemy.critical || 0, .22);
  game.criticalHits += 1;
  canvas.dataset.criticalHits = String(game.criticalHits);
  flashCriticalFeedback();
}

function damageEnemy(enemy, damage, profile, angle, canCrit) {
  if (enemy.dead) return;
  const crit = Boolean(canCrit) && Math.random() < clamp(profile.crit || 0, 0, .95);
  const dealt = damage * (crit ? (profile.critMultiplier || 2) : 1);
  enemy.hp -= dealt;
  enemy.flash = crit ? .24 : .12;
  enemy.stun = Math.max(enemy.stun, profile.stun);
  enemy.x += Math.cos(angle) * profile.knockback;
  enemy.y += Math.sin(angle) * profile.knockback;
  triggerImpactFeedback(enemy, crit);
  if (profile.burn) {
    enemy.burnTime = Math.max(enemy.burnTime, 2.3);
    enemy.burnDps = Math.max(enemy.burnDps, profile.burn);
  }
  if (profile.bleed) {
    enemy.bleedTime = Math.max(enemy.bleedTime, 2.7);
    enemy.bleedDps = Math.max(enemy.bleedDps, profile.bleed);
  }
  addFloater(enemy.x, enemy.y - enemy.radius, Math.round(dealt) + (crit ? " CRITICAL" : ""), crit ? "#f6dc66" : "#e7f2ef", { critical: crit, life: crit ? 1.05 : .85 });
  addParticles(enemy.x, enemy.y, crit ? "#f6dc66" : "#8ce1dc", crit ? 14 : 7, crit ? 175 : 125);
  addPulse(enemy.x, enemy.y, crit ? "#f6dc66" : "#8ce1dc", crit ? 64 : 31, crit ? .34 : .22);
  if (crit) addCriticalSparks(enemy.x, enemy.y);
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

function augmentRecipesForType(type) {
  return [...(game.output?.recipes?.values() || [])].filter((recipe) => recipe.type === type);
}

function augmentStrength(type) {
  const recipes = augmentRecipesForType(type);
  if (!recipes.length) return 1;
  return Math.max(...recipes.map((recipe) => recipe.throughput * (1 + recipe.power * .32 + recipe.focus * .18 - Number(recipe.inverted) * .18)));
}

function augmentUtility(type) {
  return augmentRecipesForType(type).some((recipe) => recipe.inverted);
}

function queueFactoryEcho(angle) {
  const echoLevel = Math.min(2, game.output?.tuning?.echo || 0);
  if (!echoLevel) return;
  for (let index = 0; index < echoLevel; index += 1) {
    game.delayedAttacks.push({
      delay: .16 + index * .13, kind: "factory-echo", classId: game.selectedClass, angle,
      x: game.player.x, y: game.player.y, targetX: game.mouse.x, targetY: game.mouse.y,
      damageScale: .42 + echoLevel * .08
    });
  }
  canvas.dataset.lastSpecial = "factory-echo";
}

function hasSynergy(kind) {
  return Boolean(game.output?.synergyKinds?.has(kind));
}

function hasPlaystyle(id, tier) {
  return game.output?.build?.id === id && game.output.build.tier >= (tier || 1);
}

function playstyleTier(id) {
  return game.output?.build?.id === id ? game.output.build.tier : 0;
}

function recordDiagnostic(bucket, key) {
  if (!TEST_MODE) return;
  bucket[key] = (bucket[key] || 0) + 1;
  if (!canvas) return;
  canvas.dataset.augmentEvents = Object.entries(game.augmentEvents).map(([id, count]) => id + ":" + count).join(",");
  canvas.dataset.protocolEvents = Object.entries(game.protocolEvents).map(([id, count]) => id + ":" + count).join(",");
}

function noteAugment(type) {
  recordDiagnostic(game.augmentEvents, type);
}

function noteProtocol(kind) {
  recordDiagnostic(game.protocolEvents, kind);
  canvas.dataset.lastSpecial = kind;
}

function clearEnemyBulletsNear(x, y, radius) {
  let cleared = 0;
  for (const bullet of game.enemyBullets) {
    if (!bullet.dead && (bullet.x - x) ** 2 + (bullet.y - y) ** 2 <= radius ** 2) {
      bullet.dead = true;
      cleared += 1;
    }
  }
  if (cleared) addPulse(x, y, "#e8f2f1", radius, .26);
  return cleared;
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
  let huntQueued = false;
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - originX;
    const dy = enemy.y - originY;
    const distance = Math.hypot(dx, dy);
    if (distance > profile.range + enemy.radius) continue;
    if (Math.abs(angleDelta(Math.atan2(dy, dx), angle)) > profile.arc * Math.PI / 360) continue;
    if (game.selectedClass === "melee" && (hasTrait("m_hook") || hasPlaystyle("maelstrom"))) {
      const pull = hasPlaystyle("maelstrom") ? .32 + playstyleTier("maelstrom") * .06 : .24 * augmentStrength("m_hook");
      enemy.x += (originX - enemy.x) * pull;
      enemy.y += (originY - enemy.y) * pull;
      if (hasTrait("m_hook")) noteAugment("m_hook");
    }
    let strikeScale = damageScale;
    let consumedMark = false;
    if (game.selectedClass === "melee" && hasTrait("m_mark") && !context.synthetic) {
      if (enemy.duelMark && enemy.markDirection !== context.direction) {
        strikeScale *= 1 + .7 * augmentStrength("m_mark");
        enemy.duelMark = 0;
        consumedMark = true;
        noteAugment("m_mark");
        addFloater(enemy.x, enemy.y - enemy.radius - 12, "CROSS CUT", "#58d7d3");
      } else {
        enemy.duelMark = augmentUtility("m_mark") ? 7 : 4;
        enemy.markDirection = context.direction;
        noteAugment("m_mark");
      }
    }
    const aliveBeforeStrike = !enemy.dead;
    damageEnemy(enemy, profile.damage * strikeScale, profile, Math.atan2(dy, dx), true);
    if (aliveBeforeStrike && enemy.dead && hasTrait("m_blood")) {
      player.hp = Math.min(player.maxHp, player.hp + 3);
      noteAugment("m_blood");
    }
    if (aliveBeforeStrike && enemy.dead && hasPlaystyle("pursuit", 3) && !context.synthetic && !huntQueued) {
      game.delayedAttacks.push({ delay: .08, kind: "hunt", x: enemy.x, y: enemy.y, damageScale: .82 });
      huntQueued = true;
      addFloater(enemy.x, enemy.y - enemy.radius - 16, "HUNT CONTINUES", game.output.build.color);
    }
    if (game.selectedClass === "melee" && hasTrait("m_execute") && !enemy.dead && enemy.hp / enemy.maxHp <= .22) {
      addFloater(enemy.x, enemy.y - enemy.radius - 10, "EXECUTE", "#f08080");
      noteAugment("m_execute");
      killEnemy(enemy);
      if (hasTrait("m_blood")) {
        player.hp = Math.min(player.maxHp, player.hp + 8);
        noteAugment("m_blood");
      }
      if (hasSynergy("harvester")) {
        player.dashCooldown = 0;
        noteProtocol("harvester");
      }
      if (context.finisher && hasSynergy("execution_wheel")) {
        game.delayedAttacks.push({ delay: .09, kind: "spin", angle, damageScale: .55, x: enemy.x, y: enemy.y, synthetic: true });
        noteProtocol("execution_wheel");
      }
    }
    if (hasTrait("m_blood") && consumedMark) {
      player.hp = Math.min(player.maxHp, player.hp + 4);
      noteAugment("m_blood");
    }
    if (consumedMark && (hasSynergy("blood_loop") || hasPlaystyle("pursuit", 2))) {
      game.delayedAttacks.push({ delay: .11, kind: "slash", angle, damageScale: .65, synthetic: true });
      if (hasSynergy("blood_loop")) noteProtocol("blood_loop");
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
    let shockRadius = 72;
    if (hasSynergy("compression_break")) {
      shockRadius = 102;
      for (const enemy of game.enemies) {
        if (!enemy.dead && distanceSquared(enemy, { x: shockX, y: shockY }) <= 148 ** 2) {
          enemy.x += (shockX - enemy.x) * .32;
          enemy.y += (shockY - enemy.y) * .32;
        }
      }
      noteProtocol("compression_break");
    }
    createPlayerExplosion(shockX, shockY, 14, shockRadius, { source: "melee-shock", noAugments: true });
    noteAugment("m_shock");
  }
  if (context.finisher && hasSynergy("vortex") && !context.synthetic) {
    game.delayedAttacks.push({ delay: .14, kind: "spin", angle, damageScale: .7, synthetic: true });
    noteProtocol("vortex");
  }
  if (context.finisher && hasPlaystyle("maelstrom", 3) && !context.synthetic) {
    game.zones.push({ kind: "blade", x: originX, y: originY, radius: 128, life: 2.1, tick: 0, color: game.output.build.color });
    addFloater(originX, originY - 42, "BLADE STORM", game.output.build.color);
  }
}

function spawnRailShot(angle, options) {
  const settings = options || {};
  const speed = (settings.speed || 920) * COMBAT_TEMPO.projectile;
  const pierce = settings.pierce ?? (hasTrait("s_pierce") ? Math.max(1, Math.round(2 * augmentStrength("s_pierce"))) : 0);
  const ricochet = settings.ricochet ?? (hasTrait("s_ricochet") ? Math.max(1, Math.round(augmentStrength("s_ricochet"))) : 0);
  const homing = settings.homing ?? hasTrait("s_homing");
  game.playerShots.push({
    kind: settings.kind || "rail", x: settings.x ?? game.player.x, y: settings.y ?? game.player.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle,
    damage: settings.damage ?? game.output.primary.damage, radius: settings.radius || 4,
    life: settings.life || 1.25, pierce, initialPierce: pierce, didPierce: false,
    ricochet, homing, homingNoted: false, homingTargetId: settings.homingTargetId || null,
    prism: hasSynergy("prism_rail"), smartRebound: hasSynergy("smart_rebound"), smartBounceUsed: false,
    charged: Boolean(settings.charged), drone: Boolean(settings.drone), hitIds: new Set(),
    color: settings.color || (settings.charged ? "#f6dc66" : "#d9f4ff")
  });
}

function fireSniperAttack(angle) {
  const player = game.player;
  player.shotCount += 1;
  const deadeyeTier = playstyleTier("deadeye");
  const hunterTier = playstyleTier("hunter");
  const rangerTier = playstyleTier("ranger");
  const charged = Boolean(deadeyeTier) || (hasTrait("s_ghost") && player.stillTime >= 1.05);
  const twin = Boolean(hunterTier) || (hasTrait("s_twin") && player.shotCount % 2 === 0);
  if (charged) {
    canvas.dataset.lastSpecial = "charged-rail";
    if (hasTrait("s_ghost")) noteAugment("s_ghost");
  }
  if (twin) {
    canvas.dataset.lastSpecial = hunterTier ? "hunter-pack" : hasSynergy("hound_pair") ? "hound-pair" : "twin-rail";
    if (hasTrait("s_twin")) noteAugment("s_twin");
  }
  if (twin) {
    const shotCount = hunterTier >= 2 ? 3 : 2;
    const splitTargets = (hasSynergy("hound_pair") || hunterTier)
      ? game.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distanceSquared(a, player) - distanceSquared(b, player)).slice(0, shotCount)
      : [];
    for (let index = 0; index < shotCount; index += 1) {
      const target = splitTargets[index];
      const spread = (index - (shotCount - 1) / 2) * .1;
      const shotAngle = target ? Math.atan2(target.y - player.y, target.x - player.x) : angle + spread;
      spawnRailShot(shotAngle, {
        charged, homing: Boolean(hunterTier) || undefined, homingTargetId: target?.id,
        damage: hunterTier ? game.output.primary.damage * (shotCount === 3 ? .72 : .82) : undefined,
        color: hunterTier ? game.output.build.color : undefined
      });
    }
    if (hasSynergy("hound_pair")) noteProtocol("hound_pair");
  } else {
    const rangerVolley = rangerTier >= 3 && player.rangerVolley > 0;
    const volleyCount = rangerVolley ? 3 : 1;
    for (let index = 0; index < volleyCount; index += 1) {
      const spread = (index - (volleyCount - 1) / 2) * .12;
      spawnRailShot(angle + spread, {
        charged, radius: deadeyeTier ? 7 + deadeyeTier * 2 : charged ? 8 : 4,
        pierce: deadeyeTier || charged ? 99 : undefined,
        damage: deadeyeTier ? game.output.primary.damage * (1.18 + deadeyeTier * .1) : undefined,
        homing: rangerVolley || undefined,
        color: deadeyeTier || rangerVolley ? game.output.build.color : undefined
      });
    }
    if (rangerVolley) {
      player.rangerVolley = 0;
      addFloater(player.x, player.y - 38, "GHOST VOLLEY", game.output.build.color);
    }
  }
  if ((hasTrait("s_mine") && player.shotCount % 3 === 0) || (rangerTier >= 2 && player.shotCount % 2 === 0)) {
    game.zones.push({ kind: "mine", x: player.x, y: player.y, radius: 48, life: 12, tick: 0, color: "#ff9b4a", crossfire: hasSynergy("crossfire_mine") });
    if (hasTrait("s_mine")) noteAugment("s_mine");
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
  const speed = (settings.speed || 440) * COMBAT_TEMPO.projectile;
  game.playerShots.push({
    kind: "grenade", x: settings.x ?? player.x, y: settings.y ?? player.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, angle,
    targetX, targetY, damage: settings.damage ?? game.output.primary.damage,
    radius: settings.radius || 8, blastRadius: settings.blastRadius || game.output.primary.blastRadius,
    life: 1.5, fragment: Boolean(settings.fragment), dashBomb: Boolean(settings.dashBomb),
    dashAngle: settings.dashAngle ?? angle, supernova: Boolean(settings.supernova), orbital: Boolean(settings.orbital),
    canCrit: settings.canCrit ?? !settings.fragment, attachedId: null, color: settings.color || "#ff9b4a"
  });
}

function fireArtilleryAttack(angle) {
  const player = game.player;
  player.shotCount += 1;
  const orbitalTier = playstyleTier("orbital");
  const orbitalNova = orbitalTier >= 2 && player.shotCount % (orbitalTier >= 3 ? 2 : 3) === 0;
  const supernova = orbitalNova || (hasTrait("a_super") && player.shotCount % 3 === 0);
  if (supernova) {
    canvas.dataset.lastSpecial = hasSynergy("planetary") ? "planetary-supernova" : "supernova";
    if (hasTrait("a_super")) noteAugment("a_super");
  }
  launchGrenade(angle, {
    supernova,
    blastRadius: supernova ? 148 : game.output.primary.blastRadius,
    damage: supernova ? 34 : game.output.primary.damage,
    color: game.output.build?.color || (supernova ? "#f6dc66" : "#ff9b4a")
  });
  player.attackFlash = .14;
}

function startSlash(attackAngle) {
  const player = game.player;
  if (game.mode !== "playing" || player.attackCooldown > 0 || player.dashTime > 0) return false;
  const output = game.output;
  const fallbackAim = Math.atan2(game.mouse.y - player.y, game.mouse.x - player.x);
  player.aim = Number.isFinite(attackAngle) ? attackAngle : fallbackAim;
  player.weaponFacing = player.aim;
  player.aimHold = .24;
  player.attackCooldown = output.primary.cooldown * (hasPlaystyle("deadeye") ? 1.32 : 1);
  player.swingCount += 1;
  canvas.dataset.swingCount = String(player.swingCount);
  if (game.selectedClass === "sniper") {
    canvas.dataset.swingDirection = "rail-shot";
    fireSniperAttack(player.aim);
    queueFactoryEcho(player.aim);
    return true;
  }
  if (game.selectedClass === "artillery") {
    canvas.dataset.swingDirection = "grenade-launch";
    fireArtilleryAttack(player.aim);
    queueFactoryEcho(player.aim);
    return true;
  }
  const maelstromTier = playstyleTier("maelstrom");
  const comboLength = maelstromTier >= 2 ? 2 : 3;
  player.combo = (player.combo + 1) % comboLength;
  const finisher = player.combo === 0;
  const direction = player.nextSwingDirection;
  const pursuitTier = playstyleTier("pursuit");
  if (hasTrait("m_step") || pursuitTier) {
    const revengeTarget = player.riposteReady && hasSynergy("vengeance_step")
      ? game.enemies.find((enemy) => enemy.id === player.riposteTargetId && !enemy.dead)
      : null;
    const target = revengeTarget || nearestEnemyInDirection(player.aim, pursuitTier ? 250 + pursuitTier * 45 : 230, pursuitTier ? .72 : .5);
    if (target) {
      const targetAngle = Math.atan2(target.y - player.y, target.x - player.x);
      const advance = Math.max(0, Math.hypot(target.x - player.x, target.y - player.y) - 62);
      player.x += Math.cos(targetAngle) * advance;
      player.y += Math.sin(targetAngle) * advance;
      addPulse(player.x, player.y, "#69a9ff", 38, .22);
      noteAugment("m_step");
      if (hasSynergy("first_mark")) {
        target.duelMark = 4;
        target.markDirection = -direction;
        noteProtocol("first_mark");
      }
      if (revengeTarget) noteProtocol("vengeance_step");
    }
  }
  const counterTier = playstyleTier("counter");
  if (counterTier) {
    const cleared = clearEnemyBulletsNear(player.x, player.y, 110 + counterTier * 18);
    if (cleared) {
      player.riposteReady = true;
      addFloater(player.x, player.y - 38, "GUARD ×" + cleared, game.output.build.color);
    }
  }
  player.nextSwingDirection *= -1;
  canvas.dataset.swingDirection = direction > 0 ? "left-to-right" : "right-to-left";
  const swingDuration = Math.min(finisher ? .46 : .42, output.primary.cooldown * .92);
  player.aimHold = swingDuration;
  const slashArc = maelstromTier
    ? (finisher ? 360 : 190 + maelstromTier * 25)
    : finisher && hasTrait("m_spin") ? 360 : output.primary.arc;
  if (finisher && hasTrait("m_spin")) {
    canvas.dataset.lastSpecial = hasSynergy("vortex") ? "magnetic-vortex" : "spin-finisher";
    noteAugment("m_spin");
  }
  player.slash = {
    time: 0, duration: swingDuration, angle: player.aim,
    direction,
    arc: slashArc, range: output.primary.range, echo: false
  };
  const meleeProfile = { ...output.primary, arc: slashArc, phase: player.riposteReady };
  const riposteActive = player.riposteReady;
  const riposteScale = riposteActive ? 1.8 : 1;
  if (riposteActive) player.invulnerable = Math.max(player.invulnerable, .24);
  if (riposteActive && hasTrait("m_riposte")) noteAugment("m_riposte");
  player.riposteReady = false;
  player.riposteTargetId = null;
  executeSlash(meleeProfile, player.aim, (finisher ? 1.28 : 1) * riposteScale, false, { direction, finisher });
  queueFactoryEcho(player.aim);
  if (riposteActive && counterTier >= 3) {
    for (const offset of [-.22, 0, .22]) {
      spawnRailShot(player.aim + offset, { damage: 16, homing: true, pierce: 1, ricochet: 0, color: game.output.build.color });
    }
    addFloater(player.x, player.y - 44, "COUNTER SALVO", game.output.build.color);
  }
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
    player.riposteTargetId = game.enemies.filter((enemy) => !enemy.dead)
      .sort((a, b) => (a.x - sourceX) ** 2 + (a.y - sourceY) ** 2 - ((b.x - sourceX) ** 2 + (b.y - sourceY) ** 2))[0]?.id || null;
    noteAugment("m_riposte");
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
  const cursorAim = Math.atan2(game.mouse.y - player.y, game.mouse.x - player.x);
  player.attackCooldown -= dt;
  player.dashCooldown -= dt;
  player.invulnerable -= dt;
  player.aimHold = Math.max(0, player.aimHold - dt);
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
    player.facing = smoothAngle(player.facing, Math.atan2(moveY, moveX), smoothFactor(15, dt));
    player.stillTime = 0;
  } else {
    player.stillTime += dt;
  }
  player.attackFlash = Math.max(0, player.attackFlash - dt);
  if (game.dashRequested && player.dashCooldown <= 0) {
    const dashAngle = Math.atan2(player.lastMoveY, player.lastMoveX);
    if (game.selectedClass === "melee" && hasTrait("m_echo")) {
      game.delayedAttacks.push({ delay: .18, kind: "slash", angle: dashAngle, damageScale: .72, x: player.x, y: player.y, synthetic: true, aftershock: hasSynergy("aftershock"), guardPulse: hasSynergy("phantom_guard") });
      noteAugment("m_echo");
    }
    if (game.selectedClass === "melee" && hasPlaystyle("counter", 2)) {
      game.delayedAttacks.push({ delay: .16, kind: "guard", x: player.x, y: player.y, radius: 150 });
      player.riposteReady = true;
      addFloater(player.x, player.y - 34, "GUARD ECHO", game.output.build.color);
    }
    const rangerTier = playstyleTier("ranger");
    if (game.selectedClass === "sniper" && (hasTrait("s_dashload") || rangerTier >= 2)) {
      player.attackCooldown = 0;
      player.aim = cursorAim;
      player.weaponFacing = cursorAim;
      player.aimHold = .22;
      spawnRailShot(cursorAim, { damage: 22, color: rangerTier ? game.output.build.color : "#d9ef59", pierce: 0, ricochet: 0, homing: Boolean(rangerTier) });
      if (hasTrait("s_dashload")) noteAugment("s_dashload");
      if (hasSynergy("escape_route") || rangerTier >= 2) {
        game.zones.push({ kind: "mine", x: player.x, y: player.y, radius: 52, life: 12, tick: 0, color: "#ff9b4a", crossfire: hasSynergy("crossfire_mine") });
        if (hasSynergy("escape_route")) noteProtocol("escape_route");
      }
      if (hasSynergy("cold_escape") || rangerTier >= 2) {
        game.zones.push({ kind: "slow", x: player.x, y: player.y, radius: 76, life: 2.8, tick: 0, color: "#57d8ee" });
        if (hasSynergy("cold_escape")) noteProtocol("cold_escape");
      }
      if (rangerTier >= 3) player.rangerVolley = 1;
    }
    const orbitalTier = playstyleTier("orbital");
    if (game.selectedClass === "artillery" && (hasTrait("a_dashbomb") || orbitalTier >= 2)) {
      player.dashBombCount += 1;
      const novaMine = orbitalTier >= 2 || (hasSynergy("nova_mine") && player.dashBombCount % 3 === 0);
      launchGrenade(dashAngle + Math.PI, { x: player.x, y: player.y, targetX: player.x, targetY: player.y, speed: 1, damage: novaMine ? 30 : 17, blastRadius: novaMine ? 132 : 74, dashBomb: true, dashAngle, supernova: novaMine, color: novaMine ? "#f6dc66" : "#69a9ff" });
      if (hasTrait("a_dashbomb")) noteAugment("a_dashbomb");
      if (novaMine) {
        if (hasTrait("a_super")) noteAugment("a_super");
        if (hasSynergy("nova_mine")) noteProtocol("nova_mine");
      }
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
  const speed = dashing ? 610 * COMBAT_TEMPO.unitMove : player.speed;
  player.x = clamp(player.x + moveX * speed * dt, bounds.left + player.radius, bounds.right - player.radius);
  player.y = clamp(player.y + moveY * speed * dt, bounds.top + player.radius, bounds.bottom - player.radius);
  if (player.aimHold <= 0) player.weaponFacing = smoothAngle(player.weaponFacing, player.facing, smoothFactor(10, dt));
  const positionBlend = smoothFactor(dashing ? 34 : 22, dt);
  player.renderX += (player.x - player.renderX) * positionBlend;
  player.renderY += (player.y - player.renderY) * positionBlend;
  const cursorBlend = smoothFactor(24, dt);
  game.cursorX += (game.mouse.x - game.cursorX) * cursorBlend;
  game.cursorY += (game.mouse.y - game.cursorY) * cursorBlend;
  player.attackBuffer = Math.max(0, player.attackBuffer - dt);
  if (game.attackRequested) {
    player.attackBuffer = .16;
    player.bufferedAim = cursorAim;
    game.attackRequested = false;
  }
  if (player.attackBuffer > 0 && player.attackCooldown <= 0 && player.dashTime <= 0 && startSlash(player.bufferedAim)) {
    player.attackBuffer = 0;
    player.bufferedAim = null;
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
      x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed * COMBAT_TEMPO.projectile, vy: Math.sin(angle) * speed * COMBAT_TEMPO.projectile,
      radius: enemy.type === "guardian" ? 7 : 5, damage: enemy.damage, life: 3.2, dead: false
    });
  }
}

function updateEnemies(dt) {
  const player = game.player;
  const bounds = roomBounds();
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const enemyBlend = smoothFactor(enemy.chargeTime > 0 ? 30 : 18, dt);
    enemy.renderX = (enemy.renderX ?? enemy.x) + (enemy.x - (enemy.renderX ?? enemy.x)) * enemyBlend;
    enemy.renderY = (enemy.renderY ?? enemy.y) + (enemy.y - (enemy.renderY ?? enemy.y)) * enemyBlend;
    enemy.flash -= dt;
    enemy.critical = Math.max(0, (enemy.critical || 0) - dt);
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
        enemy.shootWindup = .38 / COMBAT_TEMPO.attackRate;
        enemy.shootCooldown = Math.max(.75, 1.55 - game.room * .025) / COMBAT_TEMPO.attackRate;
      }
    }
    if (enemy.type === "guardian") {
      if (enemy.shootWindup > 0) {
        enemy.shootWindup -= dt;
        if (enemy.shootWindup <= 0) fireEnemyBullet(enemy, 245, 3);
      } else if (enemy.shootCooldown <= 0) {
        enemy.shootWindup = .42 / COMBAT_TEMPO.attackRate;
        enemy.shootCooldown = 1.25 / COMBAT_TEMPO.attackRate;
      }
    }
    let charging = false;
    if (enemy.chargeWindup > 0) {
      enemy.chargeWindup -= dt;
      move = 0;
      if (enemy.chargeWindup <= 0) enemy.chargeTime = (enemy.type === "guardian" ? .3 : .24) / COMBAT_TEMPO.attackRate;
    } else if (enemy.chargeTime > 0) {
      enemy.chargeTime -= dt;
      charging = true;
    } else if ((enemy.type === "brute" || enemy.type === "guardian") && enemy.chargeCooldown <= 0 && distance > 90) {
      enemy.chargeWindup = (enemy.type === "guardian" ? .5 : .42) / COMBAT_TEMPO.attackRate;
      enemy.chargeCooldown = (enemy.type === "guardian" ? 1.5 : 2.2) / COMBAT_TEMPO.attackRate;
      enemy.chargeAngle = angle;
      move = 0;
    }
    const movementAngle = charging ? enemy.chargeAngle : angle;
    const velocity = enemy.speed * move * (charging ? 3.15 : 1) * (enemy.slowed ? .52 : 1);
    enemy.x = clamp(enemy.x + Math.cos(movementAngle) * velocity * dt, bounds.left + enemy.radius, bounds.right - enemy.radius);
    enemy.y = clamp(enemy.y + Math.sin(movementAngle) * velocity * dt, bounds.top + enemy.radius, bounds.bottom - enemy.radius);
    if (distance < player.radius + enemy.radius + 3 && enemy.attackCooldown <= 0) {
      damagePlayer(enemy.damage, enemy.x, enemy.y);
      enemy.attackCooldown = (enemy.type === "guardian" ? .8 : 1.05) / COMBAT_TEMPO.attackRate;
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
        if (parrying) noteAugment("m_guard");
        if (parrying && hasSynergy("perfect_counter")) {
          player.riposteReady = true;
          const shooter = game.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distanceSquared(a, bullet) - distanceSquared(b, bullet))[0];
          if (shooter) spawnRailShot(Math.atan2(shooter.y - bullet.y, shooter.x - bullet.x), { x: bullet.x, y: bullet.y, damage: 18, homing: true, pierce: 0, ricochet: 0, color: "#8b7fff" });
          noteProtocol("perfect_counter");
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
  const primaryExplosion = !settings.chain && !settings.recursive && !settings.fragment && !settings.dashBomb && !settings.orbital;
  const infernoTier = playstyleTier("inferno");
  const cascadeTier = playstyleTier("cascade");
  const orbitalTier = playstyleTier("orbital");
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
  let vacuumed = false;
  const vacuumAllowed = !settings.orbital || hasSynergy("gravity_satellite");
  for (const enemy of game.enemies) {
    if (enemy.dead) continue;
    const distance = Math.hypot(enemy.x - x, enemy.y - y);
    if (augmented && (hasTrait("a_vacuum") || infernoTier) && vacuumAllowed && distance <= radius * (infernoTier ? 1.85 : 1.55)) {
      const pull = infernoTier ? .38 + infernoTier * .06 : .34;
      enemy.x += (x - enemy.x) * pull;
      enemy.y += (y - enemy.y) * pull;
      vacuumed = true;
    }
    if (distance > radius + enemy.radius) continue;
    const wasAlive = !enemy.dead;
    const profile = { ...game.output.primary, knockback: settings.source === "melee-shock" ? 34 : 12, stun: .12 };
    damageEnemy(enemy, damage, profile, Math.atan2(enemy.y - y, enemy.x - x), settings.canCrit ?? primaryExplosion);
    if (wasAlive && enemy.dead) killed.push(enemy);
  }
  if (vacuumed) {
    noteAugment("a_vacuum");
    if (settings.orbital && hasSynergy("gravity_satellite")) noteProtocol("gravity_satellite");
  }
  if (augmented && primaryExplosion && (hasTrait("a_fire") || infernoTier)) {
    const fireStrength = hasTrait("a_fire") ? augmentStrength("a_fire") : 1;
    game.zones.push({
      kind: "fire", x, y,
      radius: radius * (infernoTier >= 3 ? 1.05 : infernoTier ? .88 : .72) * (augmentUtility("a_fire") ? 1.28 : 1),
      life: (infernoTier >= 3 ? 5.4 : infernoTier ? 4.1 : 3.2) * fireStrength,
      tick: 0, color: infernoTier ? game.output.build.color : "#ff714f",
      vortex: Boolean(infernoTier) || hasSynergy("inferno_vortex"),
      wildfire: infernoTier >= 2 || hasSynergy("wildfire_chain")
    });
    if (hasTrait("a_fire")) noteAugment("a_fire");
    if (hasSynergy("inferno_vortex")) noteProtocol("inferno_vortex");
  }
  const shrapnelAllowed = primaryExplosion || (settings.recursive && (hasSynergy("echo_shrapnel") || cascadeTier >= 3)) || (settings.dashBomb && hasSynergy("breach_field"));
  if (augmented && (hasTrait("a_shrapnel") || cascadeTier >= 3) && !settings.shrapnel && shrapnelAllowed) {
    const amount = settings.dashBomb && hasSynergy("breach_field") ? 6 : 10;
    const baseAngle = settings.dashAngle || 0;
    for (let index = 0; index < amount; index += 1) {
      const angle = settings.dashBomb && hasSynergy("breach_field")
        ? baseAngle + (index - (amount - 1) / 2) * .16
        : index / amount * Math.PI * 2;
      spawnRailShot(angle, { kind: "shrapnel", x, y, speed: 520, damage: 8, life: .65, pierce: 1, ricochet: 0, homing: false, color: "#ffd6a0" });
    }
    if (hasTrait("a_shrapnel")) noteAugment("a_shrapnel");
    if (settings.recursive && hasSynergy("echo_shrapnel")) noteProtocol("echo_shrapnel");
    if (settings.dashBomb && hasSynergy("breach_field")) noteProtocol("breach_field");
  }
  const recursiveAllowed = augmented && (hasTrait("a_recursive") || cascadeTier >= 2) && (
    primaryExplosion || (settings.fragment && !settings.orbital && (hasSynergy("cascade") || cascadeTier >= 2))
  );
  if (recursiveAllowed) {
    game.delayedAttacks.push({ delay: .42, kind: "explosion", x, y, damage: damage * .62, radius: radius * .72, options: { recursive: true, color: "#a48cff" } });
    if (hasTrait("a_recursive")) noteAugment("a_recursive");
    if (settings.fragment && hasSynergy("cascade")) noteProtocol("cascade");
  }
  if (augmented && primaryExplosion && (hasTrait("a_cluster") || cascadeTier)) {
    const parasiteTargets = settings.fromSticky && hasSynergy("parasite_cluster")
      ? game.enemies.filter((enemy) => !enemy.dead).sort((a, b) => distanceSquared(a, { x, y }) - distanceSquared(b, { x, y })).slice(0, 3)
      : [];
    for (let index = 0; index < 3; index += 1) {
      const target = parasiteTargets[index];
      const angle = target ? Math.atan2(target.y - y, target.x - x) : index / 3 * Math.PI * 2 + .35;
      launchGrenade(angle, { x, y, targetX: target?.x ?? x + Math.cos(angle) * 105, targetY: target?.y ?? y + Math.sin(angle) * 105, speed: 360, damage: damage * .52, blastRadius: radius * .55, fragment: true, color: "#d9ef59" });
    }
    if (hasTrait("a_cluster")) noteAugment("a_cluster");
    if (parasiteTargets.length) noteProtocol("parasite_cluster");
  }
  if (augmented && (hasTrait("a_chain") || infernoTier >= 2) && !settings.chain) {
    for (const enemy of killed.slice(0, 3)) {
      game.delayedAttacks.push({ delay: .12, kind: "explosion", x: enemy.x, y: enemy.y, damage: damage * .5, radius: radius * .58, options: { chain: true, noAugments: true, color: "#f08080" } });
    }
    if (killed.length && hasTrait("a_chain")) noteAugment("a_chain");
  }
  if (augmented && primaryExplosion && (hasTrait("a_orbit") || orbitalTier) && game.orbitals.length < 12) {
    const count = orbitalTier >= 3 || (settings.supernova && hasSynergy("planetary")) ? 3 : orbitalTier >= 2 ? 2 : 1;
    for (let index = 0; index < count; index += 1) game.orbitals.push({ x, y, angle: index / count * Math.PI * 2, delay: .35 + index * .14, color: "#71efad" });
    if (hasTrait("a_orbit")) noteAugment("a_orbit");
    if (count === 3) noteProtocol("planetary");
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
  noteAugment("s_ricochet");
  if (shot.smartRebound && !shot.smartBounceUsed) {
    shot.smartBounceUsed = true;
    shot.ricochet += 1;
    shot.homing = true;
    noteProtocol("smart_rebound");
  }
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
        const livingFuse = !attached && hasSynergy("living_fuse");
        createPlayerExplosion(shot.x, shot.y, livingFuse ? shot.damage * 1.2 : shot.damage, livingFuse ? shot.blastRadius * 1.35 : shot.blastRadius, { fragment: shot.fragment, dashBomb: shot.dashBomb, supernova: shot.supernova, orbital: shot.orbital, dashAngle: shot.dashAngle, fromSticky: true, livingFuse, canCrit: shot.canCrit });
        if (livingFuse) noteProtocol("living_fuse");
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
        if (!shot.homingNoted && game.selectedClass === "sniper") {
          shot.homingNoted = true;
          noteAugment("s_homing");
        }
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
          noteAugment("a_sticky");
          addFloater(target.x, target.y - target.radius, "STICK", "#ffbd57");
          continue;
        }
      }
      if (Math.hypot(shot.x - shot.targetX, shot.y - shot.targetY) <= Math.max(18, Math.hypot(shot.vx, shot.vy) * dt) || shot.life <= 0) {
        shot.dead = true;
        createPlayerExplosion(shot.x, shot.y, shot.damage, shot.blastRadius, { fragment: shot.fragment, dashBomb: shot.dashBomb, supernova: shot.supernova, orbital: shot.orbital, dashAngle: shot.dashAngle, canCrit: shot.canCrit });
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
          if (hasSynergy("rupture_line")) {
            shot.pierce += 2;
            noteProtocol("rupture_line");
          }
        } else {
          enemy.sniperMark = 5;
        }
        noteAugment("s_mark");
      }
      damageEnemy(enemy, shot.damage, game.output.primary, shot.angle, shot.kind === "rail");
      if (game.selectedClass === "sniper" && hasPlaystyle("deadeye", 2) && shot.kind === "rail") {
        createPlayerExplosion(enemy.x, enemy.y, 10 + playstyleTier("deadeye") * 3, 48 + playstyleTier("deadeye") * 8, { source: "deadeye", noAugments: true, color: game.output.build.color });
      }
      if (game.selectedClass === "sniper" && (hasTrait("s_freeze") || hasPlaystyle("ranger"))) {
        const freezeStrength = hasTrait("s_freeze") ? augmentStrength("s_freeze") : 1;
        game.zones.push({ kind: "slow", x: enemy.x, y: enemy.y, radius: 70 * (augmentUtility("s_freeze") ? 1.35 : 1), life: 2.8 * freezeStrength, tick: 0, color: "#57d8ee" });
        if (hasTrait("s_freeze")) noteAugment("s_freeze");
      }
      if (shot.charged && hasSynergy("dead_center")) {
        for (const marked of game.enemies.filter((item) => !item.dead && item.sniperMark > 0)) {
          marked.sniperMark = 0;
          createPlayerExplosion(marked.x, marked.y, 18, 62, { source: "dead-center", noAugments: true, color: "#a48cff" });
        }
        noteProtocol("dead_center");
      }
      if (wasAlive && enemy.dead && game.selectedClass === "sniper" && (hasTrait("s_drone") || hasPlaystyle("hunter", 3))) {
        game.delayedAttacks.push({ delay: .22, kind: "drone", x: enemy.x, y: enemy.y, cold: hasSynergy("cold_observer") });
      }
      if (shot.pierce > 0) {
        shot.pierce -= 1;
        shot.didPierce = true;
        if (game.selectedClass === "sniper") noteAugment("s_pierce");
        continue;
      }
      const canRicochetAfterPierce = !shot.didPierce || shot.prism;
      if (shot.ricochet > 0 && canRicochetAfterPierce && ricochetShot(shot, enemy)) {
        if (shot.didPierce && shot.prism) noteProtocol("prism_rail");
        break;
      }
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
        if (zone.crossfire) {
          for (let index = 0; index < 4; index += 1) {
            spawnRailShot(index * Math.PI / 2, { kind: "shrapnel", x: zone.x, y: zone.y, speed: 600, damage: 12, life: .7, pierce: 1, ricochet: 0, homing: false, color: "#f6dc66" });
          }
          noteProtocol("crossfire_mine");
        }
      }
    }
    if (zone.kind === "fire" && zone.tick <= 0) {
      zone.tick = .3;
      for (const enemy of game.enemies) {
        if (!enemy.dead && distanceSquared(enemy, zone) <= (zone.radius + enemy.radius) ** 2) {
          const wasAlive = !enemy.dead;
          damageEnemy(enemy, 5, { ...game.output.primary, knockback: 0, stun: 0 }, 0, false);
          if (wasAlive && enemy.dead && zone.wildfire) {
            game.delayedAttacks.push({ delay: .08, kind: "explosion", x: enemy.x, y: enemy.y, damage: 10, radius: 62, options: { chain: true, noAugments: true, color: "#f08080" } });
            noteAugment("a_chain");
            noteProtocol("wildfire_chain");
          }
        }
      }
    }
    if (zone.kind === "blade" && zone.tick <= 0) {
      zone.tick = .24;
      for (const enemy of game.enemies) {
        if (enemy.dead || distanceSquared(enemy, zone) > (zone.radius + enemy.radius) ** 2) continue;
        enemy.x += (zone.x - enemy.x) * .12;
        enemy.y += (zone.y - enemy.y) * .12;
        damageEnemy(enemy, 7, { ...game.output.primary, knockback: 0, stun: .04 }, Math.atan2(enemy.y - zone.y, enemy.x - zone.x), false);
      }
      addPulse(zone.x, zone.y, zone.color, zone.radius, .22);
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
    if (attack.kind === "factory-echo") {
      if (attack.classId === "melee") {
        const profile = { ...game.output.primary, arc: game.output.primary.arc * .9 };
        executeSlash(profile, attack.angle, attack.damageScale, true, { synthetic: true, x: attack.x, y: attack.y, direction: 0 });
      }
      if (attack.classId === "sniper") {
        spawnRailShot(attack.angle, { x: attack.x, y: attack.y, damage: game.output.primary.damage * attack.damageScale, pierce: 0, ricochet: 0, color: "#a48cff" });
      }
      if (attack.classId === "artillery") {
        launchGrenade(attack.angle, {
          x: attack.x, y: attack.y, targetX: attack.targetX, targetY: attack.targetY,
          damage: game.output.primary.damage * attack.damageScale, blastRadius: game.output.primary.blastRadius * .82,
          color: "#a48cff"
        });
      }
      addFloater(attack.x, attack.y - 34, "PROCESS ECHO", "#a48cff");
    }
    if (attack.kind === "guard") {
      const cleared = clearEnemyBulletsNear(attack.x, attack.y, attack.radius || 140);
      if (cleared) addFloater(attack.x, attack.y - 28, "ECHO GUARD ×" + cleared, game.output.build?.color || "#71efad");
      addPulse(attack.x, attack.y, game.output.build?.color || "#71efad", attack.radius || 140, .34);
    }
    if (attack.kind === "hunt") {
      const target = game.enemies.filter((enemy) => !enemy.dead)
        .sort((a, b) => distanceSquared(a, attack) - distanceSquared(b, attack))[0];
      if (target) {
        const angle = Math.atan2(target.y - attack.y, target.x - attack.x);
        const profile = { ...game.output.primary, range: Math.max(game.output.primary.range, 150), arc: 104 };
        executeSlash(profile, angle, attack.damageScale || .82, true, { synthetic: true, x: attack.x, y: attack.y, direction: 0 });
        addPulse(attack.x, attack.y, game.output.build?.color || "#ff7c6b", 72, .28);
      }
    }
    if (attack.kind === "slash" || attack.kind === "spin") {
      const profile = { ...game.output.primary, arc: attack.kind === "spin" ? 360 : 112 };
      executeSlash(profile, attack.angle, attack.damageScale, true, { synthetic: true, x: attack.x, y: attack.y, direction: 0 });
      if (attack.aftershock) {
        createPlayerExplosion(attack.x + Math.cos(attack.angle) * 70, attack.y + Math.sin(attack.angle) * 70, 12, 66, { noAugments: true, source: "aftershock" });
        noteProtocol("aftershock");
      }
      if (attack.guardPulse) {
        clearEnemyBulletsNear(attack.x, attack.y, 118);
        noteProtocol("phantom_guard");
      }
    }
    if (attack.kind === "drone") {
      const targets = game.enemies.filter((enemy) => !enemy.dead);
      const target = targets.sort((a, b) =>
        (attack.cold ? Number(b.slowed) - Number(a.slowed) : 0) || distanceSquared(a, attack) - distanceSquared(b, attack)
      )[0];
      if (target) {
        const spectral = hasSynergy("spectral_observer") || hasPlaystyle("hunter", 3);
        spawnRailShot(Math.atan2(target.y - attack.y, target.x - attack.x), { x: attack.x, y: attack.y, damage: spectral ? 24 : 16, drone: true, homing: true, charged: spectral, pierce: spectral ? 99 : 0, color: spectral ? "#a48cff" : "#71efad" });
        if (hasTrait("s_drone")) noteAugment("s_drone");
        if (attack.cold) noteProtocol("cold_observer");
        if (spectral) noteProtocol("spectral_observer");
      }
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

function createAuditEnemy(id, x, y, hp, maxHp) {
  const maximum = maxHp || hp || 100;
  return {
    id, type: "drone", x, y, renderX: x, renderY: y, hp: hp || maximum, maxHp: maximum, radius: 15, damage: 4, xp: 0,
    color: "#e95757", dead: false, flash: 0, stun: 0, duelMark: 0, markDirection: 0, sniperMark: 0,
    attackCooldown: 99, shootCooldown: 99, chargeCooldown: 99, shootWindup: 0, chargeWindup: 0,
    chargeTime: 0, chargeAngle: 0, burnTime: 0, burnDps: 0, bleedTime: 0, bleedDps: 0, slowed: false
  };
}

function createAuditPlayer() {
  return {
    x: 300, y: 500, renderX: 300, renderY: 500, radius: 17, hp: 80, maxHp: 100, level: 1, speed: 225,
    aim: 0, facing: 0, weaponFacing: 0, aimHold: 0, bufferedAim: null,
    attackCooldown: 0, dashCooldown: 0, dashTime: 0, invulnerable: 0, combo: 0, slash: null,
    nextSwingDirection: 1, swingCount: 0, attackBuffer: 0, shotCount: 0, dashBombCount: 0, rangerVolley: 0,
    stillTime: 2, attackFlash: 0, riposteReady: false, riposteTargetId: null, lastMoveX: 1, lastMoveY: 0
  };
}

function advanceAuditProjectiles(frames, dt) {
  for (let index = 0; index < frames; index += 1) {
    updatePlayerShots(dt);
    updateDelayedAttacks(dt);
    updateZones(dt);
  }
}

function wireInstalledParts(parts) {
  factory.wires = [];
  factory.wireStart = null;
  board.fill(null);
  let column = 1;
  for (const part of parts) {
    const installed = configureAuditPorts(part);
    const footprint = partFootprint(installed);
    while (column + footprint.width > boardCols) extendBoard();
    board[indexOf(column, 0)] = installed;
    column += footprint.width;
  }
  rebuildPhysicalWires();
}

function configureAuditPorts(part) {
  const prepared = { ...part };
  if (partKind(prepared) === "module") prepared.ports = { layout: "lego-augment-random", edges: ["left", "right"] };
  return ensurePartPorts(prepared);
}

function installAuditSequence(classId, reverse) {
  const definitions = SYNERGY_DEFINITIONS[classId];
  const sequence = [definitions[0].types[0], ...definitions.map((item) => item.types[1])];
  if (reverse) sequence.reverse();
  boardCols = Math.max(INITIAL_COLS, sequence.length + 2);
  board.length = boardCols * ROWS;
  board.fill(null);
  const parts = sequence.map((type, index) => {
    const part = { id: 9000 + index, kind: "module", type };
    board[indexOf(index + 1, MAIN_ROW)] = part;
    return part;
  });
  wireInstalledParts(parts);
}

function installPlaystyleSequence(classId, styleId, linkCount) {
  const style = PLAYSTYLES[classId].find((item) => item.id === styleId);
  const definitions = style.protocols.slice(0, linkCount || 3)
    .map((kind) => SYNERGY_DEFINITIONS[classId].find((item) => item.kind === kind));
  const sequence = [definitions[0].types[0], ...definitions.map((item) => item.types[1])];
  boardCols = INITIAL_COLS;
  board.length = boardCols * ROWS;
  board.fill(null);
  const parts = sequence.map((type, index) => {
    const part = { id: 9500 + index, kind: "module", type };
    board[indexOf(index + 1, MAIN_ROW)] = part;
    return part;
  });
  wireInstalledParts(parts);
}

function runFactoryToolAudits() {
  const savedBoard = board.slice();
  const savedCols = boardCols;
  const savedFactory = { wires: factory.wires.slice(), wireStart: factory.wireStart, toolInventory: { ...factory.toolInventory }, pending: factory.pending, nextId: factory.nextId, nextWireId: factory.nextWireId };
  const saved = { selectedClass: game.selectedClass, output: game.output, player: game.player, enemies: game.enemies, toolDrops: game.toolDrops, floaters: game.floaters, pulses: game.pulses, mode: game.mode, room: game.room, nextDropId: game.nextDropId };
  let report;
  try {
    game.selectedClass = "melee";
    game.room = 1;
    boardCols = INITIAL_COLS;
    board.length = boardCols * ROWS;
    board.fill(null);
    factory.wires = [];
    factory.nextWireId = 1;
    const install = (parts) => {
      board.fill(null);
      factory.wires = [];
      let column = 1;
      const installed = parts.map((part) => {
        const next = configureAuditPorts({ ...part, index: undefined });
        const footprint = partFootprint(next);
        while (column + footprint.width > boardCols) extendBoard();
        board[indexOf(column, 0)] = next;
        column += footprint.width;
        return next;
      });
      rebuildPhysicalWires();
      return { installed, output: evaluateClassFactory() };
    };
    const core = { id: 9702, kind: "module", type: "m_mark", index: indexOf(1, 0) };
    board.fill(null);
    factory.wires = [];
    const isolated = ensurePartPorts({ ...core });
    board[isolated.index] = isolated;
    const disconnectedInactive = !evaluateClassFactory().traits.has("m_mark");
    const sourceCircuit = install([core]).output;
    const ampCircuit = install([{ id: 9701, kind: "tool", type: "amplifier", index: indexOf(1, 0) }, { id: 9702, kind: "module", type: "m_mark", index: indexOf(2, 0) }]).output;
    const repeaterCircuit = install([{ id: 9701, kind: "tool", type: "repeater", index: indexOf(1, 0) }, { id: 9702, kind: "module", type: "m_mark", index: indexOf(2, 0) }]).output;
    const inverterCircuit = install([{ id: 9701, kind: "tool", type: "inverter", index: indexOf(1, 0) }, { id: 9702, kind: "module", type: "m_mark", index: indexOf(2, 0) }]).output;
    const terminalFreeActive = sourceCircuit.traits.has("m_mark") && sourceCircuit.connectedCount === 1;
    const toolProcessed = ampCircuit.recipes.get(9702)?.mode === "OVERDRIVE" && ampCircuit.primary.damage > sourceCircuit.primary.damage;
    const advancedToolProcessed = repeaterCircuit.tuning.echo === 1 && inverterCircuit.tuning.utility === 1 && inverterCircuit.guard.armor > 0;
    const branchA = { id: 9703, kind: "module", type: "m_guard", index: indexOf(1, 0) };
    const branchB = { id: 9704, kind: "module", type: "m_spin", index: indexOf(1, 3) };
    board.fill(null);
    factory.wires = [];
    const splitA = ensurePartPorts({ ...branchA });
    const splitB = ensurePartPorts({ ...branchB });
    board[splitA.index] = splitA;
    board[splitB.index] = splitB;
    rebuildPhysicalWires();
    const branchLinesApply = evaluateClassFactory().traits.has("m_guard") && evaluateClassFactory().traits.has("m_spin") && evaluateClassFactory().connectedCount === 2;
    factory.toolInventory = Object.fromEntries(TOOL_TYPES.map((type) => [type, 0]));
    game.mode = "factory";
    factory.pending = null;
    selectToolBlueprint("router");
    const noInfiniteTool = factory.pending === null;
    game.player = createAuditPlayer();
    game.toolDrops = [];
    game.nextDropId = 1;
    const guardianDrop = spawnToolDrop({ id: 711, type: "guardian", x: 300, y: 500 });
    const droppedToWorld = guardianDrop?.type && game.toolDrops.length === 1;
    const stagedToolUnlocks = TOOL_TYPES.filter((type) => TOOLS[type].tier === 1).every((type) => isToolUnlocked(type, 1)) &&
      availableToolTypes(1).every((type) => TOOLS[type].tier === 1) && availableToolTypes(3).includes("focuser") &&
      availableToolTypes(4).includes("splitter") && availableToolTypes(6).includes("repeater") && !availableToolTypes(6).includes("inverter") &&
      availableToolTypes(8).length === TOOL_TYPES.length && TOOLS[guardianDrop.type].tier === 1;
    factory.toolInventory.repeater = 1;
    factory.pending = null;
    selectToolBlueprint("repeater");
    const advancedToolLockedEarly = factory.pending === null;
    game.room = 6;
    selectToolBlueprint("repeater");
    const advancedToolUnlockedLater = factory.pending?.type === "repeater";
    factory.pending = null;
    game.room = 1;
    const beforeDrop = factory.toolInventory.amplifier;
    collectToolDrop({ id: 1, type: "amplifier", x: 300, y: 500, radius: 12 });
    const droppedToolCollected = factory.toolInventory.amplifier === beforeDrop + 1;
    const rarityFootprints = moduleTypes.every((type) => {
      const footprint = partFootprint({ kind: "module", type });
      const rarity = RARITIES[MODULE_RARITIES[type]];
      return Boolean(rarity) && footprint.width === rarity.width && footprint.height === rarity.height && [1, 2, 4].includes(footprint.width);
    });
    const toolThreeWayJackLayout = TOOL_TYPES.every((type) => {
      const part = createPart("tool", type);
      return part.ports.layout === "lego-tool-three-way" && PORT_EDGES.every((edge) => portOffsets(part, edge).length === 1);
    });
    const randomAugmentJackLayout = moduleTypes.every((type) => {
      const part = createPart("module", type);
      const edges = part.ports.edges;
      return part.ports.layout === "lego-augment-random" && edges.length >= 2 && edges.length <= 3 && edges.includes("left") && edges.some((edge) => OUTPUT_EDGES.includes(edge));
    }) && new Set([20001, 20002, 20003, 20004, 20005, 20006].map((id) => ensurePartPorts({ id, kind: "module", type: "m_mark" }).ports.edges.join(","))).size > 1;
    board.fill(null);
    const legendary = createPart("module", moduleTypes.find((type) => MODULE_RARITIES[type] === "legendary"));
    const rare = createPart("module", moduleTypes.find((type) => MODULE_RARITIES[type] === "rare"));
    const legendaryFits = canPlacePart(indexOf(1, 0), legendary);
    board[indexOf(1, 0)] = legendary;
    const footprintCollisionBlocked = !canPlacePart(indexOf(2, 1), rare) && partFootprint(legendary).width === 4 && partFootprint(rare).width === 2;
    const rewired = install([core]);
    const removed = disconnectWire(factory.wires[0]?.id);
    const disconnected = !evaluateClassFactory().traits.has("m_mark");
    rebuildPhysicalWires();
    const restored = evaluateClassFactory().traits.has("m_mark") && factory.wires.length === 1;
    const rewireable = removed && disconnected && restored;
    report = { disconnectedInactive, terminalFreeActive, branchLinesApply, toolProcessed, advancedToolProcessed, noInfiniteTool, droppedToWorld, stagedToolUnlocks, advancedToolLockedEarly, advancedToolUnlockedLater, droppedToolCollected, rarityFootprints, toolThreeWayJackLayout, randomAugmentJackLayout, legendaryFits, footprintCollisionBlocked, rewireable, pass: false };
    report.pass = Object.entries(report).filter(([key]) => key !== "pass").every(([, value]) => Boolean(value));
  } finally {
    boardCols = savedCols;
    board.length = savedBoard.length;
    savedBoard.forEach((part, index) => { board[index] = part; });
    factory.wires = savedFactory.wires;
    factory.wireStart = savedFactory.wireStart;
    factory.toolInventory = savedFactory.toolInventory;
    factory.pending = savedFactory.pending;
    factory.nextId = savedFactory.nextId;
    factory.nextWireId = savedFactory.nextWireId;
    Object.assign(game, saved);
  }
  return report;
}
function runPlaystyleAudits() {
  const savedBoard = board.slice();
  const savedCols = boardCols;
  const saved = {
    selectedClass: game.selectedClass, output: game.output, player: game.player, enemies: game.enemies,
    enemyBullets: game.enemyBullets, playerShots: game.playerShots, zones: game.zones,
    delayedAttacks: game.delayedAttacks, orbitals: game.orbitals, particles: game.particles,
    floaters: game.floaters, pulses: game.pulses, echoes: game.echoes, mouse: game.mouse,
    mode: game.mode, dashRequested: game.dashRequested, attackRequested: game.attackRequested,
    kills: game.kills, xp: game.xp, levelUpQueued: game.levelUpQueued, shake: game.shake,
    hitConfirm: game.hitConfirm, missPulse: game.missPulse,
    augmentEvents: game.augmentEvents, protocolEvents: game.protocolEvents
  };
  const reports = [];
  try {
    for (const [classId, styles] of Object.entries(PLAYSTYLES)) {
      for (const style of styles) {
        game.selectedClass = classId;
        const tiers = [1, 2, 3].map((tier) => {
          installPlaystyleSequence(classId, style.id, tier);
          const output = evaluateClassFactory();
          return output.build?.id === style.id && output.build?.tier === tier && output.build?.depth === tier + 1;
        });
        installPlaystyleSequence(classId, style.id, 3);
        game.output = evaluateClassFactory();
        game.player = createAuditPlayer();
        game.enemies = [];
        game.enemyBullets = [];
        game.playerShots = [];
        game.zones = [];
        game.delayedAttacks = [];
        game.orbitals = [];
        game.particles = [];
        game.floaters = [];
        game.pulses = [];
        game.echoes = [];
        game.mouse = { x: 620, y: 500 };
        game.mode = "playing";
        game.dashRequested = false;
        game.attackRequested = false;
        let mechanic = false;
        if (style.id === "pursuit") {
          game.enemies = [createAuditEnemy(101, 560, 500, 200, 200)];
          startSlash(0);
          mechanic = game.player.x > 400;
        }
        if (style.id === "maelstrom") {
          startSlash(0);
          mechanic = game.player.slash?.arc === 265;
        }
        if (style.id === "counter") {
          game.enemyBullets = [{ x: 300, y: 500, vx: 0, vy: 0, radius: 5, damage: 1, life: 2, dead: false }];
          startSlash(0);
          mechanic = game.enemyBullets[0].dead && game.playerShots.length === 3;
        }
        if (style.id === "deadeye") {
          startSlash(0);
          mechanic = game.playerShots[0]?.charged && game.playerShots[0]?.pierce === 99 && game.player.attackCooldown > game.output.primary.cooldown;
        }
        if (style.id === "hunter") {
          game.enemies = [createAuditEnemy(111, 430, 470, 200, 200), createAuditEnemy(112, 470, 500, 200, 200), createAuditEnemy(113, 430, 530, 200, 200)];
          startSlash(0);
          mechanic = game.playerShots.length === 3 && game.playerShots.every((shot) => shot.homing);
        }
        if (style.id === "ranger") {
          game.enemies = [createAuditEnemy(121, 350, 500, 200, 200)];
          startSlash(0);
          advanceAuditProjectiles(12, .01);
          mechanic = game.zones.some((zone) => zone.kind === "slow");
        }
        if (style.id === "inferno") {
          game.enemies = [createAuditEnemy(131, 410, 500, 200, 200)];
          createPlayerExplosion(400, 500, 12, 90);
          mechanic = game.zones.some((zone) => zone.kind === "fire" && zone.vortex && zone.wildfire && zone.life > 5);
        }
        if (style.id === "cascade") {
          game.enemies = [createAuditEnemy(141, 410, 500, 200, 200)];
          createPlayerExplosion(400, 500, 12, 90);
          mechanic = game.playerShots.length >= 13 && game.delayedAttacks.some((attack) => attack.kind === "explosion");
        }
        if (style.id === "orbital") {
          game.enemies = [createAuditEnemy(151, 510, 500, 200, 200)];
          createPlayerExplosion(400, 500, 12, 90);
          mechanic = game.orbitals.length === 3;
        }
        const classified = game.output.build?.id === style.id && game.output.build?.tier === 3;
        const expectedRam = modulesOnBoard().reduce((total, module) => total + MODULE_RAM[module.type], 0) + game.output.protocolRoutes.length * PROTOCOL_RAM;
        const ramAccounted = ramUsage(game.output) === expectedRam;
        const tiered = tiers.every(Boolean);
        reports.push({ classId, styleId: style.id, classified, tiered, mechanic, ramAccounted, pass: classified && tiered && mechanic && ramAccounted });
      }
    }
  } finally {
    boardCols = savedCols;
    board.length = savedBoard.length;
    savedBoard.forEach((module, index) => { board[index] = module; });
    Object.assign(game, saved);
  }
  return reports;
}

function auditMeleeRuntime() {
  game.enemies = [createAuditEnemy(1, 410, 500, 260, 260), createAuditEnemy(2, 470, 520, 180, 180)];
  for (let index = 0; index < 3; index += 1) {
    game.player.attackCooldown = 0;
    startSlash();
  }
  updateDelayedAttacks(.3);

  const victim = createAuditEnemy(3, game.player.x + 52, game.player.y, 50, 200);
  game.enemies = [victim];
  executeSlash({ ...game.output.primary, crit: 0 }, 0, 1, false, { direction: 1, finisher: true });
  updateDelayedAttacks(.2);

  const attacker = createAuditEnemy(4, game.player.x + 75, game.player.y, 200, 200);
  game.enemies = [attacker];
  game.player.invulnerable = 0;
  damagePlayer(1, attacker.x, attacker.y);
  game.player.attackCooldown = 0;
  startSlash();
  game.enemyBullets = [{ x: game.player.x, y: game.player.y, vx: 0, vy: 0, radius: 5, damage: 1, life: 2, dead: false }];
  updateEnemyBullets(0);

  game.player.dashCooldown = 0;
  game.player.dashTime = 0;
  game.dashRequested = true;
  updatePlayer(.016);
  game.enemyBullets = [{ x: game.player.x - 10, y: game.player.y, vx: 0, vy: 0, radius: 5, damage: 1, life: 2, dead: false }];
  updateDelayedAttacks(.3);
}

function auditSniperRuntime() {
  game.enemies = [
    createAuditEnemy(11, 420, 500, 220, 220), createAuditEnemy(12, 520, 500, 220, 220),
    createAuditEnemy(13, 620, 500, 220, 220), createAuditEnemy(14, 700, 560, 220, 220)
  ];
  game.player.stillTime = 2;
  fireSniperAttack(0);
  advanceAuditProjectiles(90, .012);

  game.playerShots = [];
  game.enemies = [
    createAuditEnemy(15, 400, 500, 200, 200), createAuditEnemy(16, 475, 500, 200, 200),
    createAuditEnemy(17, 550, 500, 200, 200), createAuditEnemy(18, 625, 500, 200, 200),
    createAuditEnemy(19, 625, 575, 200, 200), createAuditEnemy(20, 700, 575, 200, 200)
  ];
  game.enemies[0].sniperMark = 5;
  spawnRailShot(0, { pierce: 1, ricochet: 1, homing: false, damage: 10 });
  advanceAuditProjectiles(140, .01);

  game.playerShots = [];
  game.enemies = [createAuditEnemy(21, 450, 470, 200, 200), createAuditEnemy(22, 450, 530, 200, 200)];
  game.player.shotCount = 1;
  fireSniperAttack(0);
  game.player.shotCount = 2;
  fireSniperAttack(0);
  game.enemies.push(createAuditEnemy(23, game.player.x, game.player.y, 200, 200));
  updateZones(.02);

  game.player.dashCooldown = 0;
  game.player.dashTime = 0;
  game.dashRequested = true;
  updatePlayer(.016);

  game.playerShots = [];
  game.delayedAttacks = [];
  game.enemies = [createAuditEnemy(24, 390, game.player.y, 1, 1), createAuditEnemy(25, 520, game.player.y, 200, 200)];
  spawnRailShot(0, { damage: 100, pierce: 0, ricochet: 0, homing: false });
  advanceAuditProjectiles(25, .01);
  updateDelayedAttacks(.3);
}

function auditArtilleryRuntime() {
  game.mouse = { x: 560, y: 500 };
  game.enemies = [
    createAuditEnemy(31, 390, 500, 120, 120), createAuditEnemy(32, 420, 510, 8, 80),
    createAuditEnemy(33, 450, 490, 8, 80), createAuditEnemy(34, 500, 520, 100, 100)
  ];
  launchGrenade(0, { targetX: 560, targetY: 500, damage: 28, blastRadius: 96 });
  for (let index = 0; index < 30; index += 1) {
    updatePlayerShots(.01);
    const attached = game.playerShots.find((shot) => shot.kind === "grenade" && shot.attachedId);
    if (attached) {
      const target = game.enemies.find((enemy) => enemy.id === attached.attachedId);
      if (target) target.dead = true;
      updatePlayerShots(.01);
      break;
    }
  }
  const fireZone = game.zones.find((zone) => zone.kind === "fire");
  if (fireZone) {
    game.enemies.push(createAuditEnemy(35, fireZone.x, fireZone.y, 4, 40));
    updateZones(.31);
  }
  advanceAuditProjectiles(100, .012);

  game.enemies.push(createAuditEnemy(36, 520, 500, 300, 300));
  game.player.shotCount = 2;
  fireArtilleryAttack(0);
  advanceAuditProjectiles(90, .012);

  for (let index = 0; index < 3; index += 1) {
    game.player.dashCooldown = 0;
    game.player.dashTime = 0;
    game.dashRequested = true;
    updatePlayer(.016);
    advanceAuditProjectiles(5, .02);
  }
  advanceAuditProjectiles(100, .012);
}

function runAugmentAuditForClass(classId) {
  const savedBoard = board.slice();
  const savedCols = boardCols;
  const saved = {
    selectedClass: game.selectedClass, output: game.output, player: game.player, enemies: game.enemies,
    enemyBullets: game.enemyBullets, playerShots: game.playerShots, zones: game.zones,
    delayedAttacks: game.delayedAttacks, orbitals: game.orbitals, particles: game.particles,
    floaters: game.floaters, pulses: game.pulses, echoes: game.echoes, mouse: game.mouse,
    mode: game.mode, kills: game.kills, xp: game.xp, levelUpQueued: game.levelUpQueued,
    dashRequested: game.dashRequested, attackRequested: game.attackRequested,
    augmentEvents: game.augmentEvents, protocolEvents: game.protocolEvents
  };
  let report;
  try {
    game.selectedClass = classId;
    installAuditSequence(classId, false);
    game.output = evaluateClassFactory();
    const forwardKinds = [...game.output.synergyKinds];
    const forwardDepth = game.output.sequenceDepth;
    installAuditSequence(classId, true);
    const reverseKinds = [...evaluateClassFactory().synergyKinds];
    installAuditSequence(classId, false);
    game.output = evaluateClassFactory();
    game.player = createAuditPlayer();
    game.enemies = [];
    game.enemyBullets = [];
    game.playerShots = [];
    game.zones = [];
    game.delayedAttacks = [];
    game.orbitals = [];
    game.particles = [];
    game.floaters = [];
    game.pulses = [];
    game.echoes = [];
    game.mouse = { x: 600, y: 500 };
    game.mode = "playing";
    game.kills = 0;
    game.xp = 0;
    game.levelUpQueued = false;
    game.dashRequested = false;
    game.attackRequested = false;
    game.augmentEvents = {};
    game.protocolEvents = {};
    if (classId === "melee") auditMeleeRuntime();
    if (classId === "sniper") auditSniperRuntime();
    if (classId === "artillery") auditArtilleryRuntime();
    const moduleIds = classModuleTypes(classId);
    const protocolIds = SYNERGY_DEFINITIONS[classId].map((item) => item.kind);
    report = {
      classId, modules: moduleIds.length, protocols: protocolIds.length, forwardDepth,
      reverseProtocols: reverseKinds.length,
      missingModules: moduleIds.filter((id) => !game.augmentEvents[id]),
      missingProtocols: protocolIds.filter((id) => !game.protocolEvents[id]),
      forwardProtocols: forwardKinds.length,
      events: { ...game.augmentEvents }, protocolEvents: { ...game.protocolEvents }
    };
    report.pass = report.modules === 10 && report.protocols === 10 && report.forwardProtocols === 10 &&
      report.forwardDepth === 11 && report.reverseProtocols === 0 && !report.missingModules.length && !report.missingProtocols.length;
  } finally {
    boardCols = savedCols;
    board.length = savedBoard.length;
    savedBoard.forEach((module, index) => { board[index] = module; });
    Object.assign(game, saved);
  }
  return report;
}

function runAllAugmentAudits() {
  const reports = ["melee", "sniper", "artillery"].map(runAugmentAuditForClass);
  const playstyles = runPlaystyleAudits();
  const factoryTools = runFactoryToolAudits();
  const pass = reports.every((report) => report.pass) && playstyles.every((report) => report.pass) && factoryTools.pass;
  canvas.dataset.auditReport = JSON.stringify({ pass, reports, playstyles, factoryTools });
  canvas.dataset.auditStatus = pass ? "pass" : "fail";
  const result = $("#test-audit-result");
  result.textContent = pass ? "30 증강 · 드랍 도구 6종 · 단자 회로 · 9 빌드 PASS" : "FAIL · 콘솔 진단 확인";
  result.classList.toggle("failed", !pass);
  return { pass, reports, playstyles, factoryTools };
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
      const drag = Math.exp(-9 * dt);
      particle.vx *= drag;
      particle.vy *= drag;
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
  const combatDt = game.hitStop > 0 ? dt * .14 : dt;
  game.hitStop = Math.max(0, game.hitStop - dt);
  game.time += combatDt;
  game.roomBanner -= combatDt;
  game.doorPulse += combatDt;
  updatePlayer(combatDt);
  updateToolDrops(combatDt);
  updateEnemies(combatDt);
  updateEnemyBullets(combatDt);
  updatePlayerShots(combatDt);
  updateZones(combatDt);
  updateDelayedAttacks(combatDt);
  updateEchoes(combatDt);
  updateEffects(dt);
  game.enemies = game.enemies.filter((enemy) => !enemy.dead);
  game.shake = Math.max(0, game.shake - dt * 36);
  const cameraBlend = smoothFactor(32, dt);
  const shakeX = game.shake > 0 ? (Math.random() - .5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - .5) * game.shake : 0;
  game.cameraOffsetX += (shakeX - game.cameraOffsetX) * cameraBlend;
  game.cameraOffsetY += (shakeY - game.cameraOffsetY) * cameraBlend;
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
  const drawX = enemy.renderX ?? enemy.x;
  const drawY = enemy.renderY ?? enemy.y;
  ctx.save();
  ctx.translate(drawX, drawY);
  const critical = enemy.critical > 0;
  const flash = enemy.flash > 0;
  if (critical) ctx.scale(1.11, 1.11);
  ctx.shadowBlur = critical ? 34 : flash ? 22 : 10;
  ctx.shadowColor = critical ? "#f6dc66" : enemy.color;
  ctx.fillStyle = critical ? "#fff5b8" : flash ? "#ffffff" : enemy.color;
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
    ctx.rotate(Math.atan2((game.player.renderY ?? game.player.y) - drawY, (game.player.renderX ?? game.player.x) - drawX));
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
  if (enemy.critical > 0) {
    ctx.globalAlpha = clamp(enemy.critical / .22, 0, 1);
    ctx.strokeStyle = "#f6dc66";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(drawX, drawY, enemy.radius + 10, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (enemy.duelMark > 0) {
    ctx.strokeStyle = enemy.markDirection > 0 ? "#58d7d3" : "#a48cff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(drawX, drawY, enemy.radius + 7, -.8, 2.3); ctx.stroke();
  }
  if (enemy.sniperMark > 0) {
    ctx.strokeStyle = "#ef70c4";
    ctx.lineWidth = 2;
    ctx.strokeRect(drawX - enemy.radius - 6, drawY - enemy.radius - 6, enemy.radius * 2 + 12, enemy.radius * 2 + 12);
  }
  if (enemy.slowed) {
    ctx.strokeStyle = "rgba(87,216,238,.7)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(drawX, drawY, enemy.radius + 4, 0, Math.PI * 2); ctx.stroke();
  }
  const width = enemy.radius * 2.2;
  ctx.fillStyle = "#1a0d10";
  ctx.fillRect(drawX - width * .5, drawY - enemy.radius - 12, width, 4);
  ctx.fillStyle = enemy.color;
  ctx.fillRect(drawX - width * .5, drawY - enemy.radius - 12, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 4);
}

function drawRobot() {
  const player = game.player;
  ctx.save();
  ctx.translate(player.renderX ?? player.x, player.renderY ?? player.y);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2) ctx.globalAlpha = .42;
  ctx.save();
  ctx.rotate(player.facing);
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
  ctx.restore();
  const attackReady = 1 - clamp(player.attackCooldown / game.output.primary.cooldown, 0, 1);
  const dashReady = 1 - clamp(player.dashCooldown / game.output.guard.dashCooldown, 0, 1);
  const classColor = game.output.build?.color || CLASS_PROFILES[game.selectedClass].color;
  ctx.save();
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
  ctx.save();
  ctx.rotate(player.weaponFacing);
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
      const glow = ctx.createRadialGradient(shot.x - shot.radius * .3, shot.y - shot.radius * .3, 1, shot.x, shot.y, shot.radius * 1.4);
      glow.addColorStop(0, "#fff9dd");
      glow.addColorStop(.35, shot.color);
      glow.addColorStop(1, "rgba(8,12,13,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff5d0";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius + 4 + Math.sin(game.time * 12) * 2, 0, Math.PI * 2); ctx.stroke();
    } else {
      const speed = Math.hypot(shot.vx, shot.vy) || 1;
      const tail = shot.charged ? 76 : shot.kind === "shrapnel" ? 18 : 38;
      const tailX = shot.x - shot.vx / speed * tail;
      const tailY = shot.y - shot.vy / speed * tail;
      const streak = ctx.createLinearGradient(tailX, tailY, shot.x, shot.y);
      streak.addColorStop(0, "rgba(255,255,255,0)");
      streak.addColorStop(.58, shot.color);
      streak.addColorStop(1, "#ffffff");
      ctx.strokeStyle = streak;
      ctx.lineWidth = shot.charged ? 7 : shot.kind === "shrapnel" ? 2 : 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(shot.x, shot.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  for (const bullet of game.enemyBullets) {
    const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
    ctx.strokeStyle = "rgba(255,69,61,.42)";
    ctx.lineWidth = bullet.radius * .9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - bullet.vx / speed * 16, bullet.y - bullet.vy / speed * 16);
    ctx.stroke();
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
    const eased = 1 - (1 - progress) ** 3;
    ctx.globalAlpha = (1 - progress) * .75;
    ctx.strokeStyle = pulse.color;
    ctx.lineWidth = 3 * (1 - progress) + .5;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, 6 + pulse.radius * eased, 0, Math.PI * 2);
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
    } else if (particle.spark) {
      const radius = particle.size * 1.25;
      ctx.lineWidth = Math.max(1, particle.size * .46);
      ctx.beginPath();
      ctx.moveTo(particle.x - radius, particle.y); ctx.lineTo(particle.x + radius, particle.y);
      ctx.moveTo(particle.x, particle.y - radius); ctx.lineTo(particle.x, particle.y + radius);
      ctx.stroke();
    } else {
      ctx.lineCap = "round";
      ctx.lineWidth = particle.size;
      ctx.globalAlpha = alpha * .55;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x - particle.vx * .022, particle.y - particle.vy * .022);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, Math.max(.6, particle.size * .42), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  for (const floater of game.floaters) {
    const lifeRatio = clamp(floater.life / floater.maxLife, 0, 1);
    ctx.globalAlpha = lifeRatio * lifeRatio;
    ctx.fillStyle = floater.color;
    ctx.font = floater.critical ? "900 18px monospace" : "700 11px monospace";
    ctx.shadowBlur = floater.critical ? 14 : 0;
    ctx.shadowColor = floater.critical ? "#f6dc66" : "transparent";
    ctx.fillText(floater.text, floater.x, floater.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
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
  const x = clamp(game.cursorX, bounds.left + 8, bounds.right - 8);
  const y = clamp(game.cursorY, bounds.top + 8, bounds.bottom - 8);
  const ready = 1 - clamp(game.player.attackCooldown / game.output.primary.cooldown, 0, 1);
  const radius = game.hitConfirm > 0 ? 13 : 10 + game.missPulse * 18;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = game.hitConfirm > 0 ? "#f6dc66" : ready >= .999 ? (game.output.build?.color || CLASS_PROFILES[game.selectedClass].color) : "rgba(164,184,187,.72)";
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
  ctx.translate(game.cameraOffsetX, game.cameraOffsetY);
  drawArena();
  drawZones();
  drawToolDrops();
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
  $("#objective-text").textContent = game.roomCleared ? "북쪽 출구로 이동" : "적 전멸";
  $("#objective-count").textContent = game.roomCleared ? "GATE OPEN" : game.enemies.length + " TARGET" + (game.enemies.length === 1 ? "" : "S");
  $("#combat-objective").classList.toggle("complete", game.roomCleared);
  $("#attack-ready-fill").style.width = attackRatio * 100 + "%";
  $("#dash-ready-fill").style.width = dashRatio * 100 + "%";
  $("#attack-status").textContent = attackRatio >= .999 ? "READY" : Math.max(0, game.player.attackCooldown).toFixed(1) + "s";
  $("#dash-status").textContent = dashRatio >= .999 ? "READY" : Math.max(0, game.player.dashCooldown).toFixed(1) + "s";
  $("#attack-ability").classList.toggle("ready", attackRatio >= .999);
  $("#dash-ability").classList.toggle("ready", dashRatio >= .999);
  const build = game.output.build;
  const tuning = game.output.tuning;
  const buildSignature = $("#build-signature");
  buildSignature.hidden = !build && !game.output.activeCount;
  if (build || game.output.activeCount) {
    buildSignature.style.setProperty("--build-color", build?.color || CLASS_PROFILES[game.selectedClass].color);
    $("#build-tier").textContent = tuning.mode + " FACTORY" + (build ? " · TIER " + ["0", "I", "II", "III"][build.tier] : "") + " · " + Math.round(tuning.throughput * 100) + "% FLOW";
    $("#build-name").textContent = build?.name || "가공 증강 " + game.output.activeCount + "기";
    const buildEffectText = (build?.tiers[build.tier - 1] || ("피해 ×" + tuning.damageMult.toFixed(2) + " · 주기 ×" + tuning.cooldownMult.toFixed(2) + (tuning.echo ? " · 지연 복제" : ""))) + " · CRIT " + Math.round(game.output.primary.crit * 100) + "%";
    $("#build-effect").textContent = buildEffectText;
    $("#build-effect").title = buildEffectText;
  }
  $("#attack-name").textContent = build?.attackName || CLASS_PROFILES[game.selectedClass].attackName;
  $("#game").style.setProperty("--active-build-color", build?.color || CLASS_PROFILES[game.selectedClass].color);
  $("#game").classList.toggle("low-health", healthRatio > 0 && healthRatio <= .3 && game.mode === "playing");
  canvas.dataset.combatClass = game.selectedClass;
  canvas.dataset.activeTraits = [...game.output.traits].join(",");
  canvas.dataset.synergies = [...game.output.synergyKinds].join(",");
  canvas.dataset.protocolLinks = String(game.output.protocolRoutes.length);
  canvas.dataset.sequenceDepth = String(game.output.sequenceDepth);
  canvas.dataset.playstyle = build?.id || "base";
  canvas.dataset.playstyleTier = String(build?.tier || 0);
  canvas.dataset.factoryMode = tuning.mode;
  canvas.dataset.factoryThroughput = tuning.throughput.toFixed(2);
  canvas.dataset.factoryDamage = tuning.damageMult.toFixed(2);
  canvas.dataset.factoryEcho = String(tuning.echo);
  canvas.dataset.activeTools = String(game.output.activeToolCount);
  canvas.dataset.ramUsage = String(ramUsage(game.output));
  canvas.dataset.ramCapacity = String(ramCapacity());
  canvas.dataset.playerShots = String(game.playerShots.length);
  canvas.dataset.zones = String(game.zones.length);
  canvas.dataset.delayedAttacks = String(game.delayedAttacks.length);
  canvas.dataset.orbitals = String(game.orbitals.length);
  canvas.dataset.bodyFacing = game.player.facing.toFixed(4);
  canvas.dataset.attackFacing = game.player.aim.toFixed(4);
  canvas.dataset.weaponFacing = game.player.weaponFacing.toFixed(4);
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
$("#pending-archive").addEventListener("click", archivePending);
$("#factory-tools").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool-type]");
  if (button) selectToolBlueprint(button.dataset.toolType);
});
$("#reserve-parts").addEventListener("click", (event) => {
  const button = event.target.closest("[data-reserve-id]");
  if (button) activateReserve(Number(button.dataset.reserveId));
});

$("#factory-board").addEventListener("click", (event) => {
  if (performance.now() < factory.ignoreBoardClickUntil) return;
  const storeButton = event.target.closest("[data-store-index]");
  if (storeButton) {
    event.stopPropagation();
    storeBoardModule(Number(storeButton.dataset.storeIndex));
    return;
  }
  if (event.target.closest("[data-port-owner]")) return;
  const cell = event.target.closest("[data-cell-index]");
  if (!cell) return;
  const index = Number(cell.dataset.cellIndex);
  if (!isPlaceable(index)) return;
  if (factory.pending) { placePending(index); return; }
  if (anchorIndexAt(index) >= 0) liftBoardPart(index);
});
$("#factory-board").addEventListener("pointerdown", (event) => {
  const token = event.target.closest("[data-part-id]");
  if (!token) return;
  const from = board.findIndex((part) => part?.id === Number(token.dataset.partId));
  if (from >= 0) queuePointerDrag(event, { kind: "board", from, id: Number(token.dataset.partId) }, token);
});
$("#pending-part").addEventListener("pointerdown", (event) => {
  const pending = event.target.closest("[data-pending-module]");
  if (pending && factory.pending) queuePointerDrag(event, { kind: "pending" }, pending);
});
$("#factory-tools").addEventListener("pointerdown", (event) => {
  const tool = event.target.closest("[data-tool-type]");
  const type = tool?.dataset.toolType;
  if (tool && type && !factory.pending && isToolUnlocked(type) && (factory.toolInventory[type] || 0)) queuePointerDrag(event, { kind: "tool-palette", type }, tool);
});
$("#reserve-parts").addEventListener("pointerdown", (event) => {
  const reserve = event.target.closest("[data-reserve-id]");
  if (reserve && !factory.pending) queuePointerDrag(event, { kind: "reserve", id: Number(reserve.dataset.reserveId) }, reserve);
});
window.addEventListener("pointermove", updatePointerDrag);
window.addEventListener("pointerup", finishPointerDrag);

$("#factory-board").addEventListener("dragstart", (event) => {
  const token = event.target.closest("[data-part-id]");
  if (!token) return;
  const from = board.findIndex((part) => part?.id === Number(token.dataset.partId));
  if (from < 0) { event.preventDefault(); return; }
  factory.dragged = { kind: "board", from, id: Number(token.dataset.partId) };
  event.dataTransfer?.setData("text/plain", "board:" + from);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  token.classList.add("is-dragging");
});

$("#factory-board").addEventListener("contextmenu", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (!cell) return;
  const index = Number(cell.dataset.cellIndex);
  const part = board[index];
  if (!part || partKind(part) !== "tool" || !TOOLS[part.type]?.rotatable) return;
  event.preventDefault();
  rotateBoardTool(index);
});

$("#pending-part").addEventListener("dragstart", (event) => {
  const pending = event.target.closest("[data-pending-module]");
  if (!pending || !factory.pending) return;
  factory.dragged = { kind: "pending" };
  event.dataTransfer?.setData("text/plain", "pending");
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  pending.classList.add("is-dragging");
});

$("#factory-tools").addEventListener("dragstart", (event) => {
  const tool = event.target.closest("[data-tool-type]");
  const type = tool?.dataset.toolType;
  if (!tool || !type || factory.pending || !isToolUnlocked(type) || !(factory.toolInventory[type] || 0)) { event.preventDefault(); return; }
  factory.dragged = { kind: "tool-palette", type };
  event.dataTransfer?.setData("text/plain", "tool:" + type);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  tool.classList.add("is-dragging");
});

$("#reserve-parts").addEventListener("dragstart", (event) => {
  const reserve = event.target.closest("[data-reserve-id]");
  if (!reserve || factory.pending) { event.preventDefault(); return; }
  factory.dragged = { kind: "reserve", id: Number(reserve.dataset.reserveId) };
  event.dataTransfer?.setData("text/plain", "reserve:" + reserve.dataset.reserveId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  reserve.classList.add("is-dragging");
});

$("#factory-board").addEventListener("dragover", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (!cell || !factory.dragged || !isPlaceable(Number(cell.dataset.cellIndex))) return;
  event.preventDefault();
  const valid = dragTargetIsValid(Number(cell.dataset.cellIndex));
  if (event.dataTransfer) event.dataTransfer.dropEffect = valid ? "move" : "none";
  showDragFeedback(cell, valid);
});

$("#factory-board").addEventListener("dragleave", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (cell && !cell.contains(event.relatedTarget)) clearDragFeedback();
});

$("#factory-board").addEventListener("drop", (event) => {
  const cell = event.target.closest("[data-cell-index]");
  if (!cell || !factory.dragged) return;
  event.preventDefault();
  completeFactoryDrop(Number(cell.dataset.cellIndex));
});

for (const dragSource of [$("#factory-board"), $("#pending-part"), $("#factory-tools"), $("#reserve-parts")]) {
  dragSource.addEventListener("dragend", finishFactoryDrag);
}
$("#board-expand").addEventListener("click", () => {
  extendBoard();
  factory.placementNotice = "보드를 " + EXTEND_BY + "칸 확장했습니다. 오른쪽으로 계속 배치할 수 있습니다.";
  renderFactoryBoard();
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
  if (event.code === "KeyR" && game.mode === "factory" && factory.selectedIndex !== null) {
    rotateBoardTool(factory.selectedIndex);
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
  $("#test-audit").addEventListener("click", () => {
    const audit = runAllAugmentAudits();
    console.table(audit.reports.map((report) => ({
      classId: report.classId,
      pass: report.pass,
      modules: report.modules - report.missingModules.length,
      protocols: report.protocols - report.missingProtocols.length,
      forwardLinks: report.forwardProtocols,
      reverseLinks: report.reverseProtocols,
      missingModules: report.missingModules.join(", "),
      missingProtocols: report.missingProtocols.join(", ")
    })));
  });
  $("#test-module-buttons").addEventListener("click", (event) => {
    const button = event.target.closest("[data-test-module]");
    if (!button || game.mode !== "playing") return;
    factory.pending = createPart("module", button.dataset.testModule);
    openFactory(false);
  });
}

resizeCanvas();
game.output = evaluateClassFactory();
requestAnimationFrame(frame);
