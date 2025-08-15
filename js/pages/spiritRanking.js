import { state as globalState } from "../state.js";
import { createElement } from "../utils.js";
import * as api from "../api.js";
import { showInfo as showSpiritInfoModal } from "../modalHandler.js"; // showInfo 대신 showSpiritInfoModal 별칭 사용
import { showLoading, hideLoading } from "../loadingIndicator.js";
import { STATS_MAPPING } from "../constants.js";

const pageState = {
  currentCategory: "수호", // 현재 선택된 환수 카테고리 (수호, 탑승, 변신)
  currentRankingType: "bond", // 현재 선택된 랭킹 종류 (결속: "bond", 능력치: "stat")
  currentStatKey: "bind", // 능력치 랭킹일 경우 선택된 스탯 키 (초기값: "bind" = 환산점수)
};
const elements = {}; // DOM 요소 참조를 저장할 객체

// 인메모리 캐시 (api.js에서 관리하므로, 여기서는 직접 접근 대신 api 함수 사용)
// if (!window.rankingCache) window.rankingCache = {}; // window 객체 사용 대신 api.js에서 모듈 스코프 캐시 사용

/**
 * 페이지의 기본 HTML 구조를 반환합니다.
 */
function getHTML() {
  return `
    <div class="sub-tabs" id="rankingCategoryTabs">
        <div class="tab active" data-category="수호">수호</div>
        <div class="tab" data-category="탑승">탑승</div>
        <div class="tab" data-category="변신">변신</div>
    </div>
    <div class="filters-container">
        <div class="filter-section">
            <div class="filter-label">랭킹 종류:</div>
            <div class="filter-buttons ranking-type-selector">
                <button class="filter-btn active" data-type="bond">결속 랭킹</button>
                <button class="filter-btn" data-type="stat">능력치 랭킹</button>
            </div>
        </div>
        <div class="filter-section" id="statSelectorContainer" style="display: none;">
            <label for="statSelector" class="filter-label">능력치:</label>
            <select id="statSelector" class="stat-selector"></select>
        </div>
    </div>
    <div class="ranking-container">
        <h1 class="ranking-title">환수 <span id="rankingCategoryTitle">수호</span> <span id="rankingTypeTitle">결속</span> 랭킹</h1>
        <div id="rankingsContainer" class="rankings-list"></div>
    </div>
  `;
}

/**
 * 랭킹 데이터를 로드하고 렌더링합니다. 캐싱 전략을 사용합니다.
 */
async function loadAndRenderRankings() {
  // `api.js`의 `fetchRankings` 함수가 캐싱을 담당하므로, 여기서는 직접 캐시 접근 로직 제거
  showLoading(
    elements.rankingsContainer, // 랭킹 컨테이너 내부에 로딩 오버레이 표시
    "랭킹 데이터 로딩 중",
    `${pageState.currentCategory} ${
      pageState.currentRankingType === "bond" ? "결속" : "능력치"
    } 랭킹을 불러오고 있습니다.`
  );
  try {
    const data = await api.fetchRankings(
      pageState.currentCategory,
      pageState.currentRankingType,
      pageState.currentStatKey
    );
    const rankings = data.rankings || []; // 백엔드 응답 구조에 맞게 `rankings` 필드 사용
    renderRankings(rankings);
  } catch (error) {
    console.error("랭킹 데이터 로드 실패:", error);
    elements.rankingsContainer.innerHTML = `<p class="error-message">랭킹 데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
  } finally {
    hideLoading(); // 로딩 인디케이터 숨김
  }
}

/**
 * 랭킹 데이터를 기반으로 UI를 렌더링합니다.
 * 랭킹 종류에 따라 다른 렌더링 함수를 호출합니다.
 * @param {Array<object>} rankingsData - 랭킹 데이터 배열
 */
function renderRankings(rankingsData) {
  // 랭킹 종류에 따라 적절한 렌더링 함수 호출
  if (pageState.currentRankingType === "bond") {
    renderBondRankings(rankingsData);
  } else {
    renderStatRankings(rankingsData);
  }
}

/**
 * 결속 랭킹을 테이블 형태로 렌더링합니다.
 * @param {Array<object>} rankings - 결속 랭킹 데이터
 */
function renderBondRankings(rankings) {
  const container = elements.rankingsContainer;
  if (!container) return; // 컨테이너 없으면 종료

  if (rankings.length === 0) {
    container.innerHTML = `<p class="no-data-message">결속 랭킹 데이터가 없습니다.</p>`;
    return;
  }

  // HTML 테이블 구조 생성
  const tableHtml = `
    <div class="ranking-table-container">
      <table class="ranking-table">
        <thead><tr><th>순위</th><th>조합</th><th>등급/세력</th><th>환산 점수</th></tr></thead>
        <tbody>
          ${rankings
            .map(
              (ranking, index) => `
            <tr class="ranking-row">
              <td class="rank-column"><div class="rank-badge rank-${
                index + 1
              }">${index + 1}</div></td>
              <td class="spirits-column"><div class="spirits-container">${ranking.spirits
                .map(
                  (spirit) =>
                    // 이미지 클릭 시 모달 열기 위해 data-spirit-name 추가
                    `<img src="${spirit.image}" alt="${spirit.name}" title="${spirit.name}" class="spirit-image" data-spirit-name="${spirit.name}">`
                )
                .join("")}</div></td>
              <td class="faction-column"><div class="faction-tags">${renderSetInfo(
                ranking
              )}</div></td>
              <td class="score-column">
                <div class="total-score">${Math.round(
                  ranking.scoreWithBind
                )}</div>
                <div class="score-breakdown">(등급: ${Math.round(
                  ranking.gradeScore
                )} | 세력: ${Math.round(
                ranking.factionScore
              )} | 장착: ${Math.round(ranking.bindScore)})</div>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
  container.innerHTML = tableHtml;
}

/**
 * 능력치 랭킹을 카드 그리드 형태로 렌더링합니다.
 * @param {Array<object>} rankings - 능력치 랭킹 데이터
 */
function renderStatRankings(rankings) {
  const container = elements.rankingsContainer;
  if (!container) return;

  if (rankings.length === 0) {
    container.innerHTML = `<p class="no-data-message">능력치 랭킹 데이터가 없습니다.</p>`;
    return;
  }

  const statDisplayName = elements.statSelector.selectedOptions[0].text;
  let html = `<h3 class="stat-ranking-title">${statDisplayName} 랭킹</h3><div class="stat-grid-container">`;

  rankings.forEach((ranking, index) => {
    let rankClass = "";
    if (index === 0) rankClass = "top-1";
    else if (index === 1) rankClass = "top-2";
    else if (index === 2) rankClass = "top-3";

    const displayValue =
      typeof ranking.value === "number" && !isNaN(ranking.value)
        ? ranking.value.toLocaleString()
        : ranking.value !== undefined && ranking.value !== null
        ? String(ranking.value)
        : "N/A";

    html += `
      <div class="stat-card ${rankClass}" data-spirit-name="${ranking.name}">
        <div class="rank-number">${index + 1}</div>
        <div class="spirit-image-container"><img src="/${ranking.image}" alt="${
      ranking.name
    }" class="spirit-image"></div>
        <div class="spirit-name">${ranking.name}</div>
        <div class="spirit-stat">${displayValue}</div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;
}

/**
 * 랭킹 항목의 등급 및 세력 세트 효과 정보를 렌더링합니다.
 * @param {object} ranking - 랭킹 항목 데이터
 * @returns {string} HTML 문자열
 */
function renderSetInfo(ranking) {
  let info = "";
  if (ranking.gradeCounts) {
    info += Object.entries(ranking.gradeCounts)
      .filter(([, count]) => count >= 2) // 2개 이상일 때만 표시
      .map(
        ([grade, count]) =>
          `<span class="grade-tag grade-tag-${
            grade === "전설" ? "legend" : "immortal"
          }">${grade} x${count}</span>`
      )
      .join(" ");
  }
  if (ranking.factionCounts) {
    info += Object.entries(ranking.factionCounts)
      .filter(([, count]) => count >= 2) // 2개 이상일 때만 표시
      .map(
        ([faction, count]) =>
          `<span class="faction-tag">${faction} x${count}</span>`
      )
      .join(" ");
  }
  return info;
}

/**
 * 능력치 랭킹 필터 드롭다운 옵션을 초기화합니다.
 */
function initStatFilter() {
  const statSelector = elements.statSelector;
  statSelector.innerHTML = ""; // 기존 옵션 비우기

  // 환산 점수 옵션 추가
  statSelector.appendChild(
    createElement("option", "", { value: "bind", text: "장착효과(환산)" })
  );
  statSelector.appendChild(
    createElement("option", "", {
      value: "registration",
      text: "등록효과(환산)",
    })
  );

  // STATS_MAPPING에 있는 모든 스탯 추가
  // (실제 데이터에 해당 스탯이 있어야 필터에 표시됨. 백엔드에서 제공되는 모든 스탯을 보여줌.)
  const allStatKeys = Object.keys(STATS_MAPPING).sort();
  allStatKeys.forEach((key) => {
    statSelector.appendChild(
      createElement("option", "", { value: key, text: STATS_MAPPING[key] })
    );
  });

  // 초기 선택값 설정
  statSelector.value = pageState.currentStatKey;
}

/**
 * 페이지의 모든 주요 이벤트 리스너를 설정합니다.
 */
function setupEventListeners() {
  // 클릭 이벤트 위임 (탭, 랭킹 종류 버튼, 스탯 카드 등)
  elements.container.addEventListener("click", handleContainerClick);
  // 스탯 필터 드롭다운 변경 이벤트
  elements.statSelector.addEventListener("change", handleStatChange);
}

/**
 * 컨테이너 내의 클릭 이벤트를 처리합니다.
 */
function handleContainerClick(e) {
  // 랭킹 카테고리 탭 클릭
  const subTab = e.target.closest("#rankingCategoryTabs .tab");
  if (subTab && !subTab.classList.contains("active")) {
    elements.subTabs.querySelector(".tab.active").classList.remove("active");
    subTab.classList.add("active");
    pageState.currentCategory = subTab.dataset.category; // 카테고리 업데이트
    document.getElementById("rankingCategoryTitle").textContent =
      pageState.currentCategory; // 제목 업데이트
    loadAndRenderRankings(); // 랭킹 재로드 및 렌더링
    return;
  }

  // 랭킹 종류 (결속/능력치) 버튼 클릭
  const typeBtn = e.target.closest(".ranking-type-selector .filter-btn");
  if (typeBtn && !typeBtn.classList.contains("active")) {
    elements.container
      .querySelector(".ranking-type-selector .filter-btn.active")
      .classList.remove("active");
    typeBtn.classList.add("active");
    pageState.currentRankingType = typeBtn.dataset.type; // 랭킹 종류 업데이트
    // 능력치 랭킹일 경우 스탯 선택 드롭다운 표시
    elements.statSelectorContainer.style.display =
      pageState.currentRankingType === "stat" ? "flex" : "none";
    document.getElementById("rankingTypeTitle").textContent =
      typeBtn.textContent; // 제목 업데이트
    loadAndRenderRankings(); // 랭킹 재로드 및 렌더링
    return;
  }

  // 환수 이미지 또는 스탯 카드 클릭 (모달 표시)
  const spiritElement = e.target.closest(".spirit-image, .stat-card");
  if (spiritElement) {
    const spiritName = spiritElement.alt || spiritElement.dataset.spirit - name; // img 태그의 alt 또는 div의 data-spirit-name
    const spiritData = globalState.allSpirits.find(
      (s) => s.name === spiritName
    );
    if (spiritData) {
      // showInfo 대신 showSpiritInfoModal 별칭 사용
      showSpiritInfoModal(spiritData, null, true); // 랭킹 모드임을 알림 (레벨 25 고정)
    }
  }
}

/**
 * 스탯 필터 드롭다운 변경 이벤트를 처리합니다.
 */
function handleStatChange(e) {
  pageState.currentStatKey = e.target.value; // 스탯 키 업데이트
  loadAndRenderRankings(); // 랭킹 재로드 및 렌더링
}

/**
 * 페이지 초기화 함수.
 * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
 */
export async function init(container) {
  container.innerHTML = getHTML(); // 페이지 HTML 삽입

  // DOM 요소 참조 저장
  elements.container = container;
  elements.subTabs = container.querySelector("#rankingCategoryTabs");
  elements.rankingsContainer = container.querySelector("#rankingsContainer");
  elements.statSelectorContainer = container.querySelector(
    "#statSelectorContainer"
  );
  elements.statSelector = container.querySelector("#statSelector");

  initStatFilter(); // 스탯 필터 초기화
  setupEventListeners(); // 이벤트 리스너 설정

  // 초기 랭킹 로드 및 렌더링
  await loadAndRenderRankings();

  console.log("환수 랭킹 페이지 초기화 완료.");
}

/**
 * 페이지 정리 함수.
 */
export function cleanup() {
  if (elements.container) {
    elements.container.removeEventListener("click", handleContainerClick);
  }
  if (elements.statSelector) {
    elements.statSelector.removeEventListener("change", handleStatChange);
  }
  console.log("환수 랭킹 페이지 정리 완료.");
}
