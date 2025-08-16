// js/resultModal.js

import { createElement } from "./utils.js";
import { getHistoryForCategory } from "./historyManager.js";
import { state as globalState } from "./state.js";
import { FACTION_ICONS, STATS_MAPPING, PERCENT_STATS } from "./constants.js";

let activeModal = null; // 현재 활성화된 모달 요소를 추적

// 강조할 주요 스탯과 해당 CSS 클래스 매핑
const SPECIAL_STAT_CLASSES = {
  damageResistance: "stat-damage-resistance",
  damageResistancePenetration: "stat-damage-resistance-penetration",
  pvpDefensePercent: "stat-pvp-defense-percent",
  pvpDamagePercent: "stat-pvp-damage-percent",
};

/**
 * 값을 숫자로 안전하게 파싱하고 콤마를 제거하며, NaN 처리합니다.
 * @param {any} value - 변환할 값
 * @returns {number} 숫자로 변환된 값 (NaN일 경우 0)
 */
function ensureNumber(value) {
  if (value === undefined || value === null) return 0;
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * 특정 효과 섹션 (등급, 세력, 장착)을 렌더링합니다.
 * 이 함수는 `updateResultView` 함수보다 먼저 정의되어야 합니다.
 * @param {string} elementId - 효과가 렌더링될 DOM 요소의 ID (예: "optimalGradeEffects")
 * @param {string} title - 섹션 제목 (예: "등급 효과")
 * @param {Array<object>} effects - 표시할 효과 데이터 배열 (예: [{key: "damage", name: "피해", value: 10}])
 * @param {number} score - 해당 섹션의 총 점수
 * @param {object} [counts={}] - 등급 또는 세력별 카운트 정보 (세트 효과 표시용)
 */
function renderEffects(elementId, title, effects, score, counts = {}) {
  const container = document.getElementById(elementId);
  if (!container) return;

  let setInfoHtml = "";
  if (counts.gradeCounts) {
    setInfoHtml = Object.entries(counts.gradeCounts)
      .filter(([, count]) => count >= 2) // 2개 이상일 때만 표시
      .map(
        ([grade, count]) =>
          `<span class="grade-tag grade-tag-${
            grade === "전설" ? "legend" : "immortal"
          }">${grade}x${count}</span>`
      )
      .join(" ");
  } else if (counts.factionCounts) {
    setInfoHtml = Object.entries(counts.factionCounts)
      .filter(([, count]) => count >= 2) // 2개 이상일 때만 표시
      .map(([faction, count]) => {
        const iconPath = FACTION_ICONS[faction] || ""; // constants.js에서 FACTION_ICONS 임포트 필요
        return `<span class="faction-tag" title="${faction}"><img src="${iconPath}" class="faction-icon" alt="${faction}">x${count}</span>`;
      })
      .join(" ");
  }

  // effects가 유효한 배열이 아니면 빈 배열로 처리하여 오류 방지
  const validEffects = Array.isArray(effects) ? effects : [];

  let effectsListHtml = '<p class="no-effects">효과 없음</p>';
  if (validEffects.length > 0) {
    effectsListHtml = `<ul class="effects-list">${validEffects
      .map((stat) => {
        // stat.key가 PERCENT_STATS에 포함되는지 확인하여 % 붙임
        const isPercent = PERCENT_STATS.includes(stat.key);
        const displayValue = isPercent
          ? `${ensureNumber(stat.value)}%` // 퍼센트 스탯
          : ensureNumber(stat.value).toLocaleString(); // 일반 숫자 스탯 (콤마 포함)

        // 특정 스탯에 대한 하이라이트 클래스 적용
        const highlightClass = SPECIAL_STAT_CLASSES[stat.key] || "";

        return `<li class="${highlightClass}"><span class="stat-name">${stat.name}</span><span class="stat-value">${displayValue}</span></li>`;
      })
      .join("")}</ul>`;
  }

  container.innerHTML = `
        <h4>${title} <span class="section-score">${Math.round(
    ensureNumber(score)
  )}</span></h4>
        ${setInfoHtml ? `<div class="set-info">${setInfoHtml}</div>` : ""}
        <div class="effects-content">${effectsListHtml}</div>
    `;
}

/**
 * 모달의 기본 구조를 생성하고 기존 모달을 제거합니다.
 * @returns {{modal: HTMLElement, content: HTMLElement}} 생성된 모달과 콘텐츠 요소
 */
function createBaseModal() {
  removeAllModals(); // 현재 열려있는 모달이 있다면 닫기
  const modal = createElement("div", "modal-overlay", { id: "optimalModal" });
  const content = createElement("div", "modal-content", {
    id: "optimalModalContent",
  });
  const closeButton = createElement("button", "modal-close", {
    id: "closeOptimalModal",
    text: "✕",
  });

  content.appendChild(closeButton); // 닫기 버튼을 콘텐츠에 추가
  modal.appendChild(content); // 콘텐츠를 모달에 추가
  document.body.appendChild(modal); // 모달을 body에 추가

  // 이벤트 리스너 설정
  closeButton.onclick = removeAllModals; // 닫기 버튼 클릭 시 모달 닫기
  modal.addEventListener("click", (e) => {
    // 모달 오버레이 외부 클릭 시 모달 닫기
    if (e.target === modal) removeAllModals();
  });

  // ESC 키로 모달 닫기
  const escListener = (e) => {
    if (e.key === "Escape") removeAllModals();
  };
  document.addEventListener("keydown", escListener);
  modal._escListener = escListener; // 이벤트 리스너 참조 저장 (제거 위함)

  activeModal = modal; // 현재 활성 모달로 설정
  return { modal, content };
}

/**
 * 최적 조합 결과를 모달로 표시합니다.
 * @param {object} result - 결속 계산 결과 또는 랭킹 상세 데이터
 * @param {boolean} [isFromRanking=false] - 랭킹 페이지에서 호출되었는지 여부. true일 경우 기록 탭을 숨깁니다.
 */
export function showResultModal(result, isFromRanking = false) {
  if (
    !result ||
    !Array.isArray(result.combination) ||
    result.combination.length === 0
  ) {
    alert("계산 결과 데이터가 올바르지 않습니다.");
    return;
  }
  const { modal, content } = createBaseModal(); // 모달 기본 구조 생성
  modal.style.display = "flex"; // 모달 표시
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지

  renderResultContent(result, content, isFromRanking); // 모달 콘텐츠 렌더링

  // --- 카카오 광고 로드 로직 (모달 열린 후) ---
  setTimeout(() => {
    try {
      // kakao AdFit 스크립트가 로드되어 window.adfit 객체가 존재하는지 확인
      if (window.adfit && typeof window.adfit.render === "function") {
        // 모달 내 모든 kakao_ad_area 인스턴스를 찾아서 렌더링
        const adContainers = document.querySelectorAll(
          "#optimalModalContent .kakao_ad_area"
        );
        adContainers.forEach((adElement) => {
          window.adfit.render(adElement);
        });
        console.log("Kakao AdFit: Ads re-rendered in modal.");
      } else {
        console.warn(
          "Kakao AdFit script (window.adfit) not yet loaded or not available."
        );
      }
    } catch (error) {
      console.error("Kakao AdFit: Error rendering ads in modal:", error);
    }
  }, 100); // 짧은 딜레이를 주어 DOM 렌더링 완료 대기 (필요시 조정)
  // --- 카카오 광고 로드 로직 끝 ---
}

/**
 * 모달의 콘텐츠를 렌더링합니다.
 * @param {object} result - 결속 계산 결과 또는 랭킹 상세 데이터
 * @param {HTMLElement} container - 콘텐츠가 렌더링될 DOM 요소
 * @param {boolean} isFromRanking - 랭킹 페이지에서 호출되었는지 여부
 */
function renderResultContent(result, container, isFromRanking) {
  // container.innerHTML = ""; // <--- 이 라인은 createBaseModal에서 이미 content를 비우고 닫기버튼을 추가했으므로,
  //      여기서 다시 비우면 닫기 버튼이 사라집니다. 제거해야 합니다.
  //      다만, 이 라인이 ReferenceError의 직접적인 원인은 아니었습니다.

  // 닫기 버튼은 createBaseModal에서 이미 추가했으므로, 여기서 다시 생성할 필요 없습니다.
  // const closeButton = createElement("button", "modal-close", { text: "✕" });
  // closeButton.onclick = removeAllModals;

  const headerDiv = createElement("div", "optimal-header", {
    id: "optimalHeader",
  });
  const combinationContainer = createElement(
    "div",
    "combination-results-container",
    { id: "combinationResultsContainer" }
  );
  const resultsContainer = createElement("div", "results-container");
  resultsContainer.innerHTML = `
        <div class="results-section" id="optimalGradeEffects"></div>
        <div class="results-section" id="optimalFactionEffects"></div>
        <div class="results-section" id="optimalBindEffects"></div>
    `;
  const detailsContainer = createElement("div", "spirit-details-container", {
    id: "optimalSpiritsDetails",
  });

  // 카카오 광고 단위 추가 (요청하신 정보로 업데이트)
  const kakaoAdModal = createElement("ins", "kakao_ad_area", {
    style: "display:none; margin: 10px auto;",
    "data-ad-unit": "DAN-bwZLqrZLwsCZMMPu", // 당신의 광고 단위 ID로 교체!
    "data-ad-width": "728",
    "data-ad-height": "90",
  });

  container.appendChild(kakaoAdModal);
  // 이제 closeButton은 createBaseModal에서 이미 container에 추가되었습니다.
  // 그래서 renderResultContent에서는 headerDiv부터 append 하면 됩니다.
  container.append(headerDiv); // <--- closeButton 다음에 headerDiv부터 추가

  // isFromRanking이 false일 때만 historyContainer를 생성하고 추가합니다.
  if (!isFromRanking) {
    const historyContainer = createElement("div", "history-tabs-container", {
      id: "historyContainer",
    });
    container.appendChild(historyContainer);
  }

  // 나머지 주요 콘텐츠 컨테이너 추가
  container.append(combinationContainer, resultsContainer, detailsContainer);

  // UI 업데이트 함수 호출 (isFromRanking 전달)
  updateResultView(result, isFromRanking);

  // isFromRanking이 false일 때만 기록 탭을 렌더링합니다.
  if (!isFromRanking) {
    if (result.spirits && result.spirits.length > 0 && result.spirits[0].type) {
      renderHistoryTabs(result.spirits[0].type);
    } else {
      console.warn(
        "History cannot be rendered: missing spirit type in result.",
        result
      );
      const historyContainer = document.getElementById("historyContainer");
      if (historyContainer) {
        historyContainer.innerHTML = `<p class="no-history-message">기록을 불러올 수 없습니다.</p>`;
      }
    }
  }
}

/**
 * 모달 뷰의 데이터를 업데이트합니다.
 * @param {object} result - 결속 계산 결과 또는 랭킹 상세 데이터
 * @param {boolean} isFromRanking - 랭킹 페이지에서 호출되었는지 여부 (히스토리 탭 렌더링에 사용)
 */
function updateResultView(result, isFromRanking) {
  const {
    gradeScore,
    factionScore,
    bindScore,
    gradeEffects,
    factionEffects,
    bindStats, // 이전에 bindStats가 undefined였던 문제 해결 필요 (백엔드 또는 api.js 변환)
    spirits,
  } = result;

  const combinedScore = Math.round(
    ensureNumber(gradeScore) +
      ensureNumber(factionScore) +
      ensureNumber(bindScore)
  );

  document.getElementById("optimalHeader").innerHTML = `
        <h3 class="modal-main-title">${spirits[0].type} 결속 최적 조합</h3>
        <div class="modal-score-display">
            <span class="score-title">종합 점수</span>
            <span class="score-value">${combinedScore}</span>
            <span class="score-breakdown">
                (등급: ${Math.round(ensureNumber(gradeScore))} 
                + 세력: ${Math.round(ensureNumber(factionScore))} 
                + 장착: ${Math.round(ensureNumber(bindScore))})
            </span>
        </div>
    `;

  document.getElementById("combinationResultsContainer").innerHTML = `
        <div class="spirits-grid-container">${spirits
          .map(
            (spirit) => `
                <div class="spirit-info-item" title="${spirit.name} (Lv.${
              spirit.level || 25
            })">
                    <img src="${spirit.image}" alt="${spirit.name}">
                    <div class="spirit-info-details">
                        <div class="spirit-info-name">${spirit.name}</div>
                        <div class="spirit-info-level">Lv.${
                          spirit.level || 25
                        }</div>
                    </div>
                </div>`
          )
          .join("")}
        </div>
    `;

  // renderEffects 호출 시 bindStats (또는 bindStat) 데이터를 그대로 사용
  renderEffects("optimalGradeEffects", "등급 효과", gradeEffects, gradeScore, {
    gradeCounts: spirits.reduce((acc, s) => {
      acc[s.grade] = (acc[s.grade] || 0) + 1;
      return acc;
    }, {}),
  });
  renderEffects(
    "optimalFactionEffects",
    "세력 효과",
    factionEffects,
    factionScore,
    {
      factionCounts: spirits.reduce((acc, s) => {
        if (s.influence) acc[s.influence] = (acc[s.influence] || 0) + 1;
        return acc;
      }, {}),
    }
  );
  renderEffects("optimalBindEffects", "장착 효과", bindStats, bindScore);

  // 모달 하단 상세 테이블 (spirits 데이터 활용)
  renderSpiritDetailsTable(spirits);

  // 기록 탭은 renderResultContent에서 조건부로 처리하므로 여기서 호출하지 않습니다.
}

// --- renderHistoryTabs 함수 ---
function renderHistoryTabs(category) {
  const history = getHistoryForCategory(category);
  const container = document.getElementById("historyContainer");
  if (!container) return; // container가 존재하지 않으면 (isFromRanking이 true인 경우) 바로 반환

  if (history.length === 0) {
    container.innerHTML = `<p class="no-history-message">${category} 카테고리에 저장된 기록이 없습니다.</p>`;
    return;
  }

  let highestScore = -1,
    highestScoreId = null;
  const newestId = history.length > 0 ? history[0].id : null;

  history.forEach((entry) => {
    const score = Math.round(
      ensureNumber(entry.gradeScore) +
        ensureNumber(entry.factionScore) +
        ensureNumber(entry.bindScore)
    );
    if (score > highestScore) {
      highestScore = score;
      highestScoreId = entry.id;
    }
  });

  const tabsHtml = Array(5)
    .fill(null)
    .map((_, index) => {
      const entry = history[index];
      if (!entry) return `<div class="history-tab-placeholder"></div>`;

      const score = Math.round(
        ensureNumber(entry.gradeScore) +
          ensureNumber(entry.factionScore) +
          ensureNumber(entry.bindScore)
      );
      const isNewest = entry.id === newestId;
      const isBest = entry.id === highestScoreId;

      return `<button class="history-tab ${isBest ? "best" : ""} ${
        isNewest ? "newest active" : ""
      }" data-history-id="${entry.id}">
            <div class="tab-indicators">
                ${isNewest ? '<span class="current-marker">최신</span>' : ""}
                ${isBest ? '<span class="best-marker">최고</span>' : ""}
            </div>
            <div class="tab-main-info">
                <span class="tab-score">${score}</span>
                <span class="tab-timestamp">${entry.timestamp.substring(
                  5,
                  16
                )}</span>
            </div>
        </button>`;
    })
    .join("");

  container.innerHTML = `<div class="history-tabs">${tabsHtml}</div>`;

  container.querySelectorAll(".history-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      container
        .querySelectorAll(".history-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const clickedId = parseInt(tab.dataset.historyId, 10);
      const selectedEntry = history.find((entry) => entry.id === clickedId);
      if (selectedEntry) {
        updateResultView(selectedEntry, false); // isFromRanking을 false로 전달
      }
    });
  });
}

// --- renderSpiritDetailsTable 함수 ---
function renderSpiritDetailsTable(spirits) {
  const container = document.getElementById("optimalSpiritsDetails");
  if (!container) return;

  const allStatKeys = new Set();
  spirits.forEach((spirit) => {
    const fullSpiritData = globalState.allSpirits.find(
      (s) => s.name === spirit.name && s.type === spirit.type
    );
    if (!fullSpiritData) return;

    // spirits 배열의 level 필드를 사용하여 스탯 데이터를 찾습니다.
    // spirit.stats?.[0]?.level 대신 spirit.level을 직접 사용합니다.
    const actualLevel = spirit.level || 25; // spirit.level이 없으면 기본 25
    const levelStats = fullSpiritData.stats.find(
      (s) => s.level === actualLevel
    );

    if (levelStats?.bindStat)
      Object.keys(levelStats.bindStat).forEach((key) => allStatKeys.add(key));
  });

  if (allStatKeys.size === 0) {
    container.innerHTML =
      "<h4>상세 스탯 비교</h4><p>선택된 환수의 장착 효과 스탯 정보가 없습니다.</p>";
    return;
  }

  const sortedStatKeys = [...allStatKeys].sort();

  let tableHtml = `
        <h4>상세 스탯 비교</h4>
        <div class="table-wrapper">
            <table class="spirits-stats-table">
                <thead>
                    <tr>
                        <th>능력치</th>
                        ${spirits
                          .map(
                            (s) =>
                              `<th><img src="${s.image}" class="spirit-thumbnail" alt="${s.name}" title="${s.name}"><br><span class="spirit-table-name">${s.name}</span></th>`
                          )
                          .join("")}
                        <th class="stat-total-header">합산</th>
                    </tr>
                </thead>
                <tbody>
    `;

  sortedStatKeys.forEach((statKey) => {
    const highlightClass = SPECIAL_STAT_CLASSES[statKey] || "";
    let totalValue = 0;

    let cellsHtml = "";
    spirits.forEach((spirit) => {
      const fullSpiritData = globalState.allSpirits.find(
        (s) => s.name === spirit.name && s.type === spirit.type
      );
      // spirit.level을 사용하여 스탯 데이터를 찾습니다.
      const actualLevel = spirit.level || 25; // spirit.level이 없으면 기본 25
      const levelStats = fullSpiritData?.stats.find(
        (s) => s.level === actualLevel
      );

      const value = ensureNumber(levelStats?.bindStat?.[statKey]);
      totalValue += value;

      const displayValue = PERCENT_STATS.includes(statKey)
        ? `${value}%`
        : value.toLocaleString();

      cellsHtml += `<td>${value > 0 ? displayValue : "-"}</td>`;
    });

    const totalDisplayValue = PERCENT_STATS.includes(statKey)
      ? `${totalValue.toFixed(2)}%`
      : totalValue.toLocaleString();

    tableHtml += `
        <tr class="${highlightClass}">
            <th>${STATS_MAPPING[statKey] || statKey}</th>
            ${cellsHtml}
            <td class="stat-total">${
              totalValue > 0 ? totalDisplayValue : "-"
            }</td>
        </tr>`;
  });

  tableHtml += `</tbody></table></div>`;
  container.innerHTML = tableHtml;
}

// --- removeAllModals 함수 ---
export function removeAllModals() {
  if (activeModal) {
    document.removeEventListener("keydown", activeModal._escListener);
    activeModal.remove();
    activeModal = null;
  }
  document.body.style.overflow = "auto"; // 배경 스크롤 복원
}
