// js/components/chakResultsModal.js

import { createElement } from "../utils.js";
import { STATS_MAPPING, PERCENT_STATS } from "../constants.js"; // STATS_MAPPING, PERCENT_STATS 임포트

let activeModal = null; // 현재 활성화된 모달을 추적하여 중복 방지

// 숫자를 안전하게 파싱하고 콤마를 제거하며, NaN 처리
function ensureNumber(value) {
  if (value === undefined || value === null) return 0;
  const num = parseFloat(String(value).replace(/,/g, ""));
  return isNaN(num) ? 0 : num;
}

/**
 * 백엔드에서 받은 스탯 이름 (e.g., strength0)을 표시용 이름으로 변환합니다.
 */
function getDisplayName(statName) {
  return statName.replace(/\d+$/, "");
}

/**
 * 모달을 생성하고 화면에 표시하는 메인 함수.
 * 이 모달은 착 능력치 검색 또는 프리셋 결과(어떤 능력치가 어떤 착 부위/레벨에 있는지)를 보여줍니다.
 * @param {object} chakData - 서버에서 불러온 전체 착 데이터
 * @param {object} currentStatState - 현재 사용자의 착 스탯 상태 (개방 여부, 레벨 등)
 * @param {string} title - 모달 제목
 * @param {Array<string>} statsToFind - 검색하거나 우선순위를 둘 스탯 이름 목록 (표시용 이름)
 * @param {function} onSelectLocation - 사용자가 특정 스탯 위치를 클릭했을 때 호출될 콜백 함수 (partId, levelKey를 인자로 받음)
 */
export function showChakResultsModal(
  chakData,
  currentStatState,
  title,
  statsToFind,
  onSelectLocation
) {
  removeAllModals(); // 기존 모달 닫기
  const modal = createElement("div", "modal-overlay", {
    id: "chakResultsModal",
  });
  const content = createElement("div", "modal-content");
  modal.appendChild(content);
  document.body.appendChild(modal);

  // 닫기 버튼
  const closeButton = createElement("button", "modal-close", { text: "✕" });
  closeButton.addEventListener("click", removeAllModals);
  content.appendChild(closeButton);

  // 모달 헤더
  const modalHeader = createElement("div", "modal-header");
  const modalTitle = createElement("h3", "", { text: title });
  modalHeader.appendChild(modalTitle);
  content.appendChild(modalHeader);

  const mainContainer = createElement("div", "optimize-container"); // 최적화/검색 결과를 담을 컨테이너
  content.appendChild(mainContainer);

  // 좌측 설명/요약 패널
  const descriptionPanel = createElement("div", "optimize-description");
  mainContainer.appendChild(descriptionPanel);

  // 우측 결과 표시 컨테이너
  const resultsContainer = createElement("div", "optimize-results-container");
  mainContainer.appendChild(resultsContainer);

  // 초기 렌더링
  renderResultsPanel(
    chakData,
    currentStatState,
    resultsContainer,
    statsToFind,
    onSelectLocation
  );
  renderDescriptionPanel(
    chakData,
    currentStatState,
    descriptionPanel,
    statsToFind
  );

  modal.style.display = "flex"; // 모달 표시
  document.body.style.overflow = "hidden"; // 배경 스크롤 방지

  // ESC 키로 모달 닫기
  const escListener = (e) => {
    if (e.key === "Escape") removeAllModals();
  };
  document.addEventListener("keydown", escListener);
  modal._escListener = escListener;
  activeModal = modal;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) removeAllModals();
  });
}

/**
 * 모달의 우측 결과 패널을 렌더링합니다. (스탯 위치 목록)
 */
function renderResultsPanel(
  chakData,
  currentStatState,
  container,
  statsToFind,
  onSelectLocation
) {
  container.innerHTML = ""; // 기존 내용 초기화

  // 스탯 이름별로 착 아이템 그룹화
  const groupedResults = groupChakStatsByDisplayName(chakData, statsToFind);

  if (Object.keys(groupedResults).length === 0) {
    container.innerHTML = `<p class="no-matches">선택된 능력치를 찾을 수 없습니다.</p>`;
    return;
  }

  // 각 스탯 그룹 (피해저항관통, 치명위력% 등)을 렌더링
  Object.entries(groupedResults).forEach(([statDisplayName, locations]) => {
    const compactGroup = createElement("div", "compact-group");
    const header = createElement("div", "compact-stat-title", {
      html: `
        <span class="stat-name-section">${statDisplayName}
            <span class="stat-count">(${locations.length}곳)</span>
        </span>
        <span class="toggle-icon">+</span>
      `,
    });
    const content = createElement("div", "stat-group-content");
    content.style.maxHeight = "1000px"; // 기본적으로 열린 상태로 시작

    header.addEventListener("click", () => {
      // 그룹 확장/축소 토글
      if (content.style.maxHeight === "0px") {
        content.style.maxHeight = content.scrollHeight + "px"; // 콘텐츠 높이만큼 확장
        header.querySelector(".toggle-icon").textContent = "-";
      } else {
        content.style.maxHeight = "0px"; // 축소
        header.querySelector(".toggle-icon").textContent = "+";
      }
    });

    // 부위별로 그룹 내 아이템 정렬 (가독성 향상)
    const partsOrder = chakData.constants.parts;
    const groupedByPart = locations.reduce((acc, loc) => {
      const partName = loc.part.split("_")[0];
      (acc[partName] = acc[partName] || []).push(loc);
      return acc;
    }, {});

    partsOrder.forEach((partName) => {
      const partLocations = groupedByPart[partName];
      if (!partLocations || partLocations.length === 0) return;

      const partSection = createElement("div", "part-section");
      const partHeader = createElement("div", "part-header", {
        html: `<span>${partName}</span> <span class="stat-info">(${partLocations.length}곳)</span>`,
      });
      partSection.appendChild(partHeader);

      const compactLocations = createElement("div", "compact-locations");
      partLocations.forEach((item) => {
        const cardId = `${item.statName}_${item.part}_${item.level}_${item.index}`; // 백엔드 로직에 따라 cardId 구성
        const statState = currentStatState[cardId] || {
          isUnlocked: false,
          level: 0,
        };

        const locationCard = createElement("div", "compact-location", {
          "data-part-id": item.part,
          "data-level": item.level,
        });

        let statusClass = "location-unused";
        if (statState.isUnlocked) {
          statusClass =
            statState.level === 3 ? "location-complete" : "location-partial";
        }
        locationCard.classList.add(statusClass);

        locationCard.innerHTML = `
          <div class="loc-header">
            <span class="loc-part" title="${item.part.replace(
              /_\d+$/,
              ""
            )}">${item.part.replace(/_\d+$/, "")}</span>
            <span class="loc-level">${item.level}</span>
          </div>
          <div class="loc-details">
            <span class="loc-max-value">+${item.maxValue}</span>
          </div>
        `;
        locationCard.addEventListener("click", () =>
          onSelectLocation(item.part, item.level)
        ); // 클릭 시 콜백 실행
        compactLocations.appendChild(locationCard);
      });
      partSection.appendChild(compactLocations);
      content.appendChild(partSection);
    });

    compactGroup.append(header, content);
    container.appendChild(compactGroup);
  });
}

/**
 * 모달의 좌측 설명 패널을 렌더링합니다. (총 합계, 자원 요약)
 */
function renderDescriptionPanel(
  chakData,
  currentStatState,
  container,
  statsToFind
) {
  container.innerHTML = ""; // 기존 내용 초기화

  const summary = calculateCurrentSummary(currentStatState, chakData);

  // 프리셋/검색에 사용된 스탯 목록 표시
  const priorityStatsHtml = statsToFind
    .map((stat) => `<span class="priority-stat">${stat}</span>`)
    .join("");

  container.innerHTML = `
    <div class="preset-summary">
        <div class="preset-header">
            <h4>적용된 능력치 요약</h4>
        </div>
        <div class="preset-stats">${
          priorityStatsHtml || "<p>선택된 능력치가 없습니다.</p>"
        }</div>
        <div class="preset-resources">
            <div class="resource-req-title">필요 자원 (현재 적용 상태)</div>
            <div class="resource-req-items">
                <div class="resource-req-item">
                    <img src="/assets/img/gold-button.jpg" class="resource-icon-img-small">
                    <span>${summary.goldConsumed.toLocaleString()}</span>
                </div>
                <div class="resource-req-item">
                    <img src="/assets/img/fivecolored-beads.jpg" class="resource-icon-img-small">
                    <span>${summary.ballConsumed.toLocaleString()}</span>
                </div>
            </div>
        </div>
    </div>
  `;
}

/**
 * 현재 chakStatState를 기반으로 총 소모된 자원을 계산합니다.
 */
function calculateCurrentSummary(currentStatState, chakData) {
  let goldConsumed = 0;
  let ballConsumed = 0;

  for (const cardId in currentStatState) {
    const state = currentStatState[cardId];
    if (!state.isUnlocked) continue;

    if (state.isFirst) {
      ballConsumed += state.level * chakData.costs["upgradeFirst"];
    } else {
      goldConsumed += chakData.costs["unlockOther"];
      if (state.level >= 1) {
        ballConsumed += chakData.costs["upgradeOther0"];
      }
      if (state.level >= 2) {
        ballConsumed += chakData.costs["upgradeOther1"];
      }
      if (state.level >= 3) {
        ballConsumed += chakData.costs["upgradeOther2"];
      }
    }
  }
  return { goldConsumed, ballConsumed };
}

/**
 * 착 데이터에서 스탯 표시용 이름을 기준으로 그룹화하고 정렬합니다.
 */
function groupChakStatsByDisplayName(chakData, statsToFind) {
  const results = {}; // { "피해저항관통": [{part, level, statName, maxValue, index}, ...], ... }

  chakData.constants.parts.forEach((partId, partIndex) => {
    const dataKeyPart = partId.split("_")[0];
    chakData.constants.levels.forEach((level) => {
      const levelKey = `lv${level.replace("+", "")}`;
      const statsOnItem = chakData.equipment[dataKeyPart]?.[levelKey] || {};

      let statIndex = 0; // 이너 루프에서 고유 index 생성
      Object.entries(statsOnItem).forEach(([statName, maxValue]) => {
        const displayName = getDisplayName(statName); // "strength0" -> "strength"
        // 찾으려는 스탯 목록에 포함되어 있는지 확인
        if (statsToFind.includes(displayName)) {
          if (!results[displayName]) results[displayName] = [];
          results[displayName].push({
            part: partId,
            level: level,
            statName: statName, // 원래 statName 유지
            maxValue: maxValue,
            index: statIndex, // 각 파트-레벨 내 스탯의 순서
            cardId: `${statName}_${partId}_${level}_${statIndex}`, // 완전 고유 ID
          });
        }
        statIndex++;
      });
    });
  });

  // 결과 정렬 (표시용 이름 -> 부위 이름 -> 레벨)
  const sortedResults = {};
  Object.keys(results)
    .sort()
    .forEach((displayName) => {
      sortedResults[displayName] = results[displayName].sort((a, b) => {
        const partA = a.part.split("_")[0];
        const partB = b.part.split("_")[0];
        if (partA !== partB) return partA.localeCompare(partB);
        // "lv1" -> 1, "+1" -> 1
        const levelNumA = parseInt(a.level.replace(/\D/g, ""), 10);
        const levelNumB = parseInt(b.level.replace(/\D/g, ""), 10);
        return levelNumA - levelNumB;
      });
    });
  return sortedResults;
}

/**
 * 현재 활성화된 모달을 닫고 DOM에서 제거합니다.
 */
export function removeAllModals() {
  if (activeModal) {
    document.removeEventListener("keydown", activeModal._escListener);
    activeModal.remove();
    activeModal = null;
  }
  document.body.style.overflow = "auto"; // 배경 스크롤 복원
}
