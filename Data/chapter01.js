// Narrative content for the Chapter 1 vertical slice. UI behavior lives in ../app.js.
export const verticalSlice = {
  startDocument: "L-017",
  documents: [
    {
      id: "L-017", type: "L", typeName: "LOCATION", title: "제4관찰소", searchTerms: ["관찰석", "B석", "OBS-14/B", "사고", "배치"],
      meta: [["CLASS", "LOCATION"], ["RISK", "YELLOW"], ["IMPACT", "INFO / TEMP"], ["UPDATED", "2026.08.12"], ["AUTHOR", "시설기록과"], ["STATUS", "RESTRICTED"]],
      sections: [
        { heading: "개요", text: "본부 지하 1층의 소규모 관찰·기록실. 중앙 콘솔, 관찰석 A~K 11개, 이중 출입문, 장비 반납 보관함으로 구성된다. I-014 이후 일반 인원 출입은 정지됐다." },
        { heading: "배치 기록", text: "관찰석 B의 식별자는 <b>OBS-14/B</b>다. 현재 비어 있는 이 자리는 마지막 정식 배치자의 전근 뒤 제거되지 않은 명패를 유지하고 있다." },
        { heading: "사고 전 메모", text: "B석의 마지막 정식 배치자 확인은 인사 기록을 대조할 것. 관련 인물 파일: [[P-003|P-003 정수민]]." },
        { heading: "I-014 대조 로그", text: "사고 시각 외부 출입문은 10개 유효 배지만 기록했다. 내부 좌석 센서는 11개 점유 신호를 기록했다. 이 수치는 현재 질문의 답을 단독으로 결정하지 않는다." }
      ],
      related: [["P-003", "P-003 정수민"], ["I-014", "I-014 제4관찰소 사고"], ["L-003", "L-003 존재하지 않는 4층"]]
    },
    {
      id: "P-003", type: "P", typeName: "PERSON", title: "정수민", searchTerms: ["정수민", "관찰 담당", "OBS-14/B", "전근", "B석"],
      meta: [["CLASS", "PERSON"], ["ROLE", "관찰 담당"], ["LAST POST", "OBS-14/B"], ["UPDATED", "2026.08.08"], ["AUTHOR", "인사기록과"], ["STATUS", "TRANSFERRED"]],
      sections: [
        { heading: "인물 기록", text: "제4관찰소의 전 관찰 담당. 마지막 배치 코드는 <b>OBS-14/B</b>이며, L-017 관찰석 B를 사용했다. I-014 사고 사흘 전 타 부서 전근 처리됐다." },
        { heading: "배치 메모", text: "전근이 완전히 처리되기 전까지 B석의 물리 명패는 제거되지 않았다. 현재 빈 B석은 새로 배정된 자리가 아니라 정수민의 이전 자리다." },
        { heading: "참조", text: "해당 관찰소의 현재 물리 상태는 [[L-017|L-017 제4관찰소]] 문서에서 확인한다." }
      ],
      related: [["L-017", "L-017 제4관찰소"], ["I-014", "I-014 제4관찰소 사고"]]
    },
    {
      id: "I-014", type: "I", typeName: "INCIDENT", title: "제4관찰소 사고", searchTerms: ["사고", "11명", "10명", "03:17", "관찰소"],
      meta: [["CLASS", "INCIDENT"], ["RISK", "RED"], ["TIME", "2026.08.11 03:17"], ["AUTHOR", "P-006"], ["STATUS", "AMENDED"], ["ACCESS", "PARTIAL"]],
      sections: [
        { heading: "사건 요약", text: "2026년 8월 11일 03:17, L-017 제4관찰소에서 관찰 작업 중 사고가 발생했다. 초기 보고는 근무자 11명을 언급한다.", quote: true },
        { heading: "기록 불일치", text: "공식 근무표는 10명, 외부 출입 기록은 10개 유효 배지, 보고서 본문은 11명으로 남아 있다. 이 문서는 어느 하나가 거짓이라고 확정하지 않는다." },
        { heading: "참조", text: "사고 당시 비어 있던 관찰석의 원래 담당자는 [[P-003|P-003 정수민]]의 전근 기록과 별개로 확인해야 한다." }
      ],
      related: [["L-017", "L-017 제4관찰소"], ["P-003", "P-003 정수민"], ["O-004", "O-004 두 번째 전화기"]]
    },
    {
      id: "L-003", type: "L", typeName: "LOCATION", title: "존재하지 않는 4층", searchTerms: ["4층", "엘리베이터", "B", "공간", "본부"],
      meta: [["CLASS", "LOCATION"], ["RISK", "GREEN"], ["IMPACT", "SPATIAL / INFO"], ["UPDATED", "2026.05.18"], ["AUTHOR", "시설기록과"], ["STATUS", "OBSERVED"]],
      sections: [
        { heading: "개요", text: "PMB 본부 도면상 건물은 3층까지다. 그러나 일부 엘리베이터 유지보수 기록에는 4층 버튼 교체와 ‘본관 4층 기록관리실’ 근무 지시가 남는다." },
        { heading: "주의", text: "이 문서의 B 표기는 4층의 구획이 아니다. <b>OBS-14/B</b>는 관찰소 14의 B석이다. 익숙해 보이는 문자를 같은 의미로 읽지 말 것." }
      ],
      related: [["L-017", "L-017 제4관찰소"]]
    },
    {
      id: "O-004", type: "O", typeName: "OBJECT", title: "두 번째 전화기", searchTerms: ["전화", "UNKNOWN", "출입", "메시지", "기록"],
      meta: [["CLASS", "OBJECT"], ["RISK", "YELLOW"], ["IMPACT", "INFO / TEMP"], ["UPDATED", "2026.08.12"], ["AUTHOR", "통신보존실"], ["STATUS", "ACTIVE"]],
      sections: [
        { heading: "개요", text: "통신망에 연결되지 않았으나 수신 메시지를 남기는 유선 전화기. 수신 내용은 단독으로 사실로 취급하지 않으며, 반드시 독립된 기록으로 확인해야 한다." },
        { heading: "보존 메시지 14-03", text: "‘출입 기록이 없는 이름을 사람이라고 부르지 마. 자리가 하나 더 비어 보인다면, 먼저 누가 들어왔는지 세어.’ 이 메시지는 정답이 아니라 비교할 기록의 방향만 제시한다.", quote: true },
        { heading: "현재 상태", text: "이 물품의 격리실 위치와 실제 책상 위치는 일치하지 않는다." }
      ],
      related: [["I-014", "I-014 제4관찰소 사고"], ["L-017", "L-017 제4관찰소"]]
    }
  ],
  puzzle: {
    question: "OBS-14/B의 원래 담당자는 누구인가?",
    prompt: "두 개 이상의 기록을 대조하라.",
    answers: ["정수민", "P-003", "P003"]
  },
  phone: {
    time: "04:17",
    message: "정수민은 떠났어.\n그런데 네 자리는 왜 아직\n그를 기다리고 있지?"
  }
};
