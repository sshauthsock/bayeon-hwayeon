// js/modalHandler.js

import { createElement } from "./utils.js";
import { state as globalState } from "./state.js";
import { FACTION_ICONS, STATS_MAPPING, PERCENT_STATS } from "./constants.js";

let activeModal = null; // 현재 활성화된 모달 요소를 추적하여 중복 방지 및 제거 용이

// --- 헬퍼 함수 ---
// 숫자로 변환하며, 콤마 제거 및 NaN 처리
function ensureNumber(value) {
  if (value === undefined || value === null) return 0;
  // 문자열인 경우 콤마를 제거하고 숫자로 변환
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

// =================================================================
// ===                  모달 생성 및 구조화                       ===
// =================================================================

/**
 * 기존에 활성화된 모든 모달을 제거하고 새로운 모달의 기본 구조를 생성합니다.
 */
function createBaseModal() {
  removeAllModals(); // 현재 열려있는 모달이 있다면 닫기
  const modal = createElement("div", "spirit-modal-overlay", {
    id: "spirit-info-modal", // 환수 정보 모달의 고유 ID
  });
  const content = createElement("div", "spirit-modal-content");
  modal.appendChild(content);
  document.body.appendChild(modal);

  // 모달 외부 클릭 시 닫기
  modal.addEventListener("click", (e) => {
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
 * 환수 정보 모달을 생성하고 화면에 표시하는 메인 함수
 * @param {object} spiritData - 표시할 환수의 전체 데이터 객체
 * @param {string} [highlightStat=null] - 특정 스탯을 하이라이트할 경우 그 키
 * @param {boolean} [isRankingMode=false] - 랭킹 모드 여부 (레벨을 25로 고정)
 */
export function showInfo(
  spiritData,
  highlightStat = null,
  isRankingMode = false
) {
  if (!spiritData) {
    console.error("모달을 표시할 환수 데이터가 없습니다.");
    return;
  }

  // 모달 생성 및 기본 설정
  const { modal, content } = createBaseModal();
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지

  // 초기 레벨 설정 (랭킹 모드면 25, 아니면 0)
  const initialLevel = isRankingMode ? 25 : 0;
  // 모달 내용 렌더링 (이 함수 내부에서 광고 단위 생성 및 재요청)
  renderSpiritInfo(
    content,
    spiritData,
    initialLevel,
    highlightStat,
    isRankingMode
  );

  modal.style.display = "flex"; // 모달 표시

  // showInfo 호출 시점에만 실행되는 최초 광고 로드 로직 (renderSpiritInfo 내부 로직과 중복될 수 있으나, 안전을 위해 유지)
  // renderSpiritInfo 내부에서 setTimeout을 사용하므로, 이 부분은 제거해도 무방합니다.
  /*
  setTimeout(() => {
    try {
      if (window.adfit && typeof window.adfit.render === 'function') {
        const adContainers = document.querySelectorAll('#spirit-info-modal .kakao_ad_area');
        adContainers.forEach(adElement => {
          window.adfit.render(adElement);
        });
        console.log("Kakao AdFit: Ads re-rendered in Spirit Info modal (initial load).");
      } else {
        console.warn("Kakao AdFit script (window.adfit) not yet loaded or not available (initial load).");
      }
    } catch (error) {
      console.error("Kakao AdFit: Error rendering ads (initial load):", error);
    }
  }, 100);
  */
}

/**
 * 모달의 콘텐츠를 렌더링하는 함수 (재귀 호출을 통해 레벨 변경 시 UI 업데이트)
 * 이 함수는 모달의 내용을 완전히 새로 그립니다.
 * @param {HTMLElement} container - 모달 콘텐츠가 렌더링될 부모 요소
 * @param {object} spiritData - 환수 데이터
 * @param {number} level - 현재 표시할 환수 레벨
 * @param {string} highlightStat - 하이라이트할 스탯 키
 * @param {boolean} isRankingMode - 랭킹 모드 여부
 */
function renderSpiritInfo(
  container,
  spiritData,
  level,
  highlightStat,
  isRankingMode
) {
  container.innerHTML = ""; // 기존 내용 초기화 (광고 포함 모든 자식 요소 파괴)

  // 닫기 버튼 생성 및 이벤트 리스너 부착
  const closeBtn = createElement("button", "modal-close-btn", { text: "✕" });
  closeBtn.addEventListener("click", removeAllModals);
  container.appendChild(closeBtn);

  // --- 카카오 광고 단위 추가 시작 (Spirit Info Modal) ---
  // 레벨 변경 시에도 광고를 다시 그리기 위해 매번 새로 생성
  const kakaoAdSpiritInfoModal = createElement("ins", "kakao_ad_area", {
    style: "display:none; margin: 10px auto;", // CSS로 중앙 정렬 및 여백
    "data-ad-unit": "DAN-NsxEDVcaO6e1i2Gs", // TODO: 당신의 광고 단위 ID로 교체!
    "data-ad-width": "728",
    "data-ad-height": "90",
  });
  container.appendChild(kakaoAdSpiritInfoModal); // 모달의 가장 위에 광고 추가
  // --- 카카오 광고 단위 추가 종료 ---

  // 헤더 (환수 이미지, 이름, 레벨 컨트롤)
  const header = createElement("div", "spirit-modal-header");
  const img = createElement("img", "spirit-modal-image", {
    src: `${spiritData.image}`, // 이미지 경로 (선행 슬래시 없음)
    alt: spiritData.name,
  });
  header.appendChild(img);

  const titleSection = createElement("div", "spirit-modal-title-section");
  const title = createElement("h3", "", { text: spiritData.name });
  titleSection.appendChild(title);

  // 세력 아이콘 추가
  if (spiritData.influence && FACTION_ICONS[spiritData.influence]) {
    const factionIcon = createElement("img", "influence-icon", {
      src: FACTION_ICONS[spiritData.influence], // 이미지 경로 (선행 슬래시 없음)
      alt: spiritData.influence,
      title: spiritData.influence,
    });
    title.appendChild(factionIcon);
  }

  // 레벨 컨트롤 (랭킹 모드에 따라 다르게 렌더링)
  const levelControl = isRankingMode
    ? createFixedLevelControl()
    : createEditableLevelControl(container, spiritData, level, highlightStat);

  titleSection.appendChild(levelControl);
  header.appendChild(titleSection);
  container.appendChild(header);

  // 스탯 컨테이너 (등록 효과, 장착 효과)
  const statsContainer = createElement("div", "stats-container");
  const registrationCol = createStatsColumn(
    "등록 효과",
    "registrationList",
    "registration-sum"
  );
  const bindCol = createStatsColumn("장착 효과", "bindList", "bind-sum");
  statsContainer.appendChild(registrationCol);
  statsContainer.appendChild(bindCol);
  container.appendChild(statsContainer);

  // 현재 레벨에 맞는 스탯 정보 표시
  displayStats(spiritData, level, highlightStat);

  // --- 레벨 변경 후 광고 재요청 로직 시작 ---
  // 모달 내용이 완전히 그려진 후 짧은 딜레이를 주어 광고를 재요청
  setTimeout(() => {
    try {
      if (window.adfit && typeof window.adfit.render === "function") {
        // 새로 생성된 광고 단위를 직접 전달하여 렌더링 요청
        window.adfit.render(kakaoAdSpiritInfoModal);
        console.log(
          "Kakao AdFit: Ad re-rendered after level change in Spirit Info modal."
        );
      } else {
        console.warn(
          "Kakao AdFit script not yet loaded or available for re-rendering."
        );
      }
    } catch (error) {
      console.error(
        "Kakao AdFit: Error re-rendering ad after level change:",
        error
      );
    }
  }, 100); // 100ms 딜레이
  // --- 레벨 변경 후 광고 재요청 로직 종료 ---
}

/**
 * 랭킹 모드일 때 사용되는 고정된 25레벨 표시 UI를 생성합니다.
 */
function createFixedLevelControl() {
  const levelControl = createElement("div", "level-control");
  const levelDisplay = createElement("div", "fixed-level-display");
  levelDisplay.innerHTML = `<strong>레벨: 25</strong> (랭킹 기준)`;
  levelControl.appendChild(levelDisplay);
  return levelControl;
}

/**
 * 레벨을 변경할 수 있는 UI (+, -, input)를 생성합니다.
 * @param {HTMLElement} container - 부모 컨테이너 (재렌더링을 위해 필요)
 * @param {object} spiritData - 환수 데이터
 * @param {number} currentLevel - 현재 레벨
 * @param {string} highlightStat - 하이라이트할 스탯 키
 */
function createEditableLevelControl(
  container,
  spiritData,
  currentLevel,
  highlightStat
) {
  const levelControl = createElement("div", "level-control");
  const levelInputContainer = createElement("div", "level-input-container");

  const minBtn = createElement("button", ["level-btn", "min-btn"], {
    text: "min",
  });
  const minusBtn = createElement("button", ["level-btn", "minus-btn"], {
    text: "-",
  });
  const levelInput = createElement("input", "level-input", {
    type: "number",
    min: "0",
    max: "25",
    value: String(currentLevel),
  });
  const plusBtn = createElement("button", ["level-btn", "plus-btn"], {
    text: "+",
  });
  const maxBtn = createElement("button", ["level-btn", "max-btn"], {
    text: "max",
  });

  levelInputContainer.append(minBtn, minusBtn, levelInput, plusBtn, maxBtn);
  levelControl.appendChild(levelInputContainer);

  const updateLevel = (newLevel) => {
    // 유효성 검사 및 값 범위 제한
    let validatedLevel = parseInt(newLevel, 10);
    if (isNaN(validatedLevel) || validatedLevel < 0) validatedLevel = 0;
    if (validatedLevel > 25) validatedLevel = 25;

    // 현재 레벨과 다를 경우에만 UI 업데이트
    if (validatedLevel !== currentLevel) {
      // 재귀 호출로 모달 전체를 새로 렌더링하여 스탯 정보 업데이트
      renderSpiritInfo(
        container,
        spiritData,
        validatedLevel,
        highlightStat,
        false
      );
    }
  };

  // 이벤트 리스너 부착
  minBtn.addEventListener("click", () => updateLevel(0));
  minusBtn.addEventListener("click", () => updateLevel(currentLevel - 1));
  plusBtn.addEventListener("click", () => updateLevel(currentLevel + 1));
  maxBtn.addEventListener("click", () => updateLevel(25));
  levelInput.addEventListener("change", (e) => updateLevel(e.target.value));

  return levelControl;
}

/**
 * 스탯 목록을 표시할 컬럼 (제목, 합계, 목록)을 생성합니다.
 */
function createStatsColumn(title, listId, sumId) {
  const column = createElement("div", "stats-column");
  column.innerHTML = `
        <div class="stats-header">
            ${title}
            <span id="${sumId}" class="stats-sum">합산: 0</span>
        </div>
        <ul id="${listId}" class="stats-list"></ul>
    `;
  return column;
}

/**
 * 특정 환수의 특정 레벨에 해당하는 스탯 정보를 화면에 표시합니다.
 * @param {object} spiritData - 환수 데이터
 * @param {number} level - 표시할 레벨
 * @param {string} highlightStat - 하이라이트할 스탯 키
 */
function displayStats(spiritData, level, highlightStat) {
  const registrationList = document.getElementById("registrationList");
  const bindList = document.getElementById("bindList");

  if (!registrationList || !bindList) {
    console.error("Stat lists not found in DOM.");
    return;
  }

  // 해당 레벨의 스탯 정보를 찾음
  const levelStat = spiritData.stats.find((s) => s.level === level);

  // 스탯 데이터가 없으면 빈 객체 사용
  const regStats = levelStat?.registrationStat || {};
  const bindStats = levelStat?.bindStat || {};

  // 각 목록에 스탯 상세 정보 렌더링
  displayStatDetails(registrationList, regStats, highlightStat);
  displayStatDetails(bindList, bindStats, highlightStat);

  // 합계 업데이트 (피해저항 + 피해저항관통)
  document.getElementById(
    "registration-sum"
  ).textContent = `합산: ${calculateStatsSum(regStats)}`;
  document.getElementById("bind-sum").textContent = `합산: ${calculateStatsSum(
    bindStats
  )}`;
}

/**
 * 스탯 객체를 받아 HTML 목록으로 렌더링합니다.
 * @param {HTMLElement} listElement - 스탯을 렌더링할 `<ul>` 요소
 * @param {object} stats - 스탯 키-값 쌍을 포함하는 객체
 * @param {string} highlightStat - 하이라이트할 스탯 키
 */
function displayStatDetails(listElement, stats, highlightStat) {
  listElement.innerHTML = ""; // 기존 목록 비우기
  const statEntries = Object.entries(stats);

  if (statEntries.length === 0) {
    listElement.innerHTML = "<li>효과 없음</li>";
    return;
  }

  // 스탯을 한글 이름으로 정렬
  statEntries
    .sort((a, b) => {
      const nameA = STATS_MAPPING[a[0]] || a[0];
      const nameB = STATS_MAPPING[b[0]] || b[0];
      return nameA.localeCompare(nameB);
    })
    .forEach(([key, value]) => {
      const displayKey = STATS_MAPPING[key] || key;
      const isPercent = PERCENT_STATS.includes(key); // constants.js에서 가져온 PERCENT_STATS 사용
      // ensureNumber를 사용하여 값의 일관성을 확보
      const displayValue = isPercent
        ? `${ensureNumber(value)}%`
        : ensureNumber(value);

      const li = createElement("li");
      if (highlightStat && key === highlightStat) {
        li.className = "stat-highlight"; // 하이라이트 스타일 적용
      }
      li.innerHTML = `
        <span class="stat-key">${displayKey}</span>
        <span class="stat-value">${displayValue}</span>
      `;
      listElement.appendChild(li);
    });
}

/**
 * 주어진 스탯 객체에서 피해저항과 피해저항관통의 합계를 계산합니다.
 * @param {object} stats - 스탯 객체
 * @returns {number} 합계 (정수로 반올림)
 */
function calculateStatsSum(stats) {
  if (!stats) return 0;
  // ensureNumber를 사용하여 문자열 숫자도 처리
  const resistance = ensureNumber(stats.damageResistance);
  const penetration = ensureNumber(stats.damageResistancePenetration);
  return Math.round(resistance + penetration); // 합계를 반올림하여 반환
}

/**
 * 현재 활성화된 모든 모달을 DOM에서 제거하고 배경 스크롤을 복원합니다.
 */
export function removeAllModals() {
  if (activeModal) {
    // ESC 키 리스너 제거
    document.removeEventListener("keydown", activeModal._escListener);
    activeModal.remove(); // 모달 DOM 요소 제거
    activeModal = null; // 참조 초기화
  }
  document.body.style.overflow = "auto"; // 배경 스크롤 복원
}
