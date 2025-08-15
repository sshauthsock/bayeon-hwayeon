// js/components/spiritGrid.js

import { createElement } from "../utils.js";
import { INFLUENCE_ROWS } from "../constants.js";
import { checkSpiritStats } from "../utils.js"; // checkSpiritStats 유틸리티 함수 임포트

/**
 * 환수 이미지 래퍼 (spirit-card 역할)를 생성합니다.
 * @param {object} spirit - 환수 데이터
 * @param {function} getSpiritState - 환수의 현재 상태(e.g., selected, completed)를 반환하는 함수.
 *                                   반환 값: { selected: boolean, registrationCompleted: boolean, bondCompleted: boolean, level25BindAvailable: boolean }
 * @returns {HTMLElement} 생성된 div.img-wrapper 요소
 */
function createImageWrapper(spirit, getSpiritState) {
  const state = getSpiritState(spirit); // 상태 객체 받기

  const wrapperClasses = ["img-wrapper"];
  if (state.selected) {
    wrapperClasses.push("selected"); // 선택된 상태 클래스 추가
  }

  const wrapper = createElement("div", wrapperClasses, {
    "data-spirit-name": spirit.name,
  });

  const imgBox = createElement("div", "img-box"); // 이미지 및 상태 표시를 위한 내부 컨테이너
  wrapper.appendChild(imgBox);

  // 선택되었을 때 체크 마크 표시
  if (state.selected) {
    const checkMark = createElement("div", "center-check-mark", { text: "✓" });
    imgBox.appendChild(checkMark);
  }

  // 등록/장착 완료 여부에 따른 클래스 추가 (테두리 효과용)
  if (state.registrationCompleted)
    imgBox.classList.add("registration-completed");
  if (state.bondCompleted) imgBox.classList.add("bond-completed");

  const img = createElement("img", "", {
    src: `${spirit.image}`, // 이미지 경로
    alt: spirit.name,
    loading: "lazy", // 이미지 지연 로딩
  });
  imgBox.appendChild(img);

  // 25레벨 장착 정보 존재 시 인디케이터 표시
  if (state.level25BindAvailable) {
    const level25Indicator = createElement("div", "level25-indicator");
    level25Indicator.innerHTML = `<span>Lv.25<br>완료</span>`;
    imgBox.appendChild(level25Indicator);
  }

  const nameLabel = createElement("small", "img-name", { text: spirit.name });
  wrapper.appendChild(nameLabel);

  return wrapper;
}

/**
 * 모든 환수를 하나의 그리드에 표시합니다.
 * @param {Array<object>} spirits - 표시할 환수 목록
 * @param {function} onSpiritClick - 환수 클릭 시 실행될 콜백 함수
 * @param {function} getSpiritState - 환수 상태 조회 함수
 * @returns {HTMLElement} 생성된 그리드 컨테이너
 */
function displayAllPets(spirits, onSpiritClick, getSpiritState) {
  const grid = createElement("div", "image-container-grid");
  spirits.forEach((spirit) => {
    const wrapper = createImageWrapper(spirit, getSpiritState);
    wrapper.addEventListener("click", () => onSpiritClick(spirit)); // 클릭 이벤트 리스너
    grid.appendChild(wrapper);
  });
  return grid;
}

/**
 * 세력별로 그룹화된 환수 목록을 표시합니다.
 * @param {Array<object>} spirits - 표시할 환수 목록
 * @param {function} onSpiritClick - 환수 클릭 시 실행될 콜백 함수
 * @param {function} getSpiritState - 환수 상태 조회 함수
 * @returns {HTMLElement} 생성된 그룹 컨테이너
 */
function displayPetsByInfluence(spirits, onSpiritClick, getSpiritState) {
  const container = createElement("div", "image-container-grouped");
  // 세력별로 환수 그룹화
  const grouped = spirits.reduce((acc, spirit) => {
    (acc[spirit.influence || "기타"] =
      acc[spirit.influence || "기타"] || []).push(spirit);
    return acc;
  }, {});

  // 각 세력 그룹을 생성하는 헬퍼 함수
  const createInfluenceGroup = (influence, items) => {
    const group = createElement("div", "influence-group");
    const headerWrapper = createElement("div", "header-wrapper");
    // 세력 아이콘 (FACTION_ICONS는 constants.js에서 임포트 가능)
    // 현재 FACTION_ICONS는 이 모듈에서 직접 임포트하지 않으므로, 주석 처리하거나 필요하면 임포트
    // const factionIcon = FACTION_ICONS[influence] ? createElement("img", "influence-icon", { src: FACTION_ICONS[influence], alt: influence }) : null;
    const header = createElement("h3", "influence-header", {
      text: `${influence} (${items.length})`,
    });
    // if (factionIcon) headerWrapper.appendChild(factionIcon);
    headerWrapper.appendChild(header);
    group.appendChild(headerWrapper);

    const itemsWrapper = createElement("div", "influence-items");
    items.forEach((item) => {
      const wrapper = createImageWrapper(item, getSpiritState);
      wrapper.addEventListener("click", () => onSpiritClick(item));
      itemsWrapper.appendChild(wrapper);
    });
    group.appendChild(itemsWrapper);
    return group;
  };

  // INFLUENCE_ROWS (constants.js에 정의된 세력 정렬 순서)에 따라 그룹 렌더링
  const processed = new Set();
  INFLUENCE_ROWS.forEach((rowInfluences) => {
    const rowEl = createElement("div", "influence-row");
    let hasContent = false;
    rowInfluences.forEach((inf) => {
      if (grouped[inf]) {
        rowEl.appendChild(createInfluenceGroup(inf, grouped[inf]));
        processed.add(inf);
        hasContent = true;
      }
    });
    if (hasContent) container.appendChild(rowEl);
  });

  // `INFLUENCE_ROWS`에 포함되지 않은 기타 세력 그룹 렌더링
  const others = Object.keys(grouped)
    .filter((inf) => !processed.has(inf))
    .sort(); // 알파벳 순으로 정렬
  if (others.length > 0) {
    const otherRow = createElement("div", "influence-row");
    others.forEach((inf) =>
      otherRow.appendChild(createInfluenceGroup(inf, grouped[inf]))
    );
    container.appendChild(otherRow);
  }
  return container;
}

/**
 * 환수 목록 그리드를 렌더링하는 메인 함수
 * @param {object} options
 * @param {HTMLElement} options.container - 그리드가 렌더링될 부모 요소
 * @param {Array<object>} options.spirits - 표시할 환수 데이터 배열
 * @param {function} options.onSpiritClick - 각 환수 아이템 클릭 시 호출될 함수
 * @param {function} options.getSpiritState - 각 환수의 상태(선택 여부, 완료 여부 등)를 반환하는 함수
 * @param {boolean} options.groupByInfluence - 세력별로 그룹화할지 여부
 */
export function renderSpiritGrid({
  container,
  spirits,
  onSpiritClick,
  getSpiritState,
  groupByInfluence,
}) {
  container.innerHTML = ""; // 이전 내용 초기화

  if (spirits.length === 0) {
    container.innerHTML = `<p class="empty-state-message">조건에 맞는 환수가 없습니다.</p>`;
    return;
  }

  let gridElement;
  if (groupByInfluence) {
    // 세력별로 그룹화하여 표시
    gridElement = displayPetsByInfluence(
      spirits,
      onSpiritClick,
      getSpiritState
    );
  } else {
    // 모든 환수를 하나의 그리드에 표시
    gridElement = displayAllPets(spirits, onSpiritClick, getSpiritState);
  }
  container.appendChild(gridElement);
}
