// import { state as globalState } from "../state.js";
// import * as api from "../api.js";
// import { createElement } from "../utils.js";
// import { showResultModal as showOptimalResultModal } from "../resultModal.js";
// import { addResult as addHistory } from "../historyManager.js";
// import { renderSpiritGrid } from "../components/spritGrid.js";
// import { showLoading, hideLoading } from "../loadingIndicator.js";
// import { checkSpiritStats, checkItemForStatEffect } from "../utils.js";
// import { createStatFilter } from "../components/statFilter.js";
// import { INFLUENCE_ROWS, GRADE_ORDER, STATS_MAPPING } from "../constants.js";

// const pageState = {
//   currentCategory: "수호", // 현재 선택된 환수 카테고리 (수호, 탑승, 변신)
//   selectedSpirits: new Map(), // 선택된 환수 Map<name, {spiritData, level}>
//   groupByInfluence: false, // 세력별로 그룹화할지 여부
//   currentStatFilter: "", // 현재 적용된 스탯 필터 키
// };
// const elements = {}; // DOM 요소를 저장할 객체

// /**
//  * 페이지의 기본 HTML 구조를 반환합니다.
//  */
// function getHTML() {
//   return `
//     <div class="sub-tabs" id="bondCategoryTabs">
//         <div class="tab active" data-category="수호">수호</div>
//         <div class="tab" data-category="탑승">탑승</div>
//         <div class="tab" data-category="변신">변신</div>
//     </div>
//     <div class="view-toggle-container">
//         <label class="toggle-switch">
//             <input type="checkbox" id="influenceToggle">
//             <span class="slider round"></span>
//         </label>
//         <span class="toggle-label">세력별 보기</span>
//         <div class="stat-filter-container"></div> <!-- 스탯 필터가 렌더링될 곳 -->
//     </div>
//     <div class="bond-container">
//         <div class="main-content">
//             <div class="left-panel">
//                 <h2>전체 환수 목록</h2>
//                 <div class="selection-controls">
//                     <button id="selectAllBtn" class="btn btn-primary select-all-btn">현재 탭 전체 선택</button>
//                     <button id="clearAllSelectionBtn" class="btn btn-danger clear-selection-btn">현재 탭 전체 해제</button>
//                 </div>
//                 <div id="spiritListContainer" class="spirit-selection"></div>
//             </div>
//             <div class="right-panel">
//                 <div class="selected-spirits-container">
//                     <div class="selected-spirits-header">
//                         <h3>선택된 환수 (<span id="selectedCount">0</span>)</h3>
//                         <!-- Note: "현재 탭 전체 해제" 버튼은 이제 좌측 패널로 이동했거나,
//                              여기에 남겨두면 선택된 것만 해제하는 용도로 사용될 수 있습니다.
//                              여기서는 좌측 패널에 추가된 '현재 탭 전체 해제' 버튼과 동일한 기능을 하도록 합니다. -->
//                     </div>
//                     <div id="selectedSpiritsList" class="selected-spirits"></div>
//                     <div class="header-controls">
//                         <div class="level-batch-control">
//                             <label>일괄 레벨:</label>
//                             <input type="number" id="batchLevelInput" min="0" max="25" value="0">
//                             <button id="applyBatchLevelBtn" class="btn btn-primary">적용</button>
//                         </div>
//                         <div class="calculate-btn-small">
//                             <button id="findOptimalBtn" class="btn btn-secondary">최적 조합 찾기</button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     </div>`;
// }

// /**
//  * 모든 UI 구성 요소를 렌더링합니다.
//  */
// function renderAll() {
//   renderSpiritList(); // 전체 환수 목록 렌더링
//   renderSelectedList(); // 선택된 환수 목록 렌더링
//   saveStateToStorage(); // 현재 상태를 로컬 스토리지에 저장
// }

// /**
//  * 전체 환수 목록을 렌더링합니다. 필터 및 정렬이 적용됩니다.
//  */
// function renderSpiritList() {
//   let spirits = getSpiritsForCurrentState(); // 현재 카테고리에 맞는 환수 가져오기
//   if (pageState.currentStatFilter) {
//     // 스탯 필터가 적용되어 있다면 필터링
//     spirits = spirits.filter((spirit) =>
//       checkItemForStatEffect(spirit, pageState.currentStatFilter)
//     );
//   }

//   // spiritGrid 컴포넌트 사용하여 목록 렌더링
//   renderSpiritGrid({
//     container: elements.spiritListContainer,
//     spirits: spirits,
//     onSpiritClick: handleSpiritSelect,
//     getSpiritState: (spirit) => {
//       // 각 환수의 상태를 반환 (선택 여부, 완료 여부 등)
//       const { hasFullRegistration, hasFullBind, hasLevel25Bind } =
//         checkSpiritStats(spirit);
//       return {
//         selected: pageState.selectedSpirits.has(spirit.name),
//         registrationCompleted: hasFullRegistration,
//         bondCompleted: hasFullBind,
//         level25BindAvailable: hasLevel25Bind,
//       };
//     },
//     groupByInfluence: pageState.groupByInfluence,
//   });
// }

// /**
//  * 현재 페이지 상태(카테고리)에 따라 환수 목록을 필터링하고 정렬합니다.
//  * @returns {Array<object>} 필터링 및 정렬된 환수 배열
//  */
// function getSpiritsForCurrentState() {
//   const extractNumber = (path) =>
//     path ? parseInt(path.match(/\d+/)?.[0] || "999", 10) : 999;
//   const filtered = globalState.allSpirits.filter(
//     (s) => s.type === pageState.currentCategory
//   );
//   // 등급 (불멸 -> 전설) 및 이미지 경로의 숫자 순으로 정렬
//   filtered.sort((a, b) => {
//     const gradeOrder = { 전설: 1, 불멸: 2 };
//     const orderA = gradeOrder[a.grade] || 99;
//     const orderB = gradeOrder[b.grade] || 99;
//     if (orderA !== orderB) return orderA - orderB;
//     return extractNumber(a.image) - extractNumber(b.image);
//   });
//   return filtered;
// }

// /**
//  * 선택된 환수 목록을 렌더링합니다.
//  */
// function renderSelectedList() {
//   const container = elements.selectedSpiritsList;
//   container.innerHTML = ""; // 기존 목록 비우기

//   // 현재 카테고리에 해당하는 선택된 환수만 필터링
//   const currentCategorySpirits = [...pageState.selectedSpirits.values()].filter(
//     (s) => s.type === pageState.currentCategory
//   );
//   elements.selectedCount.textContent = currentCategorySpirits.length; // 선택된 환수 개수 업데이트

//   if (currentCategorySpirits.length === 0) {
//     container.innerHTML = "<p>선택된 환수가 없습니다.</p>";
//     return;
//   }

//   // 각 선택된 환수 카드 렌더링
//   currentCategorySpirits.forEach((spirit) => {
//     const card = createElement("div", "selected-spirit-card", {
//       "data-spirit-name": spirit.name,
//     });

//     const { hasFullRegistration, hasFullBind, hasLevel25Bind } =
//       checkSpiritStats(spirit); // 유틸 함수 사용

//     card.innerHTML = `
//         <button class="remove-spirit" data-action="remove">X</button>
//         <div class="selected-spirit-header">
//             <img src="/${spirit.image}" alt="${spirit.name}">
//             <div class="spirit-info">
//                 <div class="spirit-name">${spirit.name}</div>
//             </div>
//         </div>
//         <div class="spirit-level-control">
//             <button class="level-btn min-btn" data-action="min-level">m</button>
//             <button class="level-btn minus-btn" data-action="level-down">-</button>
//             <input type="number" class="level-input" min="0" max="25" value="${spirit.level}">
//             <button class="level-btn plus-btn" data-action="level-up">+</button>
//             <button class="level-btn max-btn" data-action="max-level">M</button>
//         </div>

//         `;
//     container.appendChild(card);
//   });
// }

// /**
//  * 현재 페이지 상태를 로컬 스토리지에 저장합니다.
//  */
// function saveStateToStorage() {
//   localStorage.setItem(
//     "bondCalculatorState",
//     JSON.stringify({
//       category: pageState.currentCategory,
//       spirits: [...pageState.selectedSpirits.values()],
//       groupByInfluence: pageState.groupByInfluence, // 토글 상태 저장
//       currentStatFilter: pageState.currentStatFilter, // 필터 상태 저장
//     })
//   );
// }

// /**
//  * 로컬 스토리지에서 저장된 페이지 상태를 로드합니다.
//  */
// function loadStateFromStorage() {
//   const savedState = localStorage.getItem("bondCalculatorState");
//   if (savedState) {
//     try {
//       const data = JSON.parse(savedState);
//       pageState.currentCategory = data.category || "수호";
//       // Map으로 다시 변환
//       pageState.selectedSpirits = new Map(
//         (data.spirits || []).map((s) => [s.name, s])
//       );
//       pageState.groupByInfluence = data.groupByInfluence || false;
//       pageState.currentStatFilter = data.currentStatFilter || "";
//     } catch (e) {
//       console.error("Error loading state from storage, resetting:", e);
//       pageState.selectedSpirits = new Map(); // 오류 발생 시 초기화
//       pageState.groupByInfluence = false;
//       pageState.currentStatFilter = "";
//     }
//   }
// }

// /**
//  * 스탯 필터 드롭다운을 초기화하고 이벤트 리스너를 설정합니다.
//  */
// function initStatFilter() {
//   const filterContainer = elements.container.querySelector(
//     ".stat-filter-container"
//   );
//   // createStatFilter 컴포넌트 사용
//   createStatFilter(filterContainer, globalState.allSpirits, (newStatKey) => {
//     pageState.currentStatFilter = newStatKey;
//     renderSpiritList(); // 필터 변경 시 환수 목록만 재렌더링
//   });

//   // 로드된 상태에 따라 필터 초기화
//   // initStatFilter 호출 시 이미 elements.container.querySelector("#statFilter")가 존재한다고 가정
//   const statFilterElement = elements.container.querySelector("#statFilter");
//   const clearFilterBtnElement =
//     elements.container.querySelector(".clear-filter-btn");

//   if (statFilterElement) {
//     statFilterElement.value = pageState.currentStatFilter;
//   }
//   if (clearFilterBtnElement) {
//     clearFilterBtnElement.style.display = pageState.currentStatFilter
//       ? "block"
//       : "none";
//   }
// }

// /**
//  * 모든 이벤트 리스너를 설정합니다.
//  */
// function setupEventListeners() {
//   // 클릭 이벤트 위임
//   elements.container.addEventListener("click", handleContainerClick);
//   elements.influenceToggle.addEventListener("change", handleToggleChange);
//   // 선택된 환수 목록의 레벨 입력 변경 이벤트 (input의 change 이벤트)
//   elements.selectedSpiritsList.addEventListener(
//     "input", // input 이벤트 사용 (change는 포커스 잃을 때 발생)
//     handleLevelInputChange
//   );

//   // [추가] 전체 선택/해제 버튼 이벤트 리스너
//   elements.selectAllBtn.addEventListener("click", handleSelectAll);
//   elements.clearAllSelectionBtn.addEventListener("click", handleClearSelection);
// }

// /**
//  * [수정] 모듈 스코프로 이동: handleSpiritSelect 함수
//  * 환수 선택/해제 로직을 처리합니다.
//  * @param {object} spirit - 선택/해제할 환수 데이터
//  */
// function handleSpiritSelect(spirit) {
//   if (!spirit) return;
//   const spiritName = spirit.name;

//   if (pageState.selectedSpirits.has(spiritName)) {
//     // 이미 선택된 환수라면 해제
//     pageState.selectedSpirits.delete(spiritName);
//   } else {
//     // [수정] 40개 선택 제한 제거
//     // const currentCategorySelectedCount = [...pageState.selectedSpirits.values()].filter(
//     //   (s) => s.type === pageState.currentCategory
//     // ).length;

//     // if (currentCategorySelectedCount >= 40) {
//     //   alert(
//     //     `${pageState.currentCategory} 카테고리는 최대 40개까지만 선택할 수 있습니다.`
//     //   );
//     //   return;
//     // }
//     // 레벨 0으로 초기화하여 추가
//     pageState.selectedSpirits.set(spiritName, { ...spirit, level: 0 });
//   }
//   renderAll(); // UI 전체 재렌더링
// }

// /**
//  * 컨테이너 내의 클릭 이벤트를 처리합니다. (탭, 버튼 등)
//  */
// function handleContainerClick(e) {
//   const subTab = e.target.closest("#bondCategoryTabs .tab");
//   if (subTab && !subTab.classList.contains("active")) {
//     // 탭 변경 처리
//     elements.bondCategoryTabs
//       .querySelector(".tab.active")
//       .classList.remove("active");
//     subTab.classList.add("active");
//     pageState.currentCategory = subTab.dataset.category;
//     renderAll(); // 전체 UI 재렌더링
//     return;
//   }

//   // [수정] 오른쪽 패널의 '현재 탭 전체 해제' 버튼은 좌측으로 이동했으므로 제거
//   // if (target.matches("#clearSelectionBtn")) handleClearSelection();
//   const target = e.target;
//   if (target.matches("#applyBatchLevelBtn")) handleBatchLevel();
//   else if (target.matches("#findOptimalBtn")) handleFindOptimal();

//   // 선택된 환수 카드 내의 버튼 클릭 처리
//   const card = target.closest(".selected-spirit-card");
//   if (!card) return; // 환수 카드 클릭이 아니면 무시

//   const spiritName = card.dataset.spiritName;
//   const spirit = pageState.selectedSpirits.get(spiritName);
//   if (!spirit) return;

//   const action = target.dataset.action;
//   let shouldRender = false; // UI 재렌더링 필요 여부 플래그

//   switch (action) {
//     case "remove":
//       pageState.selectedSpirits.delete(spiritName);
//       shouldRender = true;
//       break;
//     case "min-level":
//       if (spirit.level !== 0) {
//         spirit.level = 0;
//         shouldRender = true;
//       }
//       break;
//     case "level-down":
//       if (spirit.level > 0) {
//         spirit.level = Math.max(0, spirit.level - 1);
//         shouldRender = true;
//       }
//       break;
//     case "level-up":
//       if (spirit.level < 25) {
//         spirit.level = Math.min(25, spirit.level + 1);
//         shouldRender = true;
//       }
//       break;
//     case "max-level":
//       if (spirit.level !== 25) {
//         spirit.level = 25;
//         shouldRender = true;
//       }
//       break;
//   }

//   if (shouldRender) {
//     renderAll(); // 변경 사항이 있을 때만 UI 재렌더링
//   }
// }

// /**
//  * 세력별 보기 토글 변경 이벤트를 처리합니다.
//  */
// function handleToggleChange(e) {
//   pageState.groupByInfluence = e.target.checked;
//   renderSpiritList(); // 환수 목록만 재렌더링 (그리드 방식 변경)
// }

// /**
//  * 선택된 환수 목록에서 레벨 입력 변경 이벤트를 처리합니다.
//  */
// function handleLevelInputChange(e) {
//   if (e.target.matches(".level-input")) {
//     const card = e.target.closest(".selected-spirit-card");
//     const spirit = pageState.selectedSpirits.get(card.dataset.spiritName);
//     if (spirit) {
//       let newLevel = parseInt(e.target.value, 10);
//       if (isNaN(newLevel) || newLevel < 0) newLevel = 0;
//       if (newLevel > 25) newLevel = 25;
//       spirit.level = newLevel;
//       e.target.value = newLevel; // 유효성 검사 후 입력 값 업데이트
//       saveStateToStorage(); // 상태 저장
//     }
//   }
// }

// /**
//  * [수정] 현재 탭의 모든 환수를 해제합니다.
//  */
// function handleClearSelection() {
//   const spiritsToRemove = [...pageState.selectedSpirits.values()].filter(
//     (s) => s.type === pageState.currentCategory
//   );
//   spiritsToRemove.forEach((s) => pageState.selectedSpirits.delete(s.name));
//   renderAll();
// }

// /**
//  * [추가] 현재 탭의 모든 환수를 선택합니다.
//  */
// function handleSelectAll() {
//   const spiritsToAdd = getSpiritsForCurrentState(); // 현재 필터링된 환수 목록 가져오기

//   spiritsToAdd.forEach((spirit) => {
//     // 이미 선택된 환수는 건너뛰고, 선택되지 않은 환수만 추가 (레벨 0으로 초기화)
//     if (!pageState.selectedSpirits.has(spirit.name)) {
//       pageState.selectedSpirits.set(spirit.name, { ...spirit, level: 0 });
//     }
//   });
//   renderAll(); // UI 전체 재렌더링
// }

// /**
//  * 선택된 환수들의 레벨을 일괄 변경합니다.
//  */
// function handleBatchLevel() {
//   const batchLevel = parseInt(elements.batchLevelInput.value, 10);
//   if (isNaN(batchLevel) || batchLevel < 0 || batchLevel > 25) {
//     alert("0에서 25 사이의 레벨을 입력해주세요.");
//     return;
//   }
//   pageState.selectedSpirits.forEach((s) => {
//     if (s.type === pageState.currentCategory) s.level = batchLevel;
//   });
//   renderAll();
// }

// /**
//  * 최적 조합 계산을 요청하고 결과를 모달로 표시합니다.
//  */
// async function handleFindOptimal() {
//   const creaturesForCalc = [...pageState.selectedSpirits.values()]
//     .filter((s) => s.type === pageState.currentCategory)
//     .map((c) => ({ name: c.name, level: c.level }));

//   if (creaturesForCalc.length === 0) {
//     alert("현재 탭에서 선택된 환수가 없습니다.");
//     return;
//   }

//   // 최적 조합 계산은 오래 걸릴 수 있으므로, 로딩 인디케이터 표시
//   const appContainer = document.getElementById("app-container"); // main.js에서 전달받은 app-container 사용
//   showLoading(
//     appContainer,
//     "최적 조합 계산 중",
//     "유전 알고리즘이 실행 중입니다..."
//   );

//   try {
//     const result = await api.calculateOptimalCombination(creaturesForCalc);
//     if (!result || !result.spirits) {
//       throw new Error("API에서 유효한 응답을 받지 못했습니다.");
//     }
//     addHistory(result); // 계산 결과를 기록에 추가
//     showOptimalResultModal(result); // 결과를 모달로 표시
//   } catch (error) {
//     alert(`계산 오류: ${error.message}`);
//     console.error("Optimal combination calculation failed:", error);
//   } finally {
//     hideLoading(); // 로딩 인디케이터 숨김
//   }
// }

// /**
//  * 페이지 초기화 함수.
//  * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
//  */
// export function init(container) {
//   container.innerHTML = getHTML(); // 페이지 HTML 삽입

//   // DOM 요소 참조 저장
//   const el = elements;
//   el.container = container;
//   el.bondCategoryTabs = container.querySelector("#bondCategoryTabs");
//   el.spiritListContainer = container.querySelector("#spiritListContainer");
//   el.selectedSpiritsList = container.querySelector("#selectedSpiritsList");
//   el.selectedCount = container.querySelector("#selectedCount");
//   // [수정] 버튼 ID 변경 (기존 clearSelectionBtn은 좌측 패널로 이동)
//   el.selectAllBtn = container.querySelector("#selectAllBtn");
//   el.clearAllSelectionBtn = container.querySelector("#clearAllSelectionBtn");

//   el.batchLevelInput = container.querySelector("#batchLevelInput");
//   el.applyBatchLevelBtn = container.querySelector("#applyBatchLevelBtn");
//   el.findOptimalBtn = container.querySelector("#findOptimalBtn");
//   el.influenceToggle = container.querySelector("#influenceToggle");

//   loadStateFromStorage(); // 저장된 상태 로드

//   // 로드된 카테고리에 따라 탭 활성화
//   container.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
//     tab.classList.toggle(
//       "active",
//       tab.dataset.category === pageState.currentCategory
//     );
//   });

//   setupEventListeners(); // 이벤트 리스너 설정
//   initStatFilter(); // 스탯 필터 초기화
//   renderAll(); // 초기 렌더링
//   console.log("환수 결속 페이지 초기화 완료.");
// }

// /**
//  * 페이지 정리 함수.
//  * 페이지 전환 시 불필요한 이벤트 리스너 등을 제거하여 메모리 누수를 방지합니다.
//  */
// export function cleanup() {
//   if (elements.container) {
//     elements.container.removeEventListener("click", handleContainerClick);
//   }
//   if (elements.influenceToggle) {
//     elements.influenceToggle.removeEventListener("change", handleToggleChange);
//   }
//   if (elements.selectedSpiritsList) {
//     elements.selectedSpiritsList.removeEventListener(
//       "input",
//       handleLevelInputChange
//     );
//   }
//   // [수정] 추가된 버튼의 이벤트 리스너 제거
//   if (elements.selectAllBtn) {
//     elements.selectAllBtn.removeEventListener("click", handleSelectAll);
//   }
//   if (elements.clearAllSelectionBtn) {
//     elements.clearAllSelectionBtn.removeEventListener(
//       "click",
//       handleClearSelection
//     );
//   }
//   console.log("환수 결속 페이지 정리 완료.");
// }

// // import { state as globalState } from "../state.js";
// // import * as api from "../api.js";
// // import { createElement } from "../utils.js";
// // import { showResultModal as showOptimalResultModal } from "../resultModal.js";
// // import { addResult as addHistory } from "../historyManager.js";
// // import { renderSpiritGrid } from "../components/spritGrid.js";
// // import { showLoading, hideLoading } from "../loadingIndicator.js";
// // import { checkSpiritStats, checkItemForStatEffect } from "../utils.js";
// // import { createStatFilter } from "../components/statFilter.js";
// // import { INFLUENCE_ROWS, GRADE_ORDER, STATS_MAPPING } from "../constants.js";

// // const pageState = {
// //   currentCategory: "수호", // 현재 선택된 환수 카테고리 (수호, 탑승, 변신)
// //   selectedSpirits: new Map(), // 선택된 환수 Map<name, {spiritData, level}>
// //   groupByInfluence: false, // 세력별로 그룹화할지 여부
// //   currentStatFilter: "", // 현재 적용된 스탯 필터 키
// // };
// // const elements = {}; // DOM 요소를 저장할 객체

// // /**
// //  * 페이지의 기본 HTML 구조를 반환합니다.
// //  */
// // function getHTML() {
// //   return `
// //     <div class="sub-tabs" id="bondCategoryTabs">
// //         <div class="tab active" data-category="수호">수호</div>
// //         <div class="tab" data-category="탑승">탑승</div>
// //         <div class="tab" data-category="변신">변신</div>
// //     </div>
// //     <div class="view-toggle-container">
// //         <label class="toggle-switch">
// //             <input type="checkbox" id="influenceToggle">
// //             <span class="slider round"></span>
// //         </label>
// //         <span class="toggle-label">세력별 보기</span>
// //         <div class="stat-filter-container"></div> <!-- 스탯 필터가 렌더링될 곳 -->
// //     </div>
// //     <div class="bond-container">
// //         <div class="main-content">
// //             <div class="left-panel">
// //                 <h2>전체 환수 목록</h2>
// //                 <div id="spiritListContainer" class="spirit-selection"></div>
// //             </div>
// //             <div class="right-panel">
// //                 <div class="selected-spirits-container">
// //                     <div class="selected-spirits-header">
// //                         <h3>선택된 환수 (<span id="selectedCount">0</span>)</h3>
// //                         <button id="clearSelectionBtn" class="clear-selection-btn">현재 탭 전체 해제</button>
// //                     </div>
// //                     <div id="selectedSpiritsList" class="selected-spirits"></div>
// //                     <div class="header-controls">
// //                         <div class="level-batch-control">
// //                             <label>일괄 레벨:</label>
// //                             <input type="number" id="batchLevelInput" min="0" max="25" value="0">
// //                             <button id="applyBatchLevelBtn" class="btn btn-primary">적용</button>
// //                         </div>
// //                         <div class="calculate-btn-small">
// //                             <button id="findOptimalBtn" class="btn btn-secondary">최적 조합 찾기</button>
// //                         </div>
// //                     </div>
// //                 </div>
// //             </div>
// //         </div>
// //     </div>`;
// // }

// // /**
// //  * 모든 UI 구성 요소를 렌더링합니다.
// //  */
// // function renderAll() {
// //   renderSpiritList(); // 전체 환수 목록 렌더링
// //   renderSelectedList(); // 선택된 환수 목록 렌더링
// //   saveStateToStorage(); // 현재 상태를 로컬 스토리지에 저장
// // }

// // /**
// //  * 전체 환수 목록을 렌더링합니다. 필터 및 정렬이 적용됩니다.
// //  */
// // function renderSpiritList() {
// //   let spirits = getSpiritsForCurrentState(); // 현재 카테고리에 맞는 환수 가져오기
// //   if (pageState.currentStatFilter) {
// //     // 스탯 필터가 적용되어 있다면 필터링
// //     spirits = spirits.filter((spirit) =>
// //       checkItemForStatEffect(spirit, pageState.currentStatFilter)
// //     );
// //   }

// //   // spiritGrid 컴포넌트 사용하여 목록 렌더링
// //   renderSpiritGrid({
// //     container: elements.spiritListContainer,
// //     spirits: spirits,
// //     onSpiritClick: handleSpiritSelect, // <-- 이 함수가 모듈 스코프에 있어야 합니다.
// //     getSpiritState: (spirit) => {
// //       // 각 환수의 상태를 반환 (선택 여부, 완료 여부 등)
// //       const { hasFullRegistration, hasFullBind, hasLevel25Bind } =
// //         checkSpiritStats(spirit);
// //       return {
// //         selected: pageState.selectedSpirits.has(spirit.name),
// //         registrationCompleted: hasFullRegistration,
// //         bondCompleted: hasFullBind,
// //         level25BindAvailable: hasLevel25Bind,
// //       };
// //     },
// //     groupByInfluence: pageState.groupByInfluence,
// //   });
// // }

// // /**
// //  * 현재 페이지 상태(카테고리)에 따라 환수 목록을 필터링하고 정렬합니다.
// //  * @returns {Array<object>} 필터링 및 정렬된 환수 배열
// //  */
// // function getSpiritsForCurrentState() {
// //   const extractNumber = (path) =>
// //     path ? parseInt(path.match(/\d+/)?.[0] || "999", 10) : 999;
// //   const filtered = globalState.allSpirits.filter(
// //     (s) => s.type === pageState.currentCategory
// //   );
// //   // 등급 (불멸 -> 전설) 및 이미지 경로의 숫자 순으로 정렬
// //   filtered.sort((a, b) => {
// //     const gradeOrder = { 전설: 1, 불멸: 2 };
// //     const orderA = gradeOrder[a.grade] || 99;
// //     const orderB = gradeOrder[b.grade] || 99;
// //     if (orderA !== orderB) return orderA - orderB;
// //     return extractNumber(a.image) - extractNumber(b.image);
// //   });
// //   return filtered;
// // }

// // /**
// //  * 선택된 환수 목록을 렌더링합니다.
// //  */
// // function renderSelectedList() {
// //   const container = elements.selectedSpiritsList;
// //   container.innerHTML = ""; // 기존 목록 비우기

// //   // 현재 카테고리에 해당하는 선택된 환수만 필터링
// //   const currentCategorySpirits = [...pageState.selectedSpirits.values()].filter(
// //     (s) => s.type === pageState.currentCategory
// //   );
// //   elements.selectedCount.textContent = currentCategorySpirits.length; // 선택된 환수 개수 업데이트

// //   if (currentCategorySpirits.length === 0) {
// //     container.innerHTML = "<p>선택된 환수가 없습니다.</p>";
// //     return;
// //   }

// //   // 각 선택된 환수 카드 렌더링
// //   currentCategorySpirits.forEach((spirit) => {
// //     const card = createElement("div", "selected-spirit-card", {
// //       "data-spirit-name": spirit.name,
// //     });

// //     const { hasFullRegistration, hasFullBind, hasLevel25Bind } =
// //       checkSpiritStats(spirit); // 유틸 함수 사용

// //     card.innerHTML = `
// //         <button class="remove-spirit" data-action="remove">X</button>
// //         <div class="selected-spirit-header">
// //             <img src="/${spirit.image}" alt="${spirit.name}">
// //             <div class="spirit-info">
// //                 <div class="spirit-name">${spirit.name}</div>
// //             </div>
// //         </div>
// //         <div class="spirit-level-control">
// //             <button class="level-btn min-btn" data-action="min-level">m</button>
// //             <button class="level-btn minus-btn" data-action="level-down">-</button>
// //             <input type="number" class="level-input" min="0" max="25" value="${
// //               spirit.level
// //             }">
// //             <button class="level-btn plus-btn" data-action="level-up">+</button>
// //             <button class="level-btn max-btn" data-action="max-level">M</button>
// //         </div>
// //         ${
// //           hasFullRegistration
// //             ? '<div class="ribbon-left"><span>등록</span></div>'
// //             : ""
// //         }
// //         ${
// //           hasFullBind ? '<div class="ribbon-right"><span>장착</span></div>' : ""
// //         }
// //         ${
// //           hasLevel25Bind
// //             ? '<div class="level25-indicator"><span>Lv.25<br>완료</span></div>'
// //             : ""
// //         }
// //         `;
// //     container.appendChild(card);
// //   });
// // }

// // /**
// //  * 현재 페이지 상태를 로컬 스토리지에 저장합니다.
// //  */
// // function saveStateToStorage() {
// //   localStorage.setItem(
// //     "bondCalculatorState",
// //     JSON.stringify({
// //       category: pageState.currentCategory,
// //       spirits: [...pageState.selectedSpirits.values()],
// //       groupByInfluence: pageState.groupByInfluence, // 토글 상태 저장
// //       currentStatFilter: pageState.currentStatFilter, // 필터 상태 저장
// //     })
// //   );
// // }

// // /**
// //  * 로컬 스토리지에서 저장된 페이지 상태를 로드합니다.
// //  */
// // function loadStateFromStorage() {
// //   const savedState = localStorage.getItem("bondCalculatorState");
// //   if (savedState) {
// //     try {
// //       const data = JSON.parse(savedState);
// //       pageState.currentCategory = data.category || "수호";
// //       // Map으로 다시 변환
// //       pageState.selectedSpirits = new Map(
// //         (data.spirits || []).map((s) => [s.name, s])
// //       );
// //       pageState.groupByInfluence = data.groupByInfluence || false;
// //       pageState.currentStatFilter = data.currentStatFilter || "";
// //     } catch (e) {
// //       console.error("Error loading state from storage, resetting:", e);
// //       pageState.selectedSpirits = new Map(); // 오류 발생 시 초기화
// //       pageState.groupByInfluence = false;
// //       pageState.currentStatFilter = "";
// //     }
// //   }
// // }

// // /**
// //  * 스탯 필터 드롭다운을 초기화하고 이벤트 리스너를 설정합니다.
// //  */
// // function initStatFilter() {
// //   const filterContainer = elements.container.querySelector(
// //     ".stat-filter-container"
// //   );
// //   // createStatFilter 컴포넌트 사용
// //   createStatFilter(filterContainer, globalState.allSpirits, (newStatKey) => {
// //     pageState.currentStatFilter = newStatKey;
// //     renderSpiritList(); // 필터 변경 시 환수 목록만 재렌더링
// //   });

// //   // 로드된 상태에 따라 필터 초기화
// //   // initStatFilter 호출 시 이미 elements.container.querySelector("#statFilter")가 존재한다고 가정
// //   const statFilterElement = elements.container.querySelector("#statFilter");
// //   const clearFilterBtnElement =
// //     elements.container.querySelector(".clear-filter-btn");

// //   if (statFilterElement) {
// //     statFilterElement.value = pageState.currentStatFilter;
// //   }
// //   if (clearFilterBtnElement) {
// //     clearFilterBtnElement.style.display = pageState.currentStatFilter
// //       ? "block"
// //       : "none";
// //   }
// // }

// // /**
// //  * 모든 이벤트 리스너를 설정합니다.
// //  */
// // function setupEventListeners() {
// //   // 클릭 이벤트 위임
// //   elements.container.addEventListener("click", handleContainerClick);
// //   elements.influenceToggle.addEventListener("change", handleToggleChange);
// //   // 선택된 환수 목록의 레벨 입력 변경 이벤트 (input의 change 이벤트)
// //   elements.selectedSpiritsList.addEventListener(
// //     "input", // input 이벤트 사용 (change는 포커스 잃을 때 발생)
// //     handleLevelInputChange
// //   );
// // }

// // /**
// //  * [수정] 모듈 스코프로 이동: handleSpiritSelect 함수
// //  * 환수 선택/해제 로직을 처리합니다.
// //  * @param {object} spirit - 선택/해제할 환수 데이터
// //  */
// // function handleSpiritSelect(spirit) {
// //   if (!spirit) return;
// //   const spiritName = spirit.name;

// //   if (pageState.selectedSpirits.has(spiritName)) {
// //     // 이미 선택된 환수라면 해제
// //     pageState.selectedSpirits.delete(spiritName);
// //   } else {
// //     // 선택되지 않은 환수라면 추가 (최대 40개 제한)
// //     const currentCategorySelectedCount = [
// //       ...pageState.selectedSpirits.values(),
// //     ].filter((s) => s.type === pageState.currentCategory).length;

// //     if (currentCategorySelectedCount >= 40) {
// //       alert(
// //         `${pageState.currentCategory} 카테고리는 최대 40개까지만 선택할 수 있습니다.`
// //       );
// //       return;
// //     }
// //     // 레벨 0으로 초기화하여 추가
// //     pageState.selectedSpirits.set(spiritName, { ...spirit, level: 0 });
// //   }
// //   renderAll(); // UI 전체 재렌더링
// // }

// // /**
// //  * 컨테이너 내의 클릭 이벤트를 처리합니다. (탭, 버튼 등)
// //  */
// // function handleContainerClick(e) {
// //   const subTab = e.target.closest("#bondCategoryTabs .tab");
// //   if (subTab && !subTab.classList.contains("active")) {
// //     // 탭 변경 처리
// //     elements.bondCategoryTabs
// //       .querySelector(".tab.active")
// //       .classList.remove("active");
// //     subTab.classList.add("active");
// //     pageState.currentCategory = subTab.dataset.category;
// //     renderAll(); // 전체 UI 재렌더링
// //     return;
// //   }

// //   // 오른쪽 패널 내부의 특정 버튼 클릭 처리
// //   const target = e.target;
// //   if (target.matches("#clearSelectionBtn")) handleClearSelection();
// //   else if (target.matches("#applyBatchLevelBtn")) handleBatchLevel();
// //   else if (target.matches("#findOptimalBtn")) handleFindOptimal();

// //   // 선택된 환수 카드 내의 버튼 클릭 처리
// //   const card = target.closest(".selected-spirit-card");
// //   if (!card) return; // 환수 카드 클릭이 아니면 무시

// //   const spiritName = card.dataset.spiritName;
// //   const spirit = pageState.selectedSpirits.get(spiritName);
// //   if (!spirit) return;

// //   const action = target.dataset.action;
// //   let shouldRender = false; // UI 재렌더링 필요 여부 플래그

// //   switch (action) {
// //     case "remove":
// //       pageState.selectedSpirits.delete(spiritName);
// //       shouldRender = true;
// //       break;
// //     case "min-level":
// //       if (spirit.level !== 0) {
// //         spirit.level = 0;
// //         shouldRender = true;
// //       }
// //       break;
// //     case "level-down":
// //       if (spirit.level > 0) {
// //         spirit.level = Math.max(0, spirit.level - 1);
// //         shouldRender = true;
// //       }
// //       break;
// //     case "level-up":
// //       if (spirit.level < 25) {
// //         spirit.level = Math.min(25, spirit.level + 1);
// //         shouldRender = true;
// //       }
// //       break;
// //     case "max-level":
// //       if (spirit.level !== 25) {
// //         spirit.level = 25;
// //         shouldRender = true;
// //       }
// //       break;
// //   }

// //   if (shouldRender) {
// //     renderAll(); // 변경 사항이 있을 때만 UI 재렌더링
// //   }
// // }

// // /**
// //  * 세력별 보기 토글 변경 이벤트를 처리합니다.
// //  */
// // function handleToggleChange(e) {
// //   pageState.groupByInfluence = e.target.checked;
// //   renderSpiritList(); // 환수 목록만 재렌더링 (그리드 방식 변경)
// // }

// // /**
// //  * 선택된 환수 목록에서 레벨 입력 변경 이벤트를 처리합니다.
// //  */
// // function handleLevelInputChange(e) {
// //   if (e.target.matches(".level-input")) {
// //     const card = e.target.closest(".selected-spirit-card");
// //     const spirit = pageState.selectedSpirits.get(card.dataset.spiritName);
// //     if (spirit) {
// //       let newLevel = parseInt(e.target.value, 10);
// //       if (isNaN(newLevel) || newLevel < 0) newLevel = 0;
// //       if (newLevel > 25) newLevel = 25;
// //       spirit.level = newLevel;
// //       e.target.value = newLevel; // 유효성 검사 후 입력 값 업데이트
// //       saveStateToStorage(); // 상태 저장
// //     }
// //   }
// // }

// // /**
// //  * 현재 탭에서 선택된 환수를 모두 해제합니다.
// //  */
// // function handleClearSelection() {
// //   [...pageState.selectedSpirits.values()]
// //     .filter((s) => s.type === pageState.currentCategory)
// //     .forEach((s) => pageState.selectedSpirits.delete(s.name));
// //   renderAll();
// // }

// // /**
// //  * 선택된 환수들의 레벨을 일괄 변경합니다.
// //  */
// // function handleBatchLevel() {
// //   const batchLevel = parseInt(elements.batchLevelInput.value, 10);
// //   if (isNaN(batchLevel) || batchLevel < 0 || batchLevel > 25) {
// //     alert("0에서 25 사이의 레벨을 입력해주세요.");
// //     return;
// //   }
// //   pageState.selectedSpirits.forEach((s) => {
// //     if (s.type === pageState.currentCategory) s.level = batchLevel;
// //   });
// //   renderAll();
// // }

// // /**
// //  * 최적 조합 계산을 요청하고 결과를 모달로 표시합니다.
// //  */
// // async function handleFindOptimal() {
// //   const creaturesForCalc = [...pageState.selectedSpirits.values()]
// //     .filter((s) => s.type === pageState.currentCategory)
// //     .map((c) => ({ name: c.name, level: c.level }));

// //   if (creaturesForCalc.length === 0) {
// //     alert("현재 탭에서 선택된 환수가 없습니다.");
// //     return;
// //   }

// //   // 최적 조합 계산은 오래 걸릴 수 있으므로, 로딩 인디케이터 표시
// //   const appContainer = document.getElementById("app-container"); // main.js에서 전달받은 app-container 사용
// //   showLoading(
// //     appContainer,
// //     "최적 조합 계산 중",
// //     "유전 알고리즘이 실행 중입니다..."
// //   );

// //   try {
// //     const result = await api.calculateOptimalCombination(creaturesForCalc);
// //     if (!result || !result.spirits) {
// //       throw new Error("API에서 유효한 응답을 받지 못했습니다.");
// //     }
// //     addHistory(result); // 계산 결과를 기록에 추가
// //     showOptimalResultModal(result); // 결과를 모달로 표시
// //   } catch (error) {
// //     alert(`계산 오류: ${error.message}`);
// //     console.error("Optimal combination calculation failed:", error);
// //   } finally {
// //     hideLoading(); // 로딩 인디케이터 숨김
// //   }
// // }

// // /**
// //  * 페이지 초기화 함수.
// //  * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
// //  */
// // export function init(container) {
// //   container.innerHTML = getHTML(); // 페이지 HTML 삽입

// //   // DOM 요소 참조 저장
// //   const el = elements;
// //   el.container = container;
// //   el.bondCategoryTabs = container.querySelector("#bondCategoryTabs");
// //   el.spiritListContainer = container.querySelector("#spiritListContainer");
// //   el.selectedSpiritsList = container.querySelector("#selectedSpiritsList");
// //   el.selectedCount = container.querySelector("#selectedCount");
// //   el.clearSelectionBtn = container.querySelector("#clearSelectionBtn");
// //   el.batchLevelInput = container.querySelector("#batchLevelInput");
// //   el.applyBatchLevelBtn = container.querySelector("#applyBatchLevelBtn");
// //   el.findOptimalBtn = container.querySelector("#findOptimalBtn");
// //   el.influenceToggle = container.querySelector("#influenceToggle");

// //   loadStateFromStorage(); // 저장된 상태 로드

// //   // 로드된 카테고리에 따라 탭 활성화
// //   container.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
// //     tab.classList.toggle(
// //       "active",
// //       tab.dataset.category === pageState.currentCategory
// //     );
// //   });

// //   setupEventListeners(); // 이벤트 리스너 설정
// //   initStatFilter(); // 스탯 필터 초기화
// //   renderAll(); // 초기 렌더링
// //   console.log("환수 결속 페이지 초기화 완료.");
// // }

// // /**
// //  * 페이지 정리 함수.
// //  * 페이지 전환 시 불필요한 이벤트 리스너 등을 제거하여 메모리 누수를 방지합니다.
// //  */
// // export function cleanup() {
// //   if (elements.container) {
// //     elements.container.removeEventListener("click", handleContainerClick);
// //   }
// //   if (elements.influenceToggle) {
// //     elements.influenceToggle.removeEventListener("change", handleToggleChange);
// //   }
// //   if (elements.selectedSpiritsList) {
// //     elements.selectedSpiritsList.removeEventListener(
// //       "input",
// //       handleLevelInputChange
// //     );
// //   }
// //   // statFilter 컴포넌트에 cleanup 함수가 있다면 호출
// //   // if (elements.statFilterComponent?.cleanup) { elements.statFilterComponent.cleanup(); }
// //   console.log("환수 결속 페이지 정리 완료.");
// // }

import { state as globalState } from "../state.js";
import * as api from "../api.js";
import { createElement } from "../utils.js";
import { showResultModal as showOptimalResultModal } from "../resultModal.js";
import { addResult as addHistory } from "../historyManager.js";
import { renderSpiritGrid } from "../components/spritGrid.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import { checkSpiritStats, checkItemForStatEffect } from "../utils.js";
import { createStatFilter } from "../components/statFilter.js";
import { INFLUENCE_ROWS, GRADE_ORDER, STATS_MAPPING } from "../constants.js";

const pageState = {
  currentCategory: "수호", // 현재 선택된 환수 카테고리 (수호, 탑승, 변신)
  selectedSpirits: new Map(), // 선택된 환수 Map<name, {spiritData, level}>
  groupByInfluence: false, // 세력별로 그룹화할지 여부
  currentStatFilter: "", // 현재 적용된 스탯 필터 키
};
const elements = {}; // DOM 요소를 저장할 객체

/**
 * 페이지의 기본 HTML 구조를 반환합니다.
 */
function getHTML() {
  return `
    <div class="sub-tabs" id="bondCategoryTabs">
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
    <div class="bond-container">
        <div class="main-content">
            <div class="left-panel">
                <div class="section-header">
                    <h2 class="section-title">전체 환수 목록</h2>
                    <div class="selection-controls">
                        <button id="selectAllBtn" class="btn btn-sm btn-primary">전체선택</button>
                        <button id="clearAllSelectionBtn" class="btn btn-sm btn-danger">전체해제</button>
                    </div>
                </div>
                <div id="spiritListContainer" class="spirit-selection"></div>
            </div>
            <div class="right-panel">
                <div class="selected-spirits-container">
                    <div class="selected-spirits-header">
                        <h3 class="selection-title">선택된 환수 (<span id="selectedCount">0</span>)</h3>
                    </div>
                    <div id="selectedSpiritsList" class="selected-spirits"></div>
                    <div class="header-controls">
                        <div class="level-batch-control">
                            <label>일괄 레벨:</label>
                            <input type="number" id="batchLevelInput" min="0" max="25" value="0">
                            <button id="applyBatchLevelBtn" class="btn btn-sm btn-primary">적용</button>
                        </div>
                        <div class="calculate-btn-small">
                            <button id="findOptimalBtn" class="btn btn-warning">최적 조합 찾기</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * 모든 UI 구성 요소를 렌더링합니다.
 */
function renderAll() {
  renderSpiritList(); // 전체 환수 목록 렌더링
  renderSelectedList(); // 선택된 환수 목록 렌더링
  saveStateToStorage(); // 현재 상태를 로컬 스토리지에 저장
}

/**
 * 전체 환수 목록을 렌더링합니다. 필터 및 정렬이 적용됩니다.
 */
function renderSpiritList() {
  let spirits = getSpiritsForCurrentState(); // 현재 카테고리에 맞는 환수 가져오기
  if (pageState.currentStatFilter) {
    // 스탯 필터가 적용되어 있다면 필터링
    spirits = spirits.filter((spirit) =>
      checkItemForStatEffect(spirit, pageState.currentStatFilter)
    );
  }

  // spiritGrid 컴포넌트 사용하여 목록 렌더링
  renderSpiritGrid({
    container: elements.spiritListContainer,
    spirits: spirits,
    onSpiritClick: handleSpiritSelect,
    getSpiritState: (spirit) => {
      // 각 환수의 상태를 반환 (선택 여부, 완료 여부 등)
      const { hasFullRegistration, hasFullBind, hasLevel25Bind } =
        checkSpiritStats(spirit);
      return {
        selected: pageState.selectedSpirits.has(spirit.name),
        registrationCompleted: hasFullRegistration,
        bondCompleted: hasFullBind,
        level25BindAvailable: hasLevel25Bind,
      };
    },
    groupByInfluence: pageState.groupByInfluence,
  });
}

/**
 * 현재 페이지 상태(카테고리)에 따라 환수 목록을 필터링하고 정렬합니다.
 * @returns {Array<object>} 필터링 및 정렬된 환수 배열
 */
function getSpiritsForCurrentState() {
  const extractNumber = (path) =>
    path ? parseInt(path.match(/\d+/)?.[0] || "999", 10) : 999;
  const filtered = globalState.allSpirits.filter(
    (s) => s.type === pageState.currentCategory
  );
  // 등급 (불멸 -> 전설) 및 이미지 경로의 숫자 순으로 정렬
  filtered.sort((a, b) => {
    const gradeOrder = { 전설: 1, 불멸: 2 };
    const orderA = gradeOrder[a.grade] || 99;
    const orderB = gradeOrder[b.grade] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return extractNumber(a.image) - extractNumber(b.image);
  });
  return filtered;
}

/**
 * 선택된 환수 목록을 렌더링합니다.
 */
function renderSelectedList() {
  const container = elements.selectedSpiritsList;
  container.innerHTML = ""; // 기존 목록 비우기

  // 현재 카테고리에 해당하는 선택된 환수만 필터링
  const currentCategorySpirits = [...pageState.selectedSpirits.values()].filter(
    (s) => s.type === pageState.currentCategory
  );
  elements.selectedCount.textContent = currentCategorySpirits.length; // 선택된 환수 개수 업데이트

  if (currentCategorySpirits.length === 0) {
    container.innerHTML =
      "<p class='text-center text-sm text-light mt-lg'>선택된 환수가 없습니다.</p>";
    return;
  }

  // 각 선택된 환수 카드 렌더링
  currentCategorySpirits.forEach((spirit) => {
    const card = createElement("div", "selected-spirit-card", {
      "data-spirit-name": spirit.name,
    });

    card.innerHTML = `
        <button class="remove-spirit" data-action="remove" title="선택 해제">×</button>
        <div class="selected-spirit-header">
            <img src="/${spirit.image}" alt="${spirit.name}">
            <div class="spirit-info">
                <div class="spirit-name">${spirit.name}</div>
            </div>
        </div>
        <div class="spirit-level-control">
            <button class="level-btn min-btn" data-action="min-level" title="레벨 0으로 설정">0</button>
            <button class="level-btn minus-btn" data-action="level-down" title="레벨 감소">-</button>
            <input type="number" class="level-input" min="0" max="25" value="${spirit.level}">
            <button class="level-btn plus-btn" data-action="level-up" title="레벨 증가">+</button>
            <button class="level-btn max-btn" data-action="max-level" title="레벨 25로 설정">25</button>
        </div>
        `;
    container.appendChild(card);
  });
}

/**
 * 현재 페이지 상태를 로컬 스토리지에 저장합니다.
 */
function saveStateToStorage() {
  localStorage.setItem(
    "bondCalculatorState",
    JSON.stringify({
      category: pageState.currentCategory,
      spirits: [...pageState.selectedSpirits.values()],
      groupByInfluence: pageState.groupByInfluence, // 토글 상태 저장
      currentStatFilter: pageState.currentStatFilter, // 필터 상태 저장
    })
  );
}

/**
 * 로컬 스토리지에서 저장된 페이지 상태를 로드합니다.
 */
function loadStateFromStorage() {
  const savedState = localStorage.getItem("bondCalculatorState");
  if (savedState) {
    try {
      const data = JSON.parse(savedState);
      pageState.currentCategory = data.category || "수호";
      // Map으로 다시 변환
      pageState.selectedSpirits = new Map(
        (data.spirits || []).map((s) => [s.name, s])
      );
      pageState.groupByInfluence = data.groupByInfluence || false;
      pageState.currentStatFilter = data.currentStatFilter || "";
    } catch (e) {
      console.error("Error loading state from storage, resetting:", e);
      pageState.selectedSpirits = new Map(); // 오류 발생 시 초기화
      pageState.groupByInfluence = false;
      pageState.currentStatFilter = "";
    }
  }
}

/**
 * 스탯 필터 드롭다운을 초기화하고 이벤트 리스너를 설정합니다.
 */
function initStatFilter() {
  const filterContainer = elements.container.querySelector(
    ".stat-filter-container"
  );
  // createStatFilter 컴포넌트 사용
  createStatFilter(filterContainer, globalState.allSpirits, (newStatKey) => {
    pageState.currentStatFilter = newStatKey;
    renderSpiritList(); // 필터 변경 시 환수 목록만 재렌더링
  });

  const statFilterElement = elements.container.querySelector("#statFilter");
  const clearFilterBtnElement =
    elements.container.querySelector(".clear-filter-btn");

  if (statFilterElement) {
    statFilterElement.value = pageState.currentStatFilter;
  }
  if (clearFilterBtnElement) {
    clearFilterBtnElement.style.display = pageState.currentStatFilter
      ? "inline-flex"
      : "none";
  }
}

/**
 * 모든 이벤트 리스너를 설정합니다.
 */
function setupEventListeners() {
  elements.container.addEventListener("click", handleContainerClick);
  elements.influenceToggle.addEventListener("change", handleToggleChange);
  elements.selectedSpiritsList.addEventListener(
    "input",
    handleLevelInputChange
  );
  elements.selectAllBtn.addEventListener("click", handleSelectAll);
  elements.clearAllSelectionBtn.addEventListener("click", handleClearSelection);
}

/**
 * 환수 선택/해제 로직을 처리합니다.
 * @param {object} spirit - 선택/해제할 환수 데이터
 */
function handleSpiritSelect(spirit) {
  if (!spirit) return;
  const spiritName = spirit.name;

  if (pageState.selectedSpirits.has(spiritName)) {
    pageState.selectedSpirits.delete(spiritName);
  } else {
    // 40개 선택 제한 제거
    pageState.selectedSpirits.set(spiritName, { ...spirit, level: 0 });
  }
  renderAll();
}

/**
 * 컨테이너 내의 클릭 이벤트를 처리합니다. (탭, 버튼 등)
 */
function handleContainerClick(e) {
  const target = e.target;
  const subTab = target.closest("#bondCategoryTabs .tab");
  if (subTab && !subTab.classList.contains("active")) {
    elements.bondCategoryTabs
      .querySelector(".tab.active")
      .classList.remove("active");
    subTab.classList.add("active");
    pageState.currentCategory = subTab.dataset.category;
    renderAll();
    return;
  }

  if (target.matches("#applyBatchLevelBtn")) handleBatchLevel();
  else if (target.matches("#findOptimalBtn")) handleFindOptimal();

  const card = target.closest(".selected-spirit-card");
  if (!card) return;

  const spiritName = card.dataset.spiritName;
  const spirit = pageState.selectedSpirits.get(spiritName);
  if (!spirit) return;

  const action = target.dataset.action;
  let shouldRender = false;

  switch (action) {
    case "remove":
      pageState.selectedSpirits.delete(spiritName);
      shouldRender = true;
      break;
    case "min-level":
      if (spirit.level !== 0) {
        spirit.level = 0;
        shouldRender = true;
      }
      break;
    case "level-down":
      if (spirit.level > 0) {
        spirit.level = Math.max(0, spirit.level - 1);
        shouldRender = true;
      }
      break;
    case "level-up":
      if (spirit.level < 25) {
        spirit.level = Math.min(25, spirit.level + 1);
        shouldRender = true;
      }
      break;
    case "max-level":
      if (spirit.level !== 25) {
        spirit.level = 25;
        shouldRender = true;
      }
      break;
  }

  if (shouldRender) {
    renderAll();
  }
}

/**
 * 세력별 보기 토글 변경 이벤트를 처리합니다.
 */
function handleToggleChange(e) {
  pageState.groupByInfluence = e.target.checked;
  saveStateToStorage();
  renderSpiritList();
}

/**
 * 선택된 환수 목록에서 레벨 입력 변경 이벤트를 처리합니다.
 */
function handleLevelInputChange(e) {
  if (e.target.matches(".level-input")) {
    const card = e.target.closest(".selected-spirit-card");
    const spirit = pageState.selectedSpirits.get(card.dataset.spiritName);
    if (spirit) {
      let newLevel = parseInt(e.target.value, 10);
      if (isNaN(newLevel) || newLevel < 0) newLevel = 0;
      if (newLevel > 25) newLevel = 25;
      spirit.level = newLevel;
      e.target.value = newLevel;
      saveStateToStorage();
    }
  }
}

/**
 * 현재 탭의 모든 환수를 해제합니다.
 */
function handleClearSelection() {
  const spiritsInCurrentCategory = getSpiritsForCurrentState();
  spiritsInCurrentCategory.forEach((s) => {
    if (pageState.selectedSpirits.has(s.name)) {
      pageState.selectedSpirits.delete(s.name);
    }
  });
  renderAll();
}

/**
 * 현재 탭의 모든 환수를 선택합니다.
 */
function handleSelectAll() {
  const spiritsToSelect = getSpiritsForCurrentState();
  spiritsToSelect.forEach((spirit) => {
    if (!pageState.selectedSpirits.has(spirit.name)) {
      pageState.selectedSpirits.set(spirit.name, { ...spirit, level: 0 });
    }
  });
  renderAll();
}

/**
 * 선택된 환수들의 레벨을 일괄 변경합니다.
 */
function handleBatchLevel() {
  const batchLevel = parseInt(elements.batchLevelInput.value, 10);
  if (isNaN(batchLevel) || batchLevel < 0 || batchLevel > 25) {
    alert("0에서 25 사이의 레벨을 입력해주세요.");
    return;
  }
  pageState.selectedSpirits.forEach((s) => {
    if (s.type === pageState.currentCategory) s.level = batchLevel;
  });
  renderAll();
}

/**
 * 최적 조합 계산을 요청하고 결과를 모달로 표시합니다.
 */
async function handleFindOptimal() {
  const creaturesForCalc = [...pageState.selectedSpirits.values()]
    .filter((s) => s.type === pageState.currentCategory)
    .map((c) => ({ name: c.name, level: c.level }));

  if (creaturesForCalc.length === 0) {
    alert("현재 탭에서 선택된 환수가 없습니다.");
    return;
  }

  const appContainer = document.getElementById("app-container");
  showLoading(
    appContainer,
    "최적 조합 계산 중",
    "유전 알고리즘이 실행 중입니다..."
  );

  try {
    const result = await api.calculateOptimalCombination(creaturesForCalc);
    if (!result || !result.spirits) {
      throw new Error("API에서 유효한 응답을 받지 못했습니다.");
    }
    addHistory(result);
    showOptimalResultModal(result);
  } catch (error) {
    alert(`계산 오류: ${error.message}`);
    console.error("Optimal combination calculation failed:", error);
  } finally {
    hideLoading();
  }
}

/**
 * 페이지 초기화 함수.
 * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
 */
export function init(container) {
  container.innerHTML = getHTML();

  const el = elements;
  el.container = container;
  el.bondCategoryTabs = container.querySelector("#bondCategoryTabs");
  el.spiritListContainer = container.querySelector("#spiritListContainer");
  el.selectedSpiritsList = container.querySelector("#selectedSpiritsList");
  el.selectedCount = container.querySelector("#selectedCount");
  el.selectAllBtn = container.querySelector("#selectAllBtn");
  el.clearAllSelectionBtn = container.querySelector("#clearAllSelectionBtn");
  el.batchLevelInput = container.querySelector("#batchLevelInput");
  el.applyBatchLevelBtn = container.querySelector("#applyBatchLevelBtn");
  el.findOptimalBtn = container.querySelector("#findOptimalBtn");
  el.influenceToggle = container.querySelector("#influenceToggle");

  loadStateFromStorage();

  container.querySelectorAll(".sub-tabs .tab").forEach((tab) => {
    tab.classList.toggle(
      "active",
      tab.dataset.category === pageState.currentCategory
    );
  });
  elements.influenceToggle.checked = pageState.groupByInfluence;

  setupEventListeners();
  initStatFilter();
  renderAll();
  console.log("환수 결속 페이지 초기화 완료.");
}

/**
 * 페이지 정리 함수.
 */
export function cleanup() {
  if (elements.container) {
    elements.container.removeEventListener("click", handleContainerClick);
  }
  if (elements.influenceToggle) {
    elements.influenceToggle.removeEventListener("change", handleToggleChange);
  }
  if (elements.selectedSpiritsList) {
    elements.selectedSpiritsList.removeEventListener(
      "input",
      handleLevelInputChange
    );
  }
  if (elements.selectAllBtn) {
    elements.selectAllBtn.removeEventListener("click", handleSelectAll);
  }
  if (elements.clearAllSelectionBtn) {
    elements.clearAllSelectionBtn.removeEventListener(
      "click",
      handleClearSelection
    );
  }
  console.log("환수 결속 페이지 정리 완료.");
}
