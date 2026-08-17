// Chapter 1: a short, guided six-question archive tour.
// Every case points to one newly available document with a plainly stated answer.
export const verticalSlice = {
  startDocument: "C-001",
  documents: [
    {
      id: "L-017", type: "L", typeName: "LOCATION", title: "제4관찰소 안내", access: 0,
      searchTerms: ["관찰소", "B석", "안내", "문제", "정수민"],
      meta: [["CLASS", "LOCATION"], ["RISK", "GREEN"], ["UPDATED", "2026.08.12"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "이 문서 사용법", text: "사건 문서의 빈칸은 연결된 문서에서 바로 확인할 수 있다. 문서 안의 <b>확인 답</b> 한 줄을 읽고 그대로 입력하면 된다." },
        { heading: "관찰석 B", text: "관찰석 B의 이전 담당자는 [[P-003|P-003 정수민]]이다. 첫 번째 문제는 이 인물 파일에서 다시 확인할 수 있다." },
        { heading: "다음 기록", text: "정수민의 기록을 확인하면 보관함 기록이 열릴 예정이다." }
      ],
      related: [["P-003", "B석 이전 담당자"], ["O-004", "보존 전화 안내"], ["L-003", "관련 없는 장소"]]
    },
    {
      id: "P-003", type: "P", typeName: "PERSON", title: "정수민", access: 0,
      searchTerms: ["정수민", "B석", "이전 담당자", "P-003"],
      meta: [["CLASS", "PERSON"], ["ROLE", "관찰 담당"], ["LAST POST", "OBS-14/B"], ["STATUS", "TRANSFERRED"]],
      sections: [
        { heading: "확인 답", text: "관찰석 B의 이전 담당자는 <b>정수민</b>이다.", cloze: { caseId: "C-001", before: "관찰석 B의 이전 담당자는", after: "이다.", placeholder: "이름 입력" } },
        { heading: "짧은 설명", text: "정수민은 다른 부서로 옮겼다. 그래서 현재 B석은 비어 있다." }
      ],
      related: [["L-017", "제4관찰소 안내"], ["P-004", "다음 보관함 기록"]]
    },
    {
      id: "P-004", type: "P", typeName: "PERSON", title: "서나리의 보관함", access: 1,
      searchTerms: ["서나리", "N-04", "보관함", "P-004"],
      meta: [["CLASS", "PERSON"], ["ROLE", "기록 보조"], ["LOCKER", "N-04"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "확인 답", text: "서나리의 개인 보관함 번호는 <b>N-04</b>다.", cloze: { caseId: "C-002", before: "서나리의 개인 보관함 번호는", after: "이다.", placeholder: "보관함 번호" } },
        { heading: "다음 안내", text: "다음 문제에서는 현장 메모에 적힌 S.N.의 이름을 확인한다." }
      ],
      related: [["I-014", "현장 메모"], ["L-017", "제4관찰소 안내"]]
    },
    {
      id: "I-014", type: "I", typeName: "INCIDENT", title: "현장 메모", access: 2,
      searchTerms: ["현장 메모", "S.N.", "서나리", "I-014"],
      meta: [["CLASS", "INCIDENT"], ["TIME", "03:17"], ["STATUS", "CHECKED"], ["ACCESS", "OPEN"]],
      sections: [
        { heading: "확인 답", text: "현장 메모에 적힌 S.N.은 <b>서나리</b>다.", cloze: { caseId: "C-003", before: "현장 메모의 S.N.은", after: "이다.", placeholder: "이름 입력" } },
        { heading: "짧은 설명", text: "S.N.은 서나리의 이니셜이다. 다음 기록에서는 최초 보고서 작성자를 확인한다." }
      ],
      related: [["P-004", "서나리의 보관함"], ["P-006", "최초 작성자 기록"]]
    },
    {
      id: "P-006", type: "P", typeName: "PERSON", title: "민도윤", access: 3,
      searchTerms: ["민도윤", "최초 작성자", "1차 보고서", "P-006"],
      meta: [["CLASS", "PERSON"], ["ROLE", "당직 책임자"], ["REPORT", "I-014 PRIMARY"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "확인 답", text: "I-014 1차 보고서의 작성자는 <b>민도윤</b>이다.", cloze: { caseId: "C-004", before: "I-014 1차 보고서의 작성자는", after: "이다.", placeholder: "이름 입력" } },
        { heading: "다음 안내", text: "다음 기록에서는 보존 담당자의 이름을 확인한다." }
      ],
      related: [["P-009", "보존 담당자 기록"], ["I-014", "현장 메모"]]
    },
    {
      id: "P-009", type: "P", typeName: "PERSON", title: "유해진", access: 4,
      searchTerms: ["유해진", "보존 담당자", "로그", "P-009"],
      meta: [["CLASS", "PERSON"], ["ROLE", "보안감사"], ["LOG", "ARCHIVE"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "확인 답", text: "출입 로그의 보존 담당자는 <b>유해진</b>이다.", cloze: { caseId: "C-005", before: "출입 로그의 보존 담당자는", after: "이다.", placeholder: "이름 입력" } },
        { heading: "마지막 안내", text: "마지막으로 색인 밖 세션의 ID를 확인하면 Chapter 1이 끝난다." }
      ],
      related: [["A-027", "세션 ID 기록"], ["L-017", "제4관찰소 안내"]]
    },
    {
      id: "A-027", type: "A", typeName: "ANOMALY", title: "13초 로그", access: 5,
      searchTerms: ["13초", "세션", "R-14/ARCHIVE", "A-027"],
      meta: [["CLASS", "ANOMALY"], ["TIME", "03:17:13"], ["IMPACT", "INFO"], ["STATUS", "OPEN"]],
      sections: [
        { heading: "확인 답", text: "색인에 없는 PADS 세션 ID는 <b>R-14/ARCHIVE</b>다.", cloze: { caseId: "C-006", before: "색인에 없는 PADS 세션 ID는", after: "이다.", placeholder: "세션 ID" } },
        { heading: "완료", text: "이 ID는 사람 이름이 아니라 기록을 남긴 세션의 이름이다. 여섯 문제를 모두 확인했다." }
      ],
      related: [["O-004", "보존 전화"], ["E-008", "기록 원칙"]]
    },
    {
      id: "O-004", type: "O", typeName: "OBJECT", title: "보존 전화", access: 0,
      searchTerms: ["전화", "힌트", "안내", "기록"],
      meta: [["CLASS", "OBJECT"], ["STATUS", "ACTIVE"], ["USE", "HINT"]],
      sections: [
        { heading: "안내", text: "막히면 사건 문서의 파란 링크를 누르세요. 연결된 문서의 첫 번째 ‘확인 답’에서 정답을 바로 찾을 수 있다." },
        { heading: "규칙", text: "복잡한 추리는 필요 없다. 굵게 표시된 이름, 번호 또는 ID를 빈칸에 입력하면 된다." }
      ],
      related: [["L-017", "제4관찰소 안내"], ["I-001", "연습 기록"]]
    },
    {
      id: "L-003", type: "L", typeName: "LOCATION", title: "존재하지 않는 4층", access: 0,
      searchTerms: ["4층", "관련 없음", "연습"],
      meta: [["CLASS", "LOCATION"], ["STATUS", "REFERENCE"]],
      sections: [
        { heading: "안내", text: "이 문서는 이번 6문제와 관련이 없다. 답이 필요하면 사건 문서의 파란 링크를 따라가면 된다." }
      ],
      related: [["L-017", "제4관찰소 안내"]]
    },
    {
      id: "I-001", type: "I", typeName: "INCIDENT", title: "연습 기록", access: 0,
      searchTerms: ["연습", "초보", "도움말"],
      meta: [["CLASS", "INCIDENT"], ["STATUS", "REFERENCE"]],
      sections: [
        { heading: "빠른 풀이", text: "문제 → 파란 링크 → 첫 번째 확인 답 → 빈칸 입력. 이 순서만 따르면 된다." }
      ],
      related: [["O-004", "보존 전화"], ["P-003", "첫 문제 답"]]
    },
    {
      id: "A-013", type: "A", typeName: "ANOMALY", title: "적색 안개", access: 0,
      searchTerms: ["안개", "관련 없음", "안내"],
      meta: [["CLASS", "ANOMALY"], ["STATUS", "REFERENCE"]],
      sections: [
        { heading: "안내", text: "적색 안개는 배경 기록이다. 이번 문제의 정답은 각 사건 문서가 가리키는 확인 답에만 있다." }
      ],
      related: [["L-003", "관련 없는 장소"], ["O-004", "보존 전화"]]
    },
    {
      id: "E-008", type: "E", typeName: "ENTITY", title: "기록 원칙", access: 6,
      searchTerms: ["기록", "원칙", "완료", "세션"],
      meta: [["CLASS", "ENTITY"], ["STATUS", "FINAL NOTE"]],
      sections: [
        { heading: "Chapter 1 완료", text: "기록에서 답을 찾는 가장 쉬운 방법은 연결 문서의 확인 답을 읽는 것이다. 이번 여섯 문제를 모두 완료했다." }
      ],
      related: [["A-027", "마지막 세션 ID"]]
    }
  ],
  cases: [
    {
      id: "C-001", type: "C", typeName: "CASE FILE", title: "01. B석 담당자", access: 0,
      searchTerms: ["B석", "정수민", "첫 문제"],
      meta: [["CASE", "01 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "1 RECORD"], ["METHOD", "READ"]],
      prompt: "관찰석 B의 이전 담당자는 [blank]이다.",
      instruction: "파란 링크를 눌러 P-003의 ‘확인 답’ 한 줄을 읽고 입력하세요.",
      answerLabel: "정수민 (P-003)", answers: ["정수민", "P-003", "P003"], evidence: ["P-003"],
      leads: [["P-003", "P-003 정수민"]], unlocks: 1,
      success: "첫 기록을 확인했습니다. 다음은 서나리의 보관함 번호입니다.",
      phoneTime: "04:13", phone: "첫 문제 완료. 다음 문서는 보관함 번호를 한 줄로 알려 줍니다."
    },
    {
      id: "C-002", type: "C", typeName: "CASE FILE", title: "02. 보관함 번호", access: 1,
      searchTerms: ["보관함", "N-04", "서나리", "두 번째"],
      meta: [["CASE", "02 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "1 RECORD"], ["METHOD", "READ"]],
      prompt: "서나리의 개인 보관함 번호는 [blank]이다.",
      instruction: "P-004의 첫 번째 확인 답에서 번호를 그대로 입력하세요.",
      answerLabel: "N-04", answers: ["N-04", "N04"], evidence: ["P-004"],
      leads: [["P-004", "P-004 서나리의 보관함"]], unlocks: 2,
      success: "보관함 번호를 확인했습니다. 다음은 S.N.의 이름입니다.",
      phoneTime: "04:14", phone: "번호는 맞아요. 이제 현장 메모의 S.N.을 확인하세요."
    },
    {
      id: "C-003", type: "C", typeName: "CASE FILE", title: "03. S.N.의 이름", access: 2,
      searchTerms: ["S.N.", "서나리", "세 번째"],
      meta: [["CASE", "03 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "1 RECORD"], ["METHOD", "READ"]],
      prompt: "현장 메모에 적힌 S.N.은 [blank]이다.",
      instruction: "I-014의 확인 답에 이름이 그대로 적혀 있습니다.",
      answerLabel: "서나리 (P-004)", answers: ["서나리", "P-004", "P004"], evidence: ["I-014"],
      leads: [["I-014", "I-014 현장 메모"]], unlocks: 3,
      success: "S.N.의 이름을 확인했습니다. 다음은 최초 보고서 작성자입니다.",
      phoneTime: "04:15", phone: "정답입니다. 다음 문서는 최초 작성자 이름을 바로 알려 줍니다."
    },
    {
      id: "C-004", type: "C", typeName: "CASE FILE", title: "04. 최초 작성자", access: 3,
      searchTerms: ["최초", "작성자", "민도윤", "네 번째"],
      meta: [["CASE", "04 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "1 RECORD"], ["METHOD", "READ"]],
      prompt: "I-014 1차 보고서의 작성자는 [blank]이다.",
      instruction: "P-006의 확인 답에서 이름을 읽고 입력하세요.",
      answerLabel: "민도윤 (P-006)", answers: ["민도윤", "P-006", "P006"], evidence: ["P-006"],
      leads: [["P-006", "P-006 민도윤"]], unlocks: 4,
      success: "최초 작성자를 확인했습니다. 다음은 로그 보존 담당자입니다.",
      phoneTime: "04:16", phone: "좋아요. 이제 보존 담당자 이름만 찾으면 됩니다."
    },
    {
      id: "C-005", type: "C", typeName: "CASE FILE", title: "05. 보존 담당자", access: 4,
      searchTerms: ["보존", "담당자", "유해진", "다섯 번째"],
      meta: [["CASE", "05 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "1 RECORD"], ["METHOD", "READ"]],
      prompt: "출입 로그의 보존 담당자는 [blank]이다.",
      instruction: "P-009의 확인 답 한 줄을 읽고 입력하세요.",
      answerLabel: "유해진 (P-009)", answers: ["유해진", "P-009", "P009"], evidence: ["P-009"],
      leads: [["P-009", "P-009 유해진"]], unlocks: 5,
      success: "보존 담당자를 확인했습니다. 마지막은 세션 ID입니다.",
      phoneTime: "04:17", phone: "마지막 문제예요. A-027에 세션 ID가 굵게 적혀 있습니다."
    },
    {
      id: "C-006", type: "C", typeName: "CASE FILE", title: "06. 세션 ID", access: 5,
      searchTerms: ["세션", "R-14/ARCHIVE", "마지막", "여섯 번째"],
      meta: [["CASE", "06 / 06"], ["STATUS", "OPEN"], ["EVIDENCE", "1 RECORD"], ["METHOD", "READ"]],
      prompt: "색인에 없는 PADS 세션 ID는 [blank]이다.",
      instruction: "A-027의 확인 답에 적힌 ID를 그대로 입력하세요.",
      answerLabel: "R-14/ARCHIVE", answers: ["R-14/ARCHIVE", "R14ARCHIVE", "R-14 ARCHIVE"], evidence: ["A-027"],
      leads: [["A-027", "A-027 13초 로그"]], unlocks: 6,
      success: "여섯 문제를 모두 완료했습니다. 기록 원칙 문서가 열렸습니다.",
      phoneTime: "04:18", phone: "완료. 여섯 개의 확인 답을 모두 찾았습니다."
    }
  ]
};
