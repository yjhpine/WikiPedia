// Chapter 1 data. The player solves each case from connected archive records,
// rather than from a separate quiz screen.
export const verticalSlice = {
  startDocument: "C-001",
  documents: [
    {
      id: "L-017", type: "L", typeName: "LOCATION", title: "제4관찰소", access: 0,
      searchTerms: ["관찰석", "B석", "OBS-14/B", "사고", "배치"],
      meta: [["CLASS", "LOCATION"], ["RISK", "YELLOW"], ["IMPACT", "INFO / TEMP"], ["UPDATED", "2026.08.12"], ["AUTHOR", "시설기록과"], ["STATUS", "RESTRICTED"]],
      sections: [
        { heading: "개요", text: "본부 지하 1층의 관찰·기록실. 중앙 콘솔, 관찰석 A~K 11개, 이중 출입문, 장비 반납 보관함으로 구성된다. [[I-014|I-014 사고]] 이후 일반 인원 출입은 정지됐다." },
        {
          heading: "배치 기록",
          text: "관찰석 B 식별자는 <b>OBS-14/B</b>다. 마지막 정식 배치자의 기록은 [[P-003|이전 담당자 파일]]로 분리 보관되어 있으며, 전근 후 자리는 비어 있다. 현재 사용자가 앉아 있는 자리는 B석이다.",
          cloze: { caseId: "C-001", before: "OBS-14/B의 원래 담당자는", after: "이다.", placeholder: "이름 또는 문서 ID" }
        },
        { heading: "I-014 대조 로그", text: "사고 시각 외부 출입문은 <b>10개 유효 배지 통과</b>만 기록했으나, 내부 좌석 센서는 A~K <b>11개 점유 신호</b>를 기록했다. 사고 뒤 장비 반납 로그에는 ‘기록 보조 / 보관함 N-04 / 수기 노트 1권’이 남았지만 공식 근무표의 이름 열과 연결되지 않는다." },
        { heading: "수정 기록", text: "K석 신호의 원시값은 삭제되지 않고 보류 처리됐다. 보존 책임자는 [[P-009|P-009 유해진]]이다." }
      ],
      related: [["P-003", "관찰석 B의 원래 담당자"], ["I-014", "사고 보고서"], ["P-004", "N-04 보관함 소유자"], ["A-027", "03:17 콘솔 공백"]]
    },
    {
      id: "P-003", type: "P", typeName: "PERSON", title: "정수민", access: 0, listed: false,
      searchTerms: ["정수민", "관찰 담당", "OBS-14/B", "전근", "B석"],
      meta: [["CLASS", "PERSON"], ["ROLE", "관찰 담당"], ["LAST POST", "OBS-14/B"], ["UPDATED", "2026.08.08"], ["AUTHOR", "인사기록과"], ["STATUS", "TRANSFERRED"]],
      sections: [
        { heading: "인물 기록", text: "제4관찰소의 전 관찰 담당. 마지막 배치 코드는 <b>OBS-14/B</b>이며 [[L-017|L-017 관찰석 B]]를 사용했다. [[I-014|I-014 사고]] 사흘 전 타 부서 전근 처리됐다." },
        { heading: "배치 해제", text: "전근이 완전히 처리되기 전까지 B석의 물리 명패는 제거되지 않았다. 따라서 현재 빈 B석은 새로 배정된 자리가 아니라 <b>정수민의 이전 자리</b>다." }
      ],
      related: [["L-017", "B석 배치 기록"], ["P-006", "전근 승인자"]]
    },
    {
      id: "I-014", type: "I", typeName: "INCIDENT", title: "제4관찰소 사고", access: 0,
      searchTerms: ["사고", "11명", "10명", "03:17", "S.N.", "R-14/ARCHIVE"],
      meta: [["CLASS", "INCIDENT"], ["RISK", "RED"], ["TIME", "2026.08.11 03:17"], ["AUTHOR", "P-006"], ["STATUS", "AMENDED"], ["ACCESS", "PARTIAL"]],
      sections: [
        { heading: "사건 요약", text: "2026년 8월 11일 03:17, [[L-017|L-017 제4관찰소]]에서 사고가 발생했다. 초기 보고는 근무자 <b>11명</b>을 언급하지만, 사고 직후 발급된 공식 인사 근무표에는 10명만 등록되어 있다.", quote: true },
        {
          heading: "현장 메모 발췌",
          text: "03:16 — N-04 보관함을 쓰는 기록 보조 <b>S.N.</b>이 수기 노트를 요청. 03:17 이후 인원 확인 불가. 콘솔에 사람 이름이 아닌 식별자가 뜸.",
          quote: true,
          cloze: { caseId: "C-002", before: "현장 메모의 S.N.은", after: "이다.", placeholder: "이름 또는 문서 ID" }
        },
        { heading: "기록 불일치", text: "공식 근무표 10명, 외부 출입 기록 10개 유효 배지, 보고서 본문 11명, [[L-017|L-017 좌석 센서]] 11개 점유 신호. 어느 하나가 거짓이라고 단정하지 말고 인원수와 존재 방식을 분리해 대조해야 한다." },
        { heading: "수정 이력", text: "03:29 ‘근무자 10명’으로 최초 저장. 03:34 본문 인원 표기가 11명으로 변경됐다. 작성 계정은 <b>R-14/ARCHIVE</b>이며 계정 색인에는 없다." }
      ],
      related: [["P-004", "S.N.의 신원 확인"], ["P-006", "1차 작성자"], ["A-027", "03:17:00–03:17:13 공백"], ["O-004", "보존 메시지"]]
    },
    {
      id: "O-004", type: "O", typeName: "OBJECT", title: "두 번째 전화기", access: 0,
      searchTerms: ["전화", "UNKNOWN", "출입", "메시지", "R-14/ARCHIVE"],
      meta: [["CLASS", "OBJECT"], ["RISK", "YELLOW"], ["IMPACT", "INFO / TEMP"], ["UPDATED", "2026.08.12"], ["AUTHOR", "통신보존실"], ["STATUS", "ACTIVE"]],
      sections: [
        { heading: "개요", text: "통신망에 연결되지 않았으나 수신 메시지를 남기는 유선 전화기. 수신 내용은 단독으로 사실로 취급하지 않으며 반드시 PADS의 독립 문서로 확인해야 한다." },
        { heading: "보존 메시지 14-03", text: "‘출입 기록이 없는 이름을 사람이라고 부르지 마. 자리가 하나 더 비어 보인다면, 먼저 누가 들어왔는지 세어.’ 메시지는 정답을 말하지 않고 비교할 기록의 방향만 가리킨다.", quote: true },
        { heading: "수정 기록", text: "보존 메시지 접근 권한은 현재 사용자에게 자동 부여됐다. 작성 계정: <b>R-14/ARCHIVE</b> [검증 불가]." }
      ],
      related: [["A-027", "메시지 직전 시간대의 공백"], ["I-014", "메시지의 맥락"], ["L-017", "회수 장소"]]
    },
    {
      id: "L-003", type: "L", typeName: "LOCATION", title: "존재하지 않는 4층", access: 0,
      searchTerms: ["4층", "엘리베이터", "B", "공간", "본관"],
      meta: [["CLASS", "LOCATION"], ["RISK", "GREEN"], ["IMPACT", "SPATIAL / INFO"], ["UPDATED", "2026.05.18"], ["AUTHOR", "시설기록과"], ["STATUS", "OBSERVED"]],
      sections: [
        { heading: "개요", text: "PMB 본부 도면상 건물은 3층까지다. 그러나 일부 엘리베이터 유지보수 기록에는 4층 버튼 교체와 ‘본관 4층 기록관리실’ 근무 지시가 남는다." },
        { heading: "Chapter 1 관련성", text: "이 문서는 관찰석 B와 혼동되기 쉬운 <b>Red Herring</b>이다. [[L-017|L-017의 OBS-14/B]]는 ‘관찰소 14의 B석’이며 층수 표기가 아니다." }
      ],
      related: [["E-008", "확인 행위와 존재 판단"], ["L-017", "별개 장소"]]
    },
    {
      id: "I-001", type: "I", typeName: "INCIDENT", title: "에이다 공백 사건", access: 0,
      searchTerms: ["에이다", "공백", "314명", "기록", "사라진 것"],
      meta: [["CLASS", "INCIDENT"], ["RISK", "BLACK"], ["IMPACT", "SPATIAL / COGNITIVE"], ["UPDATED", "2026.03.04"], ["AUTHOR", "설립준비기록단"], ["STATUS", "ARCHIVED"]],
      sections: [
        { heading: "사건 요약", text: "1997년 11월, 에이다 마을 주민 314명이 사라졌다. PADS 백업에는 사건 일주일 전 작성된 것으로 표시된 사고 보고서가 남아 있다." },
        { heading: "주의", text: "이 사건은 PMB가 기록 보존을 중요시하게 된 배경일 뿐 [[I-014|I-014]]를 직접 설명하는 만능 해답이 아니다. 두 사건을 연결하는 확정 증거는 제공되지 않는다." }
      ],
      related: [["I-014", "기록 인원 불일치 사례"], ["O-004", "기록 시점 불일치 사례"]]
    },
    {
      id: "A-013", type: "A", typeName: "ANOMALY", title: "적색 안개", access: 0,
      searchTerms: ["기억", "안개", "공백", "P-009", "노출"],
      meta: [["CLASS", "ANOMALY"], ["RISK", "YELLOW"], ["IMPACT", "COGNITIVE / SPATIAL"], ["UPDATED", "2026.07.02"], ["AUTHOR", "현상관측과 2반"], ["STATUS", "MONITORED"]],
      sections: [
        { heading: "개요", text: "붉은 안개 안의 사람은 짧은 기억을 순서 없이 회상하거나 장소의 거리감을 잘못 인식한다. 영상과 종이 기록은 대체로 보존된다." },
        { heading: "Chapter 1 관련 기록", text: "I-014 사고 시각과 장소에 노출 보고는 없다. ‘한 명 더 있었던 것 같다’는 진술을 이 현상으로 처리하자는 메모는 [[P-009|P-009]]가 기각했다. 그럴듯하지만 잘못된 해석의 예다." }
      ],
      related: [["I-014", "노출 가설이 기각된 사고"], ["P-009", "출입 로그 보존 담당자"], ["A-027", "별개의 시간 공백"]]
    },
    {
      id: "P-004", type: "P", typeName: "PERSON", title: "서나리", access: 1,
      searchTerms: ["서나리", "S.N.", "N-04", "기록 보조", "수기 노트"],
      meta: [["CLASS", "PERSON"], ["ROLE", "기록 보조"], ["LOCKER", "N-04"], ["UPDATED", "2026.08.11"], ["AUTHOR", "기록지원반"], ["STATUS", "MISSING"]],
      sections: [
        { heading: "인물 기록", text: "기록지원반 소속 기록 보조. 이니셜은 <b>S.N.</b>, 개인 장비 보관함은 <b>N-04</b>다. 업무는 관찰 중 수기 노트를 수합해 PADS 원문과 대조하는 일이다." },
        { heading: "현장 존재", text: "[[I-014|I-014의 S.N. 메모]], [[L-017|L-017 장비 반납 로그]], 직무·이니셜·보관함이 모두 이 인물과 일치한다. 세 항목은 서나리의 현장 존재를 독립적으로 뒷받침한다." }
      ],
      related: [["I-014", "S.N. 현장 메모"], ["L-017", "N-04 장비 반납 로그"], ["A-013", "적용되지 않은 기억 공백 가설"]]
    },
    {
      id: "P-006", type: "P", typeName: "PERSON", title: "민도윤", access: 1,
      searchTerms: ["민도윤", "03:29", "10명", "수정", "초안"],
      meta: [["CLASS", "PERSON"], ["ROLE", "당직 책임자"], ["REPORT", "I-014 PRIMARY"], ["UPDATED", "2026.08.12"], ["AUTHOR", "인사기록과"], ["STATUS", "AVAILABLE"]],
      sections: [
        { heading: "인물 기록", text: "제4관찰소 당직 책임자. I-014 1차 보고서를 03:29에 작성했고 최초 저장본의 인원 표기는 10명이었다." },
        { heading: "진술", text: "민도윤은 뒤늦은 11명 표기를 직접 수정하지 않았다고 진술했다. 이 사실은 열한 번째 기록의 정체를 증명하지 않지만, 변경이 원 작성자의 통상 계정에서 일어나지 않았다는 보조 증거다." }
      ],
      related: [["I-014", "1차 보고와 수정 이력"], ["P-003", "전근 승인"], ["P-009", "수정 이력 보존"]]
    },
    {
      id: "P-009", type: "P", typeName: "PERSON", title: "유해진", access: 1,
      searchTerms: ["유해진", "출입", "10개", "보존", "감사"],
      meta: [["CLASS", "PERSON"], ["ROLE", "보안감사"], ["LOG", "READ ONLY"], ["UPDATED", "2026.08.12"], ["AUTHOR", "보안감사과"], ["STATUS", "AVAILABLE"]],
      sections: [
        { heading: "인물 기록", text: "보안감사과 출입·수정 이력 보존 담당. I-014 직후 외부 출입문 원본 로그를 읽기 전용으로 잠갔다. 사고 시간대 유효 배지는 정확히 <b>10개</b>다." },
        { heading: "감사 메모", text: "11번째 신호는 어느 배지에도 연결되지 않는다. [[A-013|A-013 노출]]을 인원 누락의 설명으로 채택하지 않은 이유는 물리 출입과 PADS 콘솔을 같은 종류의 증거로 합산할 수 없기 때문이다." }
      ],
      related: [["L-017", "출입/좌석 원본 로그"], ["I-014", "편집 이력 잠금"], ["A-013", "기각한 대안 설명"]]
    },
    {
      id: "A-027", type: "A", typeName: "ANOMALY", title: "13초의 공백", access: 1,
      searchTerms: ["13초", "03:17", "R-14/ARCHIVE", "세션", "콘솔"],
      meta: [["CLASS", "ANOMALY"], ["RISK", "YELLOW"], ["IMPACT", "TEMPORAL / INFO"], ["UPDATED", "2026.08.12"], ["AUTHOR", "영상기록 분석실"], ["STATUS", "OBSERVED"]],
      sections: [
        { heading: "개요", text: "특정 폐쇄회로 영상과 연결된 기록에서 정확히 13초가 사라지는 현상. 파일 길이와 타임코드는 연속적으로 보이지만 관찰자는 그 시간 동안 자신의 행동을 기억하지 못한다." },
        {
          heading: "L-017 대조 로그",
          text: "I-014 당일 L-017 콘솔 영상은 <b>03:17:00–03:17:13</b> 구간이 비어 있다. 영상 복구 뒤 인증 로그에는 03:17:13에 색인에 없는 세션 하나가 생성된 것으로 남았다. 이 식별자는 유효 직원 계정이나 출입 배지와 일치하지 않는다.",
          cloze: { caseId: "C-003", before: "공백 뒤 생성된 PADS 세션은", after: "이다.", placeholder: "세션 식별자" }
        },
        { heading: "판정 범위", text: "이 항목은 세션이 사람이라는 뜻이 아니다. 공백 직후 <b>PADS 콘솔 세션이 생성됐다</b>는 사실만 확정한다." }
      ],
      related: [["I-014", "같은 시각의 인원 기록"], ["L-017", "콘솔 및 좌석 센서 로그"], ["O-004", "보존된 발신 메시지"]]
    },
    {
      id: "E-008", type: "E", typeName: "ENTITY", title: "문의 사람", access: 2,
      searchTerms: ["문", "목소리", "존재", "관찰", "센서"],
      meta: [["CLASS", "ENTITY"], ["RISK", "YELLOW"], ["IMPACT", "COGNITIVE"], ["UPDATED", "2026.06.11"], ["AUTHOR", "격리안전과"], ["STATUS", "ARCHIVED"]],
      sections: [
        { heading: "운용 원칙", text: "목소리의 내용은 사실일 수 있으나, 목소리가 들린다는 사실만으로 발신자나 위치를 확정하지 않는다. 질문을 받아 적고 독립 기록으로 검증할 것." },
        { heading: "Chapter 1 관련성", text: "L-017의 열한 번째 신호는 잠긴 문 너머의 음성이나 개체 관측과 연결된 기록이 없다. 이 문서로 해석하면 안 된다." }
      ],
      related: [["L-003", "존재하지 않는 층의 목격"], ["L-017", "직접 관련 없음"]]
    }
  ],
  cases: [
    {
      id: "C-001", type: "C", typeName: "CASE FILE", title: "관찰석 B 배치 기록", access: 0,
      searchTerms: ["빈칸", "관찰석 B", "OBS-14/B", "정수민"],
      meta: [["CASE", "01 / 03"], ["STATUS", "OPEN"], ["EVIDENCE", "2 RECORDS"], ["METHOD", "CROSS-REFERENCE"]],
      prompt: "OBS-14/B의 원래 담당자는 [blank]이다.",
      instruction: "관찰석 식별자와 인물 파일의 마지막 배치 코드를 대조해 빈칸을 채우세요.",
      answerLabel: "정수민 (P-003)", answers: ["정수민", "P-003", "P003"], evidence: ["L-017", "P-003"],
      leads: [["L-017", "L-017 제4관찰소"]], unlocks: 1,
      success: "배치 기록이 해제되었습니다. I-014의 인원수 불일치를 조사하세요.",
      phone: "정수민은 떠났고, 자리는 남았지.\n그런데 어젯밤 사고 보고서에는 자리가 열하나였어."
    },
    {
      id: "C-002", type: "C", typeName: "CASE FILE", title: "I-014 현장 메모 보정", access: 1,
      searchTerms: ["빈칸", "S.N.", "N-04", "기록 보조", "서나리"],
      meta: [["CASE", "02 / 03"], ["STATUS", "OPEN"], ["EVIDENCE", "3 RECORDS"], ["METHOD", "CROSS-REFERENCE"]],
      prompt: "I-014의 현장 메모에 적힌 S.N.은 [blank]이다.",
      instruction: "이니셜 하나로 결론 내리지 말고, 보관함 번호와 직무가 함께 일치하는 인물 파일을 찾으세요.",
      answerLabel: "서나리 (P-004)", answers: ["서나리", "P-004", "P004"], evidence: ["I-014", "L-017", "P-004"],
      leads: [["I-014", "I-014 사고 보고서"], ["L-017", "L-017 장비 반납 로그"]], unlocks: 2,
      success: "누락자는 사람이었음이 확인되었습니다. 이제 ‘열한 번째’가 사람인지 기록인지 판정하세요.",
      phone: "서나리는 사람이었어. 남긴 물건도, 들어온 기록도 있어.\n그러면 아직 하나가 남아. 들어오지 않았는데 기록에는 있는 것."
    },
    {
      id: "C-003", type: "C", typeName: "CASE FILE", title: "열한 번째 기록의 판정", access: 2,
      searchTerms: ["빈칸", "열한 번째", "R-14/ARCHIVE", "세션", "03:17"],
      meta: [["CASE", "03 / 03"], ["STATUS", "OPEN"], ["EVIDENCE", "4 RECORDS"], ["METHOD", "CROSS-REFERENCE"]],
      prompt: "열한 번째 기록은 사람이 아니라 PADS [blank]이다.",
      instruction: "출입 수와 좌석 신호를 같은 수로 읽지 마세요. 03:17 공백 뒤 생성된 항목과 보존 메시지를 대조하세요.",
      answerLabel: "R-14/ARCHIVE 세션", answers: ["R-14/ARCHIVE", "R14ARCHIVE", "R-14 ARCHIVE"], evidence: ["I-014", "L-017", "A-027", "O-004"],
      leads: [["A-027", "A-027 13초의 공백"], ["I-014", "I-014 수정 이력"]], unlocks: 3,
      success: "기록이 사람보다 먼저 남았습니다. 계정 색인에 없는 세션이 현재 사용자를 가리킵니다.",
      phone: "지금 그 이름을 쓰지 마. 네 화면에 뜬 사번도.\n기록이 먼저였어. 사람보다."
    }
  ]
};
