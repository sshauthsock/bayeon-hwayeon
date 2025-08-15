import { state as globalState } from "../state.js";
import {
  createElement,
  checkSpiritStats,
  checkItemForStatEffect,
} from "../utils.js"; // checkSpiritStats, checkItemForStatEffect 임포트
import { showInfo as showSpiritInfoModal } from "../modalHandler.js";
import { renderSpiritGrid } from "../components/spritGrid.js";
import { createStatFilter } from "../components/statFilter.js"; // 새로 생성할 statFilter 컴포넌트 임포트
import { INFLUENCE_ROWS, STATS_MAPPING } from "../constants.js";

const pageState = {
  currentCategory: "수호", // 현재 선택된 환수 카테고리 (수호, 탑승, 변신)
  groupByInfluence: false, // 세력별로 그룹화할지 여부
  currentStatFilter: "", // 현재 적용된 스탯 필터 키
};
const elements = {}; // DOM 요소 참조를 저장할 객체

/**
 * 페이지의 기본 HTML 구조를 반환합니다.
 */
function getHTML() {
  return `
    <div class="sub-tabs" id="spiritInfoSubTabs">
        <div class="tab active" data-category="수호">수호</div>
        <div class="tab" data-category="탑승">탑승</div>
        <div class="tab" data-category="변신">변신</div>
    </div>
    <div class="view-toggle-container">
        <label class="toggle-switch">
            <input type="checkbox" id="influenceToggle">
            <span class="slider round"></span>
        </label>
        <span class="toggle-label">세력별 보기</span>
        <div class="stat-filter-container"></div> <!-- 스탯 필터가 렌더링될 곳 -->
    </div>
    <div id="spiritGridContainer"></div>`;
}

/**
 * 이미지 경로에서 숫자 부분을 추출하여 정렬에 사용합니다.
 * @param {string} imagePath - 환수 이미지 경로
 * @returns {number} 이미지 경로 내 숫자 (없으면 Infinity)
 */
function extractNumberFromImage(imagePath) {
  if (!imagePath) return Infinity;
  const match = imagePath.match(/\d+/); // 경로에서 숫자 매칭
  return match ? parseInt(match[0], 10) : Infinity; // 숫자가 있으면 파싱, 없으면 Infinity
}

/**
 * 페이지의 주요 콘텐츠 (환수 그리드)를 렌더링합니다.
 * 필터 및 그룹화 설정에 따라 다르게 표시됩니다.
 */
function render() {
  let spiritsToDisplay = getSpiritsForCurrentState(); // 현재 카테고리에 맞는 환수 가져오기

  if (pageState.currentStatFilter) {
    // 스탯 필터가 적용되어 있다면 필터링
    spiritsToDisplay = spiritsToDisplay.filter((spirit) =>
      checkItemForStatEffect(spirit, pageState.currentStatFilter)
    );
  }

  // spiritGrid 컴포넌트를 사용하여 환수 그리드 렌더링
  renderSpiritGrid({
    container: elements.spiritGridContainer,
    spirits: spiritsToDisplay,
    onSpiritClick: handleSpiritClick, // 환수 클릭 시 모달 표시
    getSpiritState: getSpiritVisualState, // 각 환수의 시각적 상태 반환 (강조 효과 등)
    groupByInfluence: pageState.groupByInfluence, // 세력별 그룹화 여부
  });
}

/**
 * 환수 클릭 시 해당 환수의 상세 정보를 모달로 표시합니다.
 * @param {object} spirit - 클릭된 환수 데이터
 */
function handleSpiritClick(spirit) {
  if (spirit) {
    showSpiritInfoModal(spirit, pageState.currentStatFilter); // 모달 표시 (현재 스탯 필터도 전달하여 강조 가능)
  }
}

/**
 * 각 환수의 시각적 상태(선택 여부, 등록/장착 완료 여부)를 반환합니다.
 * @param {object} spirit - 환수 데이터
 * @returns {object} 환수의 시각적 상태를 나타내는 객체
 */
function getSpiritVisualState(spirit) {
  // `utils.js`에서 가져온 `checkSpiritStats` 함수를 사용하여 등록/장착 완료 여부 확인
  const { hasFullRegistration, hasFullBind, hasLevel25Bind } =
    checkSpiritStats(spirit);
  return {
    selected: false, // 이 페이지에서는 선택 기능이 없으므로 항상 false
    registrationCompleted: hasFullRegistration, // 등록 효과 완료 여부
    bondCompleted: hasFullBind, // 장착 효과 완료 여부
    level25BindAvailable: hasLevel25Bind, // 25레벨 장착 효과 존재 여부 (오른쪽 상단 표시용)
  };
}

/**
 * 현재 페이지 상태(카테고리)에 따라 환수 목록을 필터링하고 정렬합니다.
 * @returns {Array<object>} 필터링 및 정렬된 환수 배열
 */
function getSpiritsForCurrentState() {
  const filteredSpirits = globalState.allSpirits.filter(
    (s) => s.type === pageState.currentCategory
  );
  const gradeOrder = { 전설: 1, 불멸: 2 }; // 등급 정렬 순서 정의
  filteredSpirits.sort((a, b) => {
    const orderA = gradeOrder[a.grade] || 99;
    const orderB = gradeOrder[b.grade] || 99;
    if (orderA !== orderB) return orderA - orderB; // 등급 우선 정렬
    return extractNumberFromImage(a.image) - extractNumberFromImage(b.image); // 같은 등급 내에서는 이미지 이름의 숫자 순으로 정렬
  });
  return filteredSpirits;
}

/**
 * 컨테이너 내의 클릭 이벤트를 처리합니다. (서브 탭 변경 등)
 */
function handleContainerClick(e) {
  const tab = e.target.closest(".sub-tabs .tab");
  if (tab && !tab.classList.contains("active")) {
    // 탭 변경 시
    elements.subTabs.querySelector(".tab.active").classList.remove("active");
    tab.classList.add("active");
    pageState.currentCategory = tab.dataset.category; // 현재 카테고리 업데이트
    render(); // UI 재렌더링
  }
}

/**
 * '세력별 보기' 토글 변경 이벤트를 처리합니다.
 */
function handleToggleChange(e) {
  pageState.groupByInfluence = e.target.checked; // 토글 상태 업데이트
  render(); // UI 재렌더링 (그리드 방식 변경)
}

/**
 * 스탯 필터 드롭다운을 초기화하고 이벤트 리스너를 설정합니다.
 */
function initStatFilter() {
  const filterContainer = elements.viewToggleContainer.querySelector(
    ".stat-filter-container"
  );
  // `createStatFilter` 컴포넌트를 사용하여 스탯 필터 UI 생성 및 관리
  createStatFilter(filterContainer, globalState.allSpirits, (newStatKey) => {
    pageState.currentStatFilter = newStatKey; // 필터 상태 업데이트
    render(); // 환수 목록 재렌더링 (필터 적용)
  });
}

/**
 * 페이지 초기화 함수.
 * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
 */
export function init(container) {
  container.innerHTML = getHTML(); // 페이지 HTML 삽입

  // DOM 요소 참조 저장
  elements.container = container;
  elements.subTabs = container.querySelector("#spiritInfoSubTabs");
  elements.influenceToggle = container.querySelector("#influenceToggle");
  elements.viewToggleContainer = container.querySelector(
    ".view-toggle-container"
  );
  elements.spiritGridContainer = container.querySelector(
    "#spiritGridContainer"
  );

  // 이벤트 리스너 설정
  elements.container.addEventListener("click", handleContainerClick);
  elements.influenceToggle.addEventListener("change", handleToggleChange);

  initStatFilter(); // 스탯 필터 초기화
  render(); // 초기 렌더링
  console.log("환수 정보 페이지 초기화 완료.");
}

/**
 * 페이지 정리 함수.
 * 페이지 전환 시 불필요한 이벤트 리스너 등을 제거하여 메모리 누수를 방지합니다.
 */
export function cleanup() {
  if (elements.container) {
    elements.container.removeEventListener("click", handleContainerClick);
  }
  if (elements.influenceToggle) {
    elements.influenceToggle.removeEventListener("change", handleToggleChange);
  }
  // statFilter 컴포넌트에 cleanup 함수가 있다면 호출
  // if (elements.statFilterComponent?.cleanup) { elements.statFilterComponent.cleanup(); }
  console.log("환수 정보 페이지 정리 완료.");
}
