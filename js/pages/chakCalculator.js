import { createElement } from "../utils.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import * as api from "../api.js";
import { showChakResultsModal } from "../components/chakResultsModal.js"; // 새로 생성할 모달 컴포넌트 임포트

const pageState = {
  chakData: null, // 서버에서 불러온 착 데이터 (equipment, costs, constants)
  selectedPart: null, // 현재 선택된 장비 부위 (예: "투구_0")
  selectedLevel: null, // 현재 선택된 강화 레벨 (예: "+1")
  userResources: { goldButton: 10000, colorBall: 10000 }, // 사용자 보유 자원
  statState: {}, // 각 착 스탯의 현재 상태 Map<cardId, {level, value, isUnlocked, isFirst, ...}>
  allAvailableStats: [], // 모든 착 스탯 이름 목록 (검색 필터링용)
  selectedStats: [], // 검색 또는 프리셋으로 선택된 스탯 목록 (검색 결과 모달 표시용)
};
const elements = {}; // DOM 요소 참조를 저장할 객체

/**
 * 페이지의 기본 HTML 구조를 반환합니다.
 * 참고: 이 HTML 문자열이 매우 길고 복잡하므로,
 * 실제 대규모 프로젝트에서는 HTML <template> 태그를 사용하거나,
 * JavaScript에서 DOM을 직접 생성하는 방식으로 구조를 분할하는 것이 유지보수에 유리할 수 있습니다.
 */
function getHTML() {
  return `
    <div class="layout-container chak-container">
      <div class="equipment-section">
        <div class="panel equipment-panel">
          <h3>장비 부위</h3>
          <div id="equipment-selector" class="button-grid"></div>
        </div>
      </div>
      <div class="level-info-section">
        <div class="panel level-panel">
          <h3>강화 레벨</h3>
          <div id="level-selector" class="level-buttons"></div>
        </div>
        <div class="panel enhancement-panel">
          <h3>능력치 정보</h3>
          <div id="stats-display" class="stats-grid"></div>
        </div>
      </div>
      <div class="panel summary-panel">
        <div class="tool-section">
            <div class="preset-section">
                <button id="boss-preset-btn" class="btn btn-secondary boss-btn">보스용 조합</button>
                <button id="pvp-preset-btn" class="btn btn-primary pvp-btn">피빕용 조합</button>
            </div>
            <div class="search-section">
                <div class="search-input-container">
                    <input id="search-input" placeholder="능력치 검색..." class="search-input">
                    <button id="search-button" class="search-btn">검색</button>
                </div>
                <div class="dropdown-container">
                    <div id="stat-options" class="stat-options"></div>
                </div>
                <div class="selected-stats" id="selected-stats"></div>
            </div>
        </div>
        <h3>능력치 합계 및 자원 현황</h3>
        <div class="resources-section">
          <label class="resource-label">보유 수량</label>
          <div class="resource-inputs">
            <div class="resource-input">
              <img src="/assets/img/gold-button.jpg" alt="황금단추" class="resource-icon-img">
              <input type="number" id="gold-button" value="10000" min="0">
            </div>
            <div class="resource-input">
              <img src="/assets/img/fivecolored-beads.jpg" alt="오색구슬" class="resource-icon-img">
              <input type="number" id="color-ball" value="10000" min="0">
            </div>
          </div>
          <div class="resource-status">
            <div id="resource-summary"></div>
          </div>
        </div>
        <div id="summary-display" class="summary-box">
          <p>능력치가 개방되면 여기에 합계가 표시됩니다.</p>
        </div>
      </div>
    </div>
    <!-- 모달은 이제 chakResultsModal.js에서 관리 -->
  `;
}

/**
 * 페이지를 초기화하고 필요한 데이터를 로드하며 이벤트 리스너를 설정합니다.
 * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
 */
export async function init(container) {
  // <-- init 함수가 여기 export 되어 있습니다.
  container.innerHTML = getHTML(); // 페이지 HTML 삽입

  // DOM 요소 참조 저장
  elements.container = container;
  elements.equipmentSelector = container.querySelector("#equipment-selector");
  elements.levelSelector = container.querySelector("#level-selector");
  elements.statsDisplay = container.querySelector("#stats-display");
  elements.summaryDisplay = container.querySelector("#summary-display");
  elements.goldButton = container.querySelector("#gold-button");
  elements.colorBall = container.querySelector("#color-ball");
  elements.bossPresetBtn = container.querySelector("#boss-preset-btn");
  elements.pvpPresetBtn = container.querySelector("#pvp-preset-btn");
  elements.searchInput = container.querySelector("#search-input");
  elements.searchButton = container.querySelector("#search-button");
  elements.statOptions = container.querySelector("#stat-options");
  elements.selectedStats = container.querySelector("#selected-stats");
  elements.resourceSummary = container.querySelector("#resource-summary");

  // 로딩 인디케이터 표시 (app-container에 오버레이)
  showLoading(
    container,
    "착 데이터 로딩 중...",
    "서버에서 착 정보를 불러오고 있습니다..."
  );

  try {
    pageState.chakData = await api.fetchChakData(); // 착 데이터 불러오기
    collectAllStatNames(); // 모든 스탯 이름 수집 (검색 필터링용)
    populateStatOptions(); // 스탯 검색 옵션 채우기
    renderSelectors(); // 장비 부위 및 강화 레벨 선택기 렌더링
    renderStatCards(); // 현재 선택된 부위/레벨의 스탯 카드 렌더링
    renderSummary(); // 능력치 합계 및 자원 현황 렌더링 (초기 상태)

    // 이벤트 리스너 설정
    elements.equipmentSelector.addEventListener("click", handleSelectorClick);
    elements.levelSelector.addEventListener("click", handleSelectorClick);
    elements.statsDisplay.addEventListener("click", handleStatAction);
    elements.goldButton.addEventListener("input", handleResourceChange);
    elements.colorBall.addEventListener("input", handleResourceChange);
    elements.bossPresetBtn.addEventListener("click", () =>
      optimizeStats("boss")
    );
    elements.pvpPresetBtn.addEventListener("click", () => optimizeStats("pvp"));
    setupSearchEventListeners();

    console.log("착 계산 페이지 초기화 완료.");
  } catch (error) {
    console.error("Chak page init error:", error);
    // 오류 메시지 표시
    container.innerHTML = `<p class="error-message">착 데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
  } finally {
    hideLoading(); // 로딩 인디케이터 숨김
  }
}

/**
 * 페이지 정리 함수.
 */
export function cleanup() {
  // <-- cleanup 함수가 여기 export 되어 있습니다.
  // 이벤트 리스너 제거
  if (elements.equipmentSelector)
    elements.equipmentSelector.removeEventListener(
      "click",
      handleSelectorClick
    );
  if (elements.levelSelector)
    elements.levelSelector.removeEventListener("click", handleSelectorClick);
  if (elements.statsDisplay)
    elements.statsDisplay.removeEventListener("click", handleStatAction);
  if (elements.goldButton)
    elements.goldButton.removeEventListener("input", handleResourceChange);
  if (elements.colorBall)
    elements.colorBall.removeEventListener("input", handleResourceChange);
  if (elements.bossPresetBtn)
    elements.bossPresetBtn.removeEventListener("click", () =>
      optimizeStats("boss")
    );
  if (elements.pvpPresetBtn)
    elements.pvpPresetBtn.removeEventListener("click", () =>
      optimizeStats("pvp")
    );
  if (elements.searchInput)
    elements.searchInput.removeEventListener("click", (e) =>
      e.stopPropagation()
    );
  if (elements.searchInput)
    elements.searchInput.removeEventListener("input", () =>
      filterStatOptions(elements.searchInput.value)
    );
  if (elements.searchButton)
    elements.searchButton.removeEventListener("click", searchStats);
  document.removeEventListener("click", () => {
    elements.statOptions.style.display = "none";
  });

  // cleanup for chakResultsModal is handled within its module.
  console.log("착 계산 페이지 정리 완료.");
}

/**
 * 장비 부위 및 강화 레벨 선택 버튼을 렌더링합니다.
 */
function renderSelectors() {
  const { parts, levels } = pageState.chakData.constants;

  // 초기 선택값 설정 (데이터 로드 후 첫 번째 항목 선택)
  pageState.selectedPart = `${parts[0]}_0`; // "투구_0" (고유 ID를 위해 인덱스 추가)
  pageState.selectedLevel = levels[0]; // "+1"

  elements.equipmentSelector.innerHTML = "";
  elements.levelSelector.innerHTML = "";

  // 장비 부위 버튼 렌더링
  parts.forEach((part, index) => {
    const uniquePartId = `${part}_${index}`; // 각 부위의 고유 ID (같은 이름의 부위가 있을 수 있으므로)
    const btn = createElement("button", "selector-btn equip-btn", {
      text: part,
      "data-part-id": uniquePartId,
    });
    elements.equipmentSelector.appendChild(btn);
  });

  levels.forEach((level) => {
    const btn = createElement("button", "selector-btn level-btn", {
      "data-level": level,
    });
    btn.innerHTML = `
            <div class="level-text">${level}</div>
            <div class="level-progress-container">
                <div class="level-status"></div>
                <div class="level-progress-bar empty" style="width: 0%;"></div>
            </div>
            <div class="progress-dots">
                ${[...Array(4)]
                  .map(() => `<span class="progress-dot gray"></span>`)
                  .join("")}
            </div>
        `;
    elements.levelSelector.appendChild(btn);
  });

  updateActiveSelectors(); // 선택된 버튼 활성화 스타일 적용
}

/**
 * 현재 선택된 장비 부위 및 강화 레벨에 해당하는 능력치 카드들을 렌더링합니다.
 */
function renderStatCards() {
  if (!pageState.selectedPart || !pageState.selectedLevel) return;

  const dataKeyPart = pageState.selectedPart.split("_")[0]; // "투구_0" -> "투구"
  const levelKey = `lv${pageState.selectedLevel.replace("+", "")}`; // "+1" -> "lv1"
  const stats = pageState.chakData.equipment[dataKeyPart]?.[levelKey] || {};

  elements.statsDisplay.innerHTML = ""; // 기존 스탯 카드 비우기
  let statIndex = 0; // 카드 ID 생성을 위한 인덱스
  Object.entries(stats).forEach(([statName, maxValue]) => {
    // 각 스탯 카드의 고유 ID 생성 ( statName + selectedPart + selectedLevel + index )
    const cardId = `${statName}_${pageState.selectedPart}_${pageState.selectedLevel}_${statIndex}`;
    // 해당 스탯의 저장된 상태를 불러오거나 초기화
    const state = pageState.statState[cardId] || {
      level: 0,
      value: 0,
      isUnlocked: false,
      isFirst: false, // 이 스탯이 해당 부위/레벨에서 첫 번째로 개방된 스탯인지
      part: pageState.selectedPart,
      partLevel: pageState.selectedLevel,
      statName: statName,
      maxValue: maxValue,
    };

    const card = createStatCard(statName, maxValue, state, cardId, statIndex);
    elements.statsDisplay.appendChild(card);
    statIndex++;
  });
  updateAllButtonStates(); // 모든 스탯 카드의 버튼 상태 업데이트
  updateLevelButtonIndicators(); // 레벨 선택기 버튼의 진행도 표시 업데이트
}

/**
 * 하나의 능력치 카드를 생성합니다.
 */
function createStatCard(statName, maxValue, state, cardId, statIndex) {
  const displayStatName = statName.replace(/\d+$/, ""); // 스탯 이름에서 숫자 제거 (예: strength0 -> strength)
  const card = createElement("div", "stat-card", {
    "data-card-id": cardId,
    "data-stat-index": statIndex,
    "data-stat-name": statName,
  });
  card.innerHTML = `
        <div class="card-header">
            <h3>${displayStatName}</h3>
            <button class="redistribute-btn" title="초기화">↻</button>
        </div>
        <p class="value-display">${state.value} / ${maxValue}</p>
        <div class="progress-container">
            <div class="progress-dots"></div>
            <p class="progress-display">강화 단계: ${state.level}/3</p>
        </div>
        <button class="action-btn"></button>
    `;
  updateStatCardUI(card, state, maxValue); // 카드 UI 업데이트
  return card;
}

/**
 * 능력치 카드의 UI (값, 진행도 점, 버튼)를 업데이트합니다.
 */
function updateStatCardUI(card, state, maxValue) {
  card.querySelector(
    ".value-display"
  ).textContent = `${state.value} / ${maxValue}`;
  card.querySelector(
    ".progress-display"
  ).textContent = `강화 단계: ${state.level}/3`;

  const dotsContainer = card.querySelector(".progress-dots");
  dotsContainer.innerHTML = [...Array(3)]
    .map((_, i) => {
      let dotClass = "gray"; // 기본은 회색
      if (state.isUnlocked) {
        dotClass = i < state.level ? "blue" : "yellow"; // 개방되었으면 레벨에 따라 파랑/노랑
      }
      return `<span class="progress-dot ${dotClass}"></span>`;
    })
    .join("");

  updateButtonState(card, state); // 버튼 상태 업데이트
}

/**
 * 모든 스탯 카드의 버튼 상태를 업데이트합니다.
 * '첫 번째 개방' 규칙에 따라 버튼 텍스트와 비용이 달라집니다.
 */
function updateAllButtonStates() {
  // 현재 부위/레벨에서 이미 '첫 번째' 스탯이 개방되었는지 확인
  const hasFirstUnlocked = Object.values(pageState.statState).some(
    (s) =>
      s.part === pageState.selectedPart &&
      s.partLevel === pageState.selectedLevel &&
      s.isFirst
  );

  elements.statsDisplay.querySelectorAll(".stat-card").forEach((card) => {
    const cardId = card.dataset.cardId;
    const state = pageState.statState[cardId] || {
      level: 0,
      isUnlocked: false,
      isFirst: false,
    };
    updateButtonState(card, state, hasFirstUnlocked);
  });
}

/**
 * 특정 스탯 카드의 버튼 상태를 업데이트합니다.
 */
function updateButtonState(card, state, hasFirstUnlockedOverride = null) {
  const button = card.querySelector(".action-btn");
  if (!button) return;

  button.disabled = false; // 기본적으로 활성화

  // 현재 컨텍스트에서의 '첫 번째 개방' 여부
  const hasFirstUnlocked =
    hasFirstUnlockedOverride ?? // 인자로 넘어왔으면 사용
    Object.values(pageState.statState).some(
      // 없으면 현재 상태에서 직접 계산
      (s) =>
        s.part === pageState.selectedPart &&
        s.partLevel === pageState.selectedLevel &&
        s.isFirst
    );

  if (state.isUnlocked) {
    if (state.level >= 3) {
      button.innerHTML = `<span>완료</span>`;
      button.disabled = true; // 최대 레벨 도달 시 비활성화
    } else {
      // 이미 개방된 상태에서 강화 비용
      const costKey = state.isFirst
        ? "upgradeFirst"
        : `upgradeOther${state.level}`; // 레벨에 따라 다른 비용
      const cost = pageState.chakData.costs[costKey];
      button.innerHTML = `<img src="/assets/img/fivecolored-beads.jpg" class="btn-icon"> <span>강화 ${cost}</span>`;
    }
  } else {
    // 개방되지 않은 상태에서 개방 비용
    const costKey = hasFirstUnlocked ? "unlockOther" : "unlockFirst"; // 첫 번째인지 아닌지에 따라 비용 다름
    const cost = pageState.chakData.costs[costKey];
    const icon = hasFirstUnlocked ? "gold-button.jpg" : "fivecolored-beads.jpg";
    button.innerHTML = `<img src="/assets/img/${icon}" class="btn-icon"> <span>선택 ${cost}</span>`;
  }
}

/**
 * 선택된 장비 부위 및 레벨 선택기 버튼의 활성화 상태를 업데이트합니다.
 */
function updateActiveSelectors() {
  elements.equipmentSelector
    .querySelectorAll(".selector-btn")
    .forEach((btn) => {
      const isActive = btn.dataset.partId === pageState.selectedPart;
      btn.classList.toggle("active", isActive);
      // CSS 클래스도 함께 토글 (예: bg-sky-500)
      btn.classList.toggle("bg-sky-500", isActive);
    });
  elements.levelSelector.querySelectorAll(".selector-btn").forEach((btn) => {
    const isActive = btn.dataset.level === pageState.selectedLevel;
    btn.classList.toggle("active", isActive);
    // CSS 클래스도 함께 토글 (예: bg-emerald-500)
    btn.classList.toggle("bg-emerald-500", isActive);
  });
}

/**
 * 레벨 선택기 버튼 하단의 진행도 인디케이터를 업데이트합니다.
 */
function updateLevelButtonIndicators() {
  elements.levelSelector.querySelectorAll(".level-btn").forEach((btn) => {
    const level = btn.dataset.level; // 예: "+1"
    const dataKeyPart = pageState.selectedPart.split("_")[0]; // 예: "투구"
    const levelKey = `lv${level.replace("+", "")}`; // 예: "lv1"
    const statsForLevel =
      pageState.chakData.equipment[dataKeyPart]?.[levelKey] || {};

    const dotsContainer = btn.querySelector(".progress-dots");
    if (!dotsContainer) return;
    dotsContainer.innerHTML = ""; // 기존 점들 비우기

    const statEntries = Object.entries(statsForLevel);
    const maxDots = Math.min(4, statEntries.length); // 최대 4개 또는 실제 스탯 수만큼 점 표시

    for (let i = 0; i < maxDots; i++) {
      const [statName] = statEntries[i];
      // 스탯 카드 ID와 동일한 로직으로 ID 생성 (현재 선택된 part, level 기준)
      const cardId = `${statName}_${pageState.selectedPart}_${level}_${i}`;
      const state = pageState.statState[cardId] || {
        isUnlocked: false,
        level: 0,
      };
      const dot = createElement("span", "progress-dot");
      if (state.isUnlocked) {
        dot.classList.add(state.level === 3 ? "blue" : "yellow"); // 최대 강화는 파랑, 부분 강화는 노랑
      } else {
        dot.classList.add("gray"); // 개방 안 됨
      }
      dotsContainer.appendChild(dot);
    }
    updateLevelProgressBar(btn, Object.values(statsForLevel).length);
  });
}

/**
 * 레벨 선택기 버튼의 진행도 바와 상태 텍스트를 업데이트합니다.
 */
function updateLevelProgressBar(btn, totalStats) {
  const level = btn.dataset.level;
  const progressBar = btn.querySelector(".level-progress-bar");
  const statusText = btn.querySelector(".level-status");

  if (!progressBar || !statusText || totalStats === 0) {
    // 스탯이 없으면 진행도 0으로 초기화
    if (progressBar) progressBar.style.width = `0%`;
    if (statusText) statusText.textContent = "";
    return;
  }

  let totalPoints = 0; // 현재 레벨에서 개방된 스탯들의 총 강화 레벨 합
  let unlockedCount = 0; // 현재 레벨에서 개방된 스탯의 개수

  Object.values(pageState.statState).forEach((state) => {
    if (
      state.part === pageState.selectedPart &&
      state.partLevel === level &&
      state.isUnlocked
    ) {
      totalPoints += state.level;
      unlockedCount++;
    }
  });

  const totalMaxPoints = totalStats * 3; // 해당 레벨의 모든 스탯이 최대 강화되었을 때의 총점
  const percent =
    totalMaxPoints > 0 ? Math.round((totalPoints / totalMaxPoints) * 100) : 0;

  progressBar.style.width = `${percent}%`;
  progressBar.className = "level-progress-bar"; // 기존 클래스 제거 후 다시 추가
  if (percent === 0) progressBar.classList.add("empty");
  else if (percent < 100) progressBar.classList.add("partial");
  else progressBar.classList.add("complete");

  statusText.textContent =
    unlockedCount > 0 ? `${unlockedCount}/${totalStats} (${percent}%)` : "";
}

/**
 * 능력치 합계와 자원 현황을 계산하고 렌더링합니다.
 */
async function renderSummary() {
  // 요약 영역에 로딩 인디케이터 표시
  showLoading(elements.summaryDisplay, "합계 계산 중...");

  try {
    // 백엔드 API 호출하여 계산 결과 받아오기
    const result = await api.calculateChak({
      statState: pageState.statState,
      userResources: pageState.userResources,
    });
    const { summary, resources } = result;

    // 능력치 합계 HTML 생성
    let statHtml =
      Object.keys(summary).length > 0
        ? `<div class="summary-section"><div class="stat-list">${Object.entries(
            summary
          )
            .sort((a, b) => b[1] - a[1]) // 값 내림차순 정렬
            .map(
              ([stat, value]) =>
                `<div class="stat-item"><span class="stat-name">${stat}</span><span class="stat-value">+${value}</span></div>`
            )
            .join("")}</div></div>`
        : "<p>능력치가 개방되지 않았습니다.</p>";

    elements.summaryDisplay.innerHTML = statHtml;

    // 자원 현황 HTML 생성
    elements.resourceSummary.innerHTML = `
            <div class="resource-summary-item">
                <img src="/assets/img/gold-button.jpg" class="resource-icon-img-small">
                <span class="resource-details">
                    <span class="${
                      resources.goldButton.remaining < 0
                        ? "resource-negative"
                        : ""
                    }">${resources.goldButton.remaining.toLocaleString()}</span> 보유 / <span>${resources.goldButton.consumed.toLocaleString()}</span> 소모
                </span>
            </div>
            <div class="resource-summary-item">
                <img src="/assets/img/fivecolored-beads.jpg" class="resource-icon-img-small">
                <span class="resource-details">
                    <span class="${
                      resources.colorBall.remaining < 0
                        ? "resource-negative"
                        : ""
                    }">${resources.colorBall.remaining.toLocaleString()}</span> 보유 / <span>${resources.colorBall.consumed.toLocaleString()}</span> 소모
                </span>
            </div>
        `;
  } catch (error) {
    alert(`합계 계산 오류: ${error.message}`);
    console.error("Chak summary calculation failed:", error);
    elements.summaryDisplay.innerHTML = `<p class="error-message">계산 중 오류가 발생했습니다.</p>`;
  } finally {
    hideLoading(); // 로딩 인디케이터 숨김
  }
}

/**
 * 장비 부위 또는 강화 레벨 선택 버튼 클릭 이벤트를 처리합니다.
 */
function handleSelectorClick(e) {
  const btn = e.target.closest(".selector-btn");
  if (!btn) return;

  if (btn.classList.contains("equip-btn")) {
    pageState.selectedPart = btn.dataset.partId;
  } else if (btn.classList.contains("level-btn")) {
    pageState.selectedLevel = btn.dataset.level;
  }
  updateActiveSelectors(); // 선택된 버튼 스타일 업데이트
  renderStatCards(); // 스탯 카드 재렌더링
  // renderSummary(); // 선택기 변경만으로 합계를 업데이트할 필요는 없음
}

/**
 * 스탯 카드 내의 액션 (개방/강화, 초기화) 클릭 이벤트를 처리합니다.
 */
function handleStatAction(e) {
  const card = e.target.closest(".stat-card");
  if (!card) return;

  const cardId = card.dataset.cardId;
  const statName = card.dataset.statName; // 원래 스탯 이름 (예: strength0)
  if (!statName) return;

  const dataKeyPart = pageState.selectedPart.split("_")[0];
  const levelKey = `lv${pageState.selectedLevel.replace("+", "")}`;
  const maxValue = (pageState.chakData.equipment[dataKeyPart]?.[levelKey] ||
    {})[statName];
  if (maxValue === undefined) {
    console.error(`Max value not found for ${statName}`);
    return;
  }

  // 현재 스탯 상태를 깊은 복사하여 불변성 유지 (원래 상태는 그대로 두고 새로운 상태를 만듦)
  let state = JSON.parse(
    JSON.stringify(
      pageState.statState[cardId] || {
        level: 0,
        value: 0,
        isUnlocked: false,
        isFirst: false, // 이 스탯이 해당 부위/레벨에서 첫 번째로 개방된 스탯인지
        part: pageState.selectedPart,
        partLevel: pageState.selectedLevel,
        statName: statName,
        maxValue: maxValue,
      }
    )
  );

  if (e.target.closest(".action-btn")) {
    // 개방 또는 강화 버튼 클릭
    if (state.level >= 3) return; // 이미 최대 레벨이면 더 이상 진행 불가

    if (!state.isUnlocked) {
      // 아직 개방되지 않은 경우
      // 현재 부위/레벨에서 첫 번째로 개방되는 스탯인지 확인
      const hasFirst = Object.values(pageState.statState).some(
        (s) =>
          s.part === pageState.selectedPart &&
          s.partLevel === pageState.selectedLevel &&
          s.isFirst
      );
      state.isFirst = !hasFirst; // 첫 번째가 아니라면 false, 첫 번째라면 true
      state.isUnlocked = true; // 개방 상태로 변경
      // 첫 개방 시 레벨 0으로 설정 (다음 클릭 시 레벨 1로 증가)
      state.level = 0; // 레벨을 바로 증가시키지 않고, 개방만 먼저 표시
    } else {
      // 이미 개방된 경우, 레벨 증가
      state.level++;
    }
  } else if (e.target.closest(".redistribute-btn")) {
    // 초기화 버튼 클릭
    delete pageState.statState[cardId]; // 상태에서 해당 스탯 제거
    renderStatCards(); // UI 재렌더링
    renderSummary(); // 합계 재렌더링
    return; // 재렌더링 후 함수 종료
  } else {
    return; // 다른 곳 클릭 시 무시
  }

  // 스탯 값 계산 (프론트엔드 로직에 따라)
  state.value = calculateStatValue(
    state.maxValue,
    state.level,
    state.isUnlocked,
    state.isFirst
  );

  pageState.statState[cardId] = state; // 변경된 상태 저장

  updateStatCardUI(card, state, maxValue); // 카드 UI 업데이트
  updateAllButtonStates(); // 다른 카드 버튼 상태도 업데이트 (첫 번째 개방 여부 영향)
  updateLevelButtonIndicators(); // 레벨 선택기 진행도 업데이트
  renderSummary(); // 합계 및 자원 현황 재렌더링
}

/**
 * 스탯의 현재 레벨에 따른 값을 계산합니다. (프론트엔드 로직 일치)
 */
function calculateStatValue(maxValue, level, isUnlocked, isFirst) {
  if (!isUnlocked) return 0; // 개방되지 않았으면 값은 0

  if (isFirst) {
    // 첫 번째 개방 스탯의 값은 (최대값 / 3) * 현재 레벨
    return Math.floor((maxValue / 3) * level);
  } else {
    // 첫 번째가 아닌 스탯의 값은 복잡한 공식 적용
    if (level === 0) return 0; // 초기값 (개방만 됨)
    else if (level === 1)
      return Math.floor(maxValue / 15) + Math.floor(maxValue / 3);
    else return Math.floor(maxValue / 15) + Math.floor(maxValue / 3) * level;
  }
}

/**
 * 사용자 보유 자원 입력 변경 이벤트를 처리하고 합계를 재렌더링합니다.
 */
function handleResourceChange() {
  pageState.userResources = {
    goldButton: parseInt(elements.goldButton.value, 10) || 0,
    colorBall: parseInt(elements.colorBall.value, 10) || 0,
  };
  renderSummary(); // 자원 변경 시 합계만 재렌더링
}

/**
 * 모든 고유 스탯 이름을 수집하여 검색 필터링에 사용합니다.
 */
function collectAllStatNames() {
  const stats = new Set();
  for (const part in pageState.chakData.equipment) {
    for (const level in pageState.chakData.equipment[part]) {
      for (const statName in pageState.chakData.equipment[part][level]) {
        // 숫자 부분 제거 (예: strength0 -> strength)
        stats.add(statName.replace(/\d+$/, ""));
      }
    }
  }
  pageState.allAvailableStats = Array.from(stats).sort(); // 중복 제거 및 정렬
}

/**
 * 스탯 검색 드롭다운 옵션을 채웁니다.
 */
function populateStatOptions() {
  elements.statOptions.innerHTML = "";
  pageState.allAvailableStats.forEach((stat) => {
    const option = createElement("div", "stat-option", { text: stat });
    option.addEventListener("click", (e) => {
      e.stopPropagation(); // 드롭다운 닫힘 방지
      toggleStatSelection(stat);
    });
    elements.statOptions.appendChild(option);
  });
}

/**
 * 스탯 검색 관련 이벤트 리스너를 설정합니다.
 */
function setupSearchEventListeners() {
  elements.searchInput.addEventListener("click", (e) => {
    e.stopPropagation(); // 클릭 시 드롭다운 닫힘 방지
    elements.statOptions.style.display = "block"; // 드롭다운 표시
    filterStatOptions(elements.searchInput.value); // 현재 입력값으로 필터링
  });
  elements.searchInput.addEventListener("input", () =>
    filterStatOptions(elements.searchInput.value)
  );
  elements.searchButton.addEventListener("click", searchStats); // 검색 버튼 클릭 이벤트
  // 문서 전체 클릭 시 드롭다운 숨기기
  document.addEventListener("click", () => {
    elements.statOptions.style.display = "none";
  });
}

/**
 * 스탯 검색 옵션을 필터링합니다.
 */
function filterStatOptions(filterText) {
  const options = elements.statOptions.querySelectorAll(".stat-option");
  filterText = filterText.toLowerCase();
  options.forEach((option) => {
    option.style.display = option.textContent.toLowerCase().includes(filterText)
      ? "flex"
      : "none";
  });
}

/**
 * 스탯 선택 칩을 추가/제거합니다.
 */
function toggleStatSelection(stat) {
  const index = pageState.selectedStats.indexOf(stat);
  if (index === -1) {
    pageState.selectedStats.push(stat); // 선택
  } else {
    pageState.selectedStats.splice(index, 1); // 해제
  }
  updateSelectedStatsDisplay(); // 선택된 스탯 칩 UI 업데이트
  elements.statOptions.style.display = "none"; // 드롭다운 숨기기
  elements.searchInput.value = ""; // 검색 입력창 초기화
  filterStatOptions(""); // 전체 옵션 다시 표시
}

/**
 * 선택된 스탯 칩 목록을 렌더링합니다.
 */
function updateSelectedStatsDisplay() {
  elements.selectedStats.innerHTML = "";
  pageState.selectedStats.forEach((stat) => {
    const chip = createElement("div", "stat-chip", {
      html: `${stat} <span class="remove-stat">×</span>`,
    });
    chip
      .querySelector(".remove-stat")
      .addEventListener("click", () => toggleStatSelection(stat)); // 칩 제거 이벤트
    elements.selectedStats.appendChild(chip);
  });
}

/**
 * 프리셋 (보스용, PvP용)에 따라 스탯 조합을 최적화하고 결과를 모달로 표시합니다.
 * @param {string} type - "boss" 또는 "pvp"
 */
function optimizeStats(type) {
  const BOSS_STATS = [
    "피해저항관통",
    "보스몬스터추가피해",
    "치명위력%",
    "파괴력증가",
    "파괴력증가%",
    "경험치획득증가",
    "전리품획득증가",
  ];
  const PVP_STATS = [
    "피해저항관통",
    "피해저항",
    "대인방어",
    "대인피해",
    "대인피해%",
    "대인방어%",
    "체력증가",
    "체력증가%",
    "마력증가",
    "마력증가%",
    "치명저항",
    "치명피해저항",
    "상태이상적중",
    "상태이상저항",
  ];

  const targetStats = type === "boss" ? BOSS_STATS : PVP_STATS;
  const title = type === "boss" ? "보스용 추천 조합" : "PvP용 추천 조합";

  // chakResultsModal 컴포넌트 사용
  showChakResultsModal(
    pageState.chakData,
    pageState.statState,
    title,
    targetStats,
    (partId, levelKey) => {
      // 모달에서 특정 스탯 위치를 클릭했을 때 호출되는 콜백
      pageState.selectedPart = partId;
      pageState.selectedLevel = levelKey;
      updateActiveSelectors();
      renderStatCards(); // 해당 부위/레벨의 스탯 카드 뷰로 이동
    }
  );
}

/**
 * 선택된 스탯(searchStats)에 해당하는 착 정보를 검색하고 결과를 모달로 표시합니다.
 */
function searchStats() {
  if (pageState.selectedStats.length === 0) {
    alert("검색할 능력치를 선택해주세요.");
    return;
  }
  // chakResultsModal 컴포넌트 사용
  showChakResultsModal(
    pageState.chakData,
    pageState.statState,
    "검색 결과",
    pageState.selectedStats,
    (partId, levelKey) => {
      // 모달에서 특정 스탯 위치를 클릭했을 때 호출되는 콜백
      pageState.selectedPart = partId;
      pageState.selectedLevel = levelKey;
      updateActiveSelectors();
      renderStatCards(); // 해당 부위/레벨의 스탯 카드 뷰로 이동
    }
  );
}
