// const HISTORY_KEY = "savedOptimalCombinations";
// const COUNTER_KEY = "combinationCounter";
// const MAX_HISTORY = 5;

// function loadHistory() {
//   try {
//     const saved = localStorage.getItem(HISTORY_KEY);
//     const history = saved
//       ? JSON.parse(saved)
//       : { 수호: [], 탑승: [], 변신: [] };
//     // 데이터 구조 보정 - 새로운 카테고리가 추가될 경우를 대비
//     if (!history.수호) history.수호 = [];
//     if (!history.탑승) history.탑승 = [];
//     if (!history.변신) history.변신 = [];
//     return history;
//   } catch (e) {
//     console.error("Failed to load history from localStorage:", e);
//     // 오류 발생 시 초기 상태 반환
//     return { 수호: [], 탑승: [], 변신: [] };
//   }
// }

// function loadCounter() {
//   try {
//     const saved = localStorage.getItem(COUNTER_KEY);
//     const counter = saved ? JSON.parse(saved) : { 수호: 0, 탑승: 0, 변신: 0 };
//     // 데이터 구조 보정
//     if (counter.수호 === undefined) counter.수호 = 0;
//     if (counter.탑승 === undefined) counter.탑승 = 0;
//     if (counter.변신 === undefined) counter.변신 = 0;
//     return counter;
//   } catch (e) {
//     console.error("Failed to load counter from localStorage:", e);
//     return { 수호: 0, 탑승: 0, 변신: 0 };
//   }
// }

// function saveHistory(history, counter) {
//   try {
//     localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
//     localStorage.setItem(COUNTER_KEY, JSON.stringify(counter));
//   } catch (e) {
//     console.error("기록 저장 실패:", e);
//     // localStorage 용량 초과 등의 에러 발생 시 사용자에게 알리거나 다른 처리
//     alert("조합 기록 저장에 실패했습니다. 저장 공간이 부족할 수 있습니다.");
//   }
// }

// export function addResult(result) {
//   // 유효성 검사 강화
//   if (
//     !result ||
//     !result.spirits ||
//     result.spirits.length === 0 ||
//     !result.spirits[0].type
//   ) {
//     console.warn("Invalid result data provided to addResult:", result);
//     return;
//   }

//   const category = result.spirits[0].type;
//   // 유효한 카테고리인지 다시 확인
//   if (!["수호", "탑승", "변신"].includes(category)) {
//     console.warn(`Invalid category '${category}' for history storage.`);
//     return;
//   }

//   const history = loadHistory();
//   const counter = loadCounter();

//   // 새로운 카테고리 추가 시 초기화
//   if (counter[category] === undefined) {
//     counter[category] = 0;
//   }
//   counter[category]++;

//   const index = (counter[category] - 1) % MAX_HISTORY; // 덮어쓸 인덱스 계산

//   const newEntry = {
//     ...result,
//     timestamp: new Date().toLocaleString("ko-KR", {
//       year: "numeric",
//       month: "2-digit",
//       day: "2-digit",
//       hour: "2-digit",
//       minute: "2-digit",
//       second: "2-digit",
//       hour12: false,
//     }), // 한국어 로케일로 포맷팅
//     id: Date.now(), // 고유 ID 부여 (가장 최근임을 판단하는 기준)
//   };

//   history[category][index] = newEntry; // 해당 인덱스에 새로운 결과 저장

//   saveHistory(history, counter);
// }

// export function getHistoryForCategory(category) {
//   const history = loadHistory();
//   // 존재하지 않는 카테고리에 대한 요청 방지
//   if (!history[category]) {
//     console.warn(
//       `Attempted to retrieve history for unknown category: ${category}`
//     );
//     return [];
//   }
//   // 배열이 중간에 비어있을 수 있으므로 유효한 항목만 필터링하고 최신순으로 정렬
//   const filteredHistory = history[category].filter(Boolean);
//   filteredHistory.sort((a, b) => b.id - a.id); // 가장 최신 ID가 맨 위로 오도록 정렬
//   return filteredHistory;
// }

const HISTORY_KEY = "savedOptimalCombinations";
const COUNTER_KEY = "combinationCounter";
const MAX_HISTORY = 5;

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    const history = saved
      ? JSON.parse(saved)
      : { 수호: [], 탑승: [], 변신: [] };
    if (!history.수호) history.수호 = [];
    if (!history.탑승) history.탑승 = [];
    if (!history.변신) history.변신 = [];
    return history;
  } catch (e) {
    console.error("Failed to load history from localStorage:", e);
    return { 수호: [], 탑승: [], 변신: [] };
  }
}

function loadCounter() {
  try {
    const saved = localStorage.getItem(COUNTER_KEY);
    const counter = saved ? JSON.parse(saved) : { 수호: 0, 탑승: 0, 변신: 0 };
    if (counter.수호 === undefined) counter.수호 = 0;
    if (counter.탑승 === undefined) counter.탑승 = 0;
    if (counter.변신 === undefined) counter.변신 = 0;
    return counter;
  } catch (e) {
    console.error("Failed to load counter from localStorage:", e);
    return { 수호: 0, 탑승: 0, 변신: 0 };
  }
}

function saveHistory(history, counter) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    localStorage.setItem(COUNTER_KEY, JSON.stringify(counter));
  } catch (e) {
    console.error("기록 저장 실패:", e);
    alert("조합 기록 저장에 실패했습니다. 저장 공간이 부족할 수 있습니다.");
  }
}

export function addResult(result) {
  if (
    !result ||
    !result.spirits ||
    result.spirits.length === 0 ||
    !result.spirits[0].type
  ) {
    console.warn("Invalid result data provided to addResult:", result);
    return;
  }

  const category = result.spirits[0].type;
  if (!["수호", "탑승", "변신"].includes(category)) {
    console.warn(`Invalid category '${category}' for history storage.`);
    return;
  }

  const history = loadHistory();
  const counter = loadCounter();

  if (counter[category] === undefined) {
    counter[category] = 0;
  }
  counter[category]++;

  const index = (counter[category] - 1) % MAX_HISTORY;

  const now = new Date();
  const newEntry = {
    ...result,
    timestamp: now.toLocaleString("sv-SE"), // 'YYYY-MM-DD HH:mm:ss' 형식
    id: now.getTime(),
  };

  history[category][index] = newEntry;

  saveHistory(history, counter);
}

export function getHistoryForCategory(category) {
  const history = loadHistory();
  if (!history[category]) {
    console.warn(
      `Attempted to retrieve history for unknown category: ${category}`
    );
    return [];
  }
  const filteredHistory = history[category].filter(Boolean);
  filteredHistory.sort((a, b) => b.id - a.id);
  return filteredHistory;
}
