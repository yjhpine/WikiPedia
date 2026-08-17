// Chapter 1: six deduction cases in three difficulty tiers.
// No single record states a full answer; players combine the marked evidence.
export const verticalSlice = {
  startDocument: "C-001",
  documents: [
    {
      id: "L-017", type: "L", typeName: "LOCATION", title: "제4관찰소 교대표", access: 0,
      searchTerms: ["관찰소", "교대표", "B석", "B-17", "03:00"],
      meta: [["CLASS", "LOCATION"], ["SHIFT", "03:00"], ["BUNDLE", "B-17"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "인계 카드 규칙", text: "B석의 이전 담당자 이름은 보안상 세 장의 카드에 나눠 적는다. 같은 인계 묶음 표기를 가진 카드의 글자를 왼쪽부터 이어 읽는다." },
        { heading: "B석 배정", text: "03:00 교대 / 인계 묶음 <b>B-17</b>. 첫 카드에는 <b>정</b>만 남아 있다. 나머지 두 글자는 [[P-003|B-17 인계 카드]]에 보관됐다." },
        { heading: "주의", text: "이름 조각의 순서는 교대표 → 인계 카드 순서다. 비슷한 시각의 다른 관찰석과 섞지 말 것." }
      ],
      related: [["P-003", "B-17 인계 카드"], ["O-004", "보존 전화 녹취"], ["I-001", "기록 해석 지침"]]
    },
    {
      id: "P-003", type: "P", typeName: "PERSON", title: "B-17 인계 카드", access: 0,
      searchTerms: ["B-17", "인계 카드", "관찰 담당", "서명 조각"],
      meta: [["CLASS", "PERSONNEL"], ["BUNDLE", "B-17"], ["ROLE", "OBSERVATION"], ["STATUS", "FILED"]],
      sections: [
        { heading: "서명 가장자리", text: "카드 오른쪽 가장자리에 <b>수</b>, 그 다음 칸에 <b>민</b>이 남아 있다. 두 글자는 B-17 묶음의 뒤쪽 조각이다." },
        { heading: "인계 메모", text: "카드 주인은 B석을 떠난 전임 관찰자다. 교대표의 첫 카드와 이 카드만 같은 묶음으로 취급한다." }
      ],
      related: [["L-017", "제4관찰소 교대표"], ["P-004", "보관함 배정 메모"]]
    },
    {
      id: "O-004", type: "O", typeName: "OBJECT", title: "보존 전화 녹취", access: 0,
      searchTerms: ["전화", "녹취", "보관함", "표기", "호출명"],
      meta: [["CLASS", "OBJECT"], ["STATUS", "ACTIVE"], ["USE", "CROSS-CHECK"], ["CHANNEL", "ARCHIVE"]],
      sections: [
        { heading: "보관함 표기", text: "시설 지도는 보관함을 <b>행 문자-두 자리 칸 번호</b> 형식으로 적는다. 두 조각 사이에는 항상 하이픈을 넣는다." },
        { heading: "04:13 녹음", text: "기록 보조의 음성: “제 칸은 N행의 네 번째예요. 명찰은 찢어졌지만 좌표는 맞습니다.”" },
        { heading: "보존팀 호출", text: "녹취에서 보존 담당자는 한 글자 호출명 <b>해</b>로 응답한다. 호출명은 본명 가운데 글자를 쓴다는 것이 부서 관례다." },
        { heading: "자동 분류 규칙", text: "미색인 세션은 앞부분과 분류어를 <b>슬래시(/)</b>로 이어 하나의 식별자로 저장한다." }
      ],
      related: [["P-004", "보관함 배정 메모"], ["L-003", "폐쇄 층 수신대장"], ["E-008", "세션 분류 규약"]]
    },
    {
      id: "I-001", type: "I", typeName: "INCIDENT", title: "기록 해석 지침", access: 0,
      searchTerms: ["해석", "지침", "교차 확인", "추리"],
      meta: [["CLASS", "INCIDENT"], ["STATUS", "REFERENCE"], ["METHOD", "CROSS-CHECK"]],
      sections: [
        { heading: "기본 원칙", text: "사건 문서의 정답은 한 문장에 완성되어 있지 않다. 문서 교차 확인에 표시된 기록을 모두 읽고, 같은 표기·시간·역할을 연결해야 한다." },
        { heading: "난이도 안내", text: "하 단계는 두 조각을 잇고, 중 단계는 서로 다른 기록의 서명과 명찰을 대조한다. 상 단계는 세 문서가 같은 인물을 가리키는지 확인한다." }
      ],
      related: [["L-017", "제4관찰소 교대표"], ["A-013", "적색 안개"]]
    },
    {
      id: "A-013", type: "A", typeName: "ANOMALY", title: "적색 안개", access: 0,
      searchTerms: ["안개", "경보", "03:17", "배경 기록"],
      meta: [["CLASS", "ANOMALY"], ["TIME", "03:17"], ["STATUS", "REFERENCE"]],
      sections: [
        { heading: "관찰 기록", text: "03:17에 제4관찰소 외벽에서 적색 안개가 감지됐다. 인명 기록은 바뀌지 않았지만, 당시 작성된 문서의 서명이 불완전하게 남았다." },
        { heading: "열람 주의", text: "이 문서는 배경 기록이다. 이름을 추정할 때는 사건 문서에 표시된 근거와 직접 연결되는지 먼저 확인한다." }
      ],
      related: [["I-014", "03:17 현장 메모"], ["L-017", "제4관찰소 교대표"]]
    },
    {
      id: "P-004", type: "P", typeName: "PERSON", title: "보관함 배정 메모", access: 1,
      searchTerms: ["보관함", "N행", "04", "명찰", "기록 보조"],
      meta: [["CLASS", "PERSONNEL"], ["ROW", "N"], ["SLOT", "04"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "좌표 조각", text: "수리 전사본에는 보관함의 <b>행 N</b>, <b>칸 04</b>가 따로 남아 있다. 표준 표기법은 전화 녹취에서 확인한다." },
        { heading: "훼손된 명찰", text: "명찰의 첫 음절은 <b>서</b>로 판독된다. 나머지 이름은 03:17 현장 메모의 발신자 표기와 대조하라는 메모가 붙어 있다." }
      ],
      related: [["O-004", "보존 전화 녹취"], ["I-014", "03:17 현장 메모"]]
    },
    {
      id: "I-014", type: "I", typeName: "INCIDENT", title: "03:17 현장 메모", access: 2,
      searchTerms: ["03:17", "현장 메모", "S.N.", "보고서", "도윤"],
      meta: [["CLASS", "INCIDENT"], ["TIME", "03:17"], ["SIGNATURE", "PARTIAL"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "발신자 표기", text: "메모 끝에는 <b>S.N.</b>만 남아 있고, 본문에는 “<b>나리</b>에게 보관함을 넘긴다”는 문장이 있다. 발신자는 N행 04칸 명찰의 주인이다." },
        { heading: "1차 보고서", text: "초기 보고서의 이름은 번져서 <b>M.도윤</b>까지만 읽힌다. 성은 별도 서명 대조 문서에서 확인해야 한다." }
      ],
      related: [["P-004", "보관함 배정 메모"], ["P-006", "1차 보고서 서명 대조"], ["A-013", "적색 안개"]]
    },
    {
      id: "P-006", type: "P", typeName: "PERSON", title: "1차 보고서 서명 대조", access: 3,
      searchTerms: ["1차 보고서", "서명", "당직", "민", "D.Y."],
      meta: [["CLASS", "PERSONNEL"], ["ROLE", "DUTY LEAD"], ["SIGNATURE", "M / D.Y."], ["STATUS", "OPEN"]],
      sections: [
        { heading: "당직 명부", text: "03:17 당직 책임자의 성 칸에는 <b>민</b>, 영문 이니셜 칸에는 <b>D.Y.</b>가 적혀 있다. 이 서명은 현장 메모의 1차 보고서와 동일인이다." },
        { heading: "대조 방식", text: "한글 이름의 앞 글자는 명부의 성 칸에서, 뒤 두 글자는 번진 현장 메모에서 복원한다. 이 순서를 바꾸면 다른 인물이 된다." }
      ],
      related: [["I-014", "03:17 현장 메모"], ["P-009", "보존 담당 서명지"]]
    },
    {
      id: "L-003", type: "L", typeName: "LOCATION", title: "폐쇄 층 수신대장", access: 4,
      searchTerms: ["수신대장", "보존 담당", "Y.H.J.", "폐쇄 층", "03:17"],
      meta: [["CLASS", "LOCATION"], ["CHANNEL", "ARCHIVE"], ["CALL SIGN", "Y.H.J."], ["STATUS", "OPEN"]],
      sections: [
        { heading: "수신자 기록", text: "03:17 보존 채널의 수신자는 <b>Y.H.J.</b>로만 적혀 있다. 수신대장은 이름 조각이 아니라 한 사람의 세 글자 이니셜을 순서대로 쓴다." },
        { heading: "역할 확인", text: "같은 줄의 역할란은 ‘보존 감사’다. 이름 조각은 보존 담당 서명지와 전화 녹취에서 각각 확인한다." }
      ],
      related: [["P-009", "보존 담당 서명지"], ["O-004", "보존 전화 녹취"]]
    },
    {
      id: "P-009", type: "P", typeName: "PERSON", title: "보존 담당 서명지", access: 4,
      searchTerms: ["보존", "서명", "감사", "유", "진"],
      meta: [["CLASS", "PERSONNEL"], ["ROLE", "ARCHIVE AUDIT"], ["SIGNATURE", "DAMAGED"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "남은 서명", text: "서명지의 성 칸에는 <b>유</b>, 이름 끝 칸에는 <b>진</b>만 선명하다. 가운데 글자는 보존 전화의 호출명과 맞춰 보라는 지시가 있다." },
        { heading: "직무", text: "이 서명자는 03:17 보존 채널을 수신한 감사관이다. 수신대장의 세 글자 이니셜과도 일치해야 한다." }
      ],
      related: [["O-004", "보존 전화 녹취"], ["L-003", "폐쇄 층 수신대장"], ["A-027", "13초 로그"]]
    },
    {
      id: "A-027", type: "A", typeName: "ANOMALY", title: "13초 로그", access: 5,
      searchTerms: ["13초", "로그", "미색인", "R-14", "세션"],
      meta: [["CLASS", "ANOMALY"], ["TIME", "03:17:13"], ["HEADER", "R-14"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "잘린 헤더", text: "13초 지점의 원본 헤더에는 앞부분 <b>R-14</b>만 남아 있다. 나머지는 전송 중 누락됐으며, 이 기록은 색인에 없는 세션으로 분류됐다." },
        { heading: "복원 조건", text: "완전한 식별자는 세션 분류 규약과 전화 녹취의 자동 분류 규칙을 함께 적용해야 복원할 수 있다." }
      ],
      related: [["E-008", "세션 분류 규약"], ["O-004", "보존 전화 녹취"], ["E-009", "미확인 편집자 기록"]]
    },
    {
      id: "E-008", type: "E", typeName: "ENTITY", title: "세션 분류 규약", access: 5,
      searchTerms: ["세션", "분류", "미색인", "ARCHIVE", "규약"],
      meta: [["CLASS", "PROTOCOL"], ["CATEGORY", "ARCHIVE"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "미색인 분류어", text: "일반 색인에 없는 세션의 분류어는 <b>ARCHIVE</b>다. 이 단어는 앞부분 식별자와 따로 보관되며, 기록상 단독 ID로 쓰지 않는다." },
        { heading: "복원 주의", text: "완성 표기는 자동 분류 규칙을 따른다. 헤더 조각과 분류어의 순서를 바꾸거나 공백으로 잇지 말 것." }
      ],
      related: [["A-027", "13초 로그"], ["O-004", "보존 전화 녹취"]]
    },
    {
      id: "E-009", type: "E", typeName: "ENTITY", title: "미확인 편집자 기록", access: 6,
      searchTerms: ["완료", "편집자", "기록", "Chapter 1"],
      meta: [["CLASS", "ENTITY"], ["STATUS", "FINAL NOTE"]],
      sections: [
        { heading: "Chapter 1 완료", text: "여섯 개의 빈칸은 기록을 베껴 쓰는 문제가 아니었다. 서로 다른 문서에 흩어진 조각을 같은 사건으로 묶어, 스스로 결론을 만든 기록이다." },
        { heading: "다음 기록", text: "R-14의 편집 흔적은 아직 남아 있다. 다음 장에서는 누가 기록을 고쳤는지 추적한다." }
      ],
      related: [["A-027", "13초 로그"]]
    }
  ],
  cases: [
    {
      id: "C-001", type: "C", typeName: "CASE FILE", title: "01. B-17의 전임자", access: 0,
      difficulty: "하", difficultyDetail: "두 조각 결합",
      searchTerms: ["B-17", "전임자", "B석", "첫 번째"],
      meta: [["CASE", "01 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "2 RECORDS"], ["METHOD", "COMBINE"]],
      prompt: "B-17 인계 묶음의 전임 관찰자 이름은 [blank]이다.",
      instruction: "교대표의 첫 글자와 인계 카드의 뒤 두 글자를, B-17 순서대로 이어 읽으세요.",
      answerLabel: "정수민", answers: ["정수민"], evidence: ["L-017", "P-003"],
      leads: [["L-017", "제4관찰소 교대표"], ["P-003", "B-17 인계 카드"]], unlocks: 1,
      success: "B-17의 이름을 복원했습니다. 이제 좌표 조각을 표준 보관함 표기로 바꿔야 합니다.",
      phoneTime: "04:13", phone: "첫 번째 조각은 맞았습니다. 다음엔 표기 규칙까지 대조하세요.",
      retry: "두 기록의 글자 순서와 인계 묶음 표기를 다시 확인하세요."
    },
    {
      id: "C-002", type: "C", typeName: "CASE FILE", title: "02. 찢어진 명찰의 좌표", access: 1,
      difficulty: "하", difficultyDetail: "형식 대조",
      searchTerms: ["보관함", "좌표", "명찰", "두 번째"],
      meta: [["CASE", "02 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "2 RECORDS"], ["METHOD", "FORMAT"]],
      prompt: "N행 04번 보관함의 표준 표기는 [blank]이다.",
      instruction: "배정 메모의 행·칸 조각과 전화 녹취의 표기 규칙을 함께 적용하세요.",
      answerLabel: "N-04", answers: ["N-04", "N04"], evidence: ["P-004", "O-004"],
      leads: [["P-004", "보관함 배정 메모"], ["O-004", "보존 전화 녹취"]], unlocks: 2,
      success: "보관함 좌표를 복원했습니다. 이제 훼손된 명찰의 주인을 찾아야 합니다.",
      phoneTime: "04:14", phone: "좌표는 맞아요. 이제 이름 조각의 출처가 서로 같은 사람인지 확인하세요.",
      retry: "행 문자와 두 자리 칸 번호 사이의 표기 규칙을 놓치지 마세요."
    },
    {
      id: "C-003", type: "C", typeName: "CASE FILE", title: "03. S.N.의 실명", access: 2,
      difficulty: "중", difficultyDetail: "명찰·서명 대조",
      searchTerms: ["S.N.", "명찰", "발신자", "세 번째"],
      meta: [["CASE", "03 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "2 RECORDS"], ["METHOD", "CROSS-CHECK"]],
      prompt: "N-04 명찰의 S.N.은 [blank]이다.",
      instruction: "명찰에 남은 첫 음절과 현장 메모에서 판독된 나머지 이름을, 같은 N-04 주인으로 묶으세요.",
      answerLabel: "서나리", answers: ["서나리"], evidence: ["P-004", "I-014"],
      leads: [["P-004", "보관함 배정 메모"], ["I-014", "03:17 현장 메모"]], unlocks: 3,
      success: "발신자의 실명을 확인했습니다. 다음은 번진 1차 보고서의 작성자입니다.",
      phoneTime: "04:15", phone: "이니셜 하나만 보고 결론 내리지 마세요. 명찰과 메모가 같은 사람을 가리키는지 확인해야 합니다.",
      retry: "첫 음절은 명찰, 나머지 이름은 현장 메모에 남아 있습니다."
    },
    {
      id: "C-004", type: "C", typeName: "CASE FILE", title: "04. 번진 보고서의 작성자", access: 3,
      difficulty: "중", difficultyDetail: "서명 복원",
      searchTerms: ["1차 보고서", "작성자", "서명", "네 번째"],
      meta: [["CASE", "04 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "2 RECORDS"], ["METHOD", "RECONSTRUCT"]],
      prompt: "03:17 1차 보고서의 실제 작성자는 [blank]이다.",
      instruction: "현장 메모에 남은 이름 뒤 두 글자와 당직 명부의 성 칸을 순서대로 복원하세요.",
      answerLabel: "민도윤", answers: ["민도윤"], evidence: ["I-014", "P-006"],
      leads: [["I-014", "03:17 현장 메모"], ["P-006", "1차 보고서 서명 대조"]], unlocks: 4,
      success: "번진 서명을 복원했습니다. 보존 채널을 수신한 감사관의 이름이 다음 관문입니다.",
      phoneTime: "04:16", phone: "성 칸은 명부에, 나머지 두 글자는 현장 메모에 있습니다.",
      retry: "보고서의 이름 조각과 명부의 성 칸을 같은 순서로 이어 보세요."
    },
    {
      id: "C-005", type: "C", typeName: "CASE FILE", title: "05. 보존 채널의 감사관", access: 4,
      difficulty: "상", difficultyDetail: "세 기록 조합",
      searchTerms: ["보존", "감사관", "수신자", "다섯 번째"],
      meta: [["CASE", "05 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "3 RECORDS"], ["METHOD", "TRIANGULATE"]],
      prompt: "03:17 보존 채널을 수신한 감사관의 이름은 [blank]이다.",
      instruction: "서명지의 첫·끝 글자, 전화의 가운데 호출명, 수신대장의 세 글자 이니셜이 한 사람을 가리키는지 대조하세요.",
      answerLabel: "유해진", answers: ["유해진"], evidence: ["P-009", "O-004", "L-003"],
      leads: [["P-009", "보존 담당 서명지"], ["O-004", "보존 전화 녹취"], ["L-003", "폐쇄 층 수신대장"]], unlocks: 5,
      success: "보존 감사관을 특정했습니다. 마지막으로 누락된 세션 식별자를 복원할 수 있습니다.",
      phoneTime: "04:17", phone: "이름 세 글자는 서로 다른 기록에 흩어져 있습니다. 이니셜은 순서 검증용입니다.",
      retry: "첫 글자와 끝 글자만으로 확정하지 말고, 가운데 호출명과 세 글자 이니셜까지 대조하세요."
    },
    {
      id: "C-006", type: "C", typeName: "CASE FILE", title: "06. 13초 세션 복원", access: 5,
      difficulty: "상", difficultyDetail: "규약 적용",
      searchTerms: ["13초", "세션", "식별자", "마지막"],
      meta: [["CASE", "06 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "3 RECORDS"], ["METHOD", "APPLY RULE"]],
      prompt: "13초 로그의 완전한 미색인 세션 식별자는 [blank]이다.",
      instruction: "로그의 앞부분, 분류 규약의 분류어, 전화 녹취의 연결 규칙을 모두 적용해 완성하세요.",
      answerLabel: "R-14/ARCHIVE", answers: ["R-14/ARCHIVE", "R14ARCHIVE"], evidence: ["A-027", "E-008", "O-004"],
      leads: [["A-027", "13초 로그"], ["E-008", "세션 분류 규약"], ["O-004", "보존 전화 녹취"]], unlocks: 6,
      success: "누락된 식별자를 복원했습니다. 미확인 편집자 기록이 열렸습니다.",
      phoneTime: "04:18", phone: "헤더 조각, 분류어, 결합 기호 중 하나라도 빠지면 다른 식별자가 됩니다.",
      retry: "세 문서의 조각을 규약이 정한 순서와 기호로 결합하세요."
    }
  ]
};
