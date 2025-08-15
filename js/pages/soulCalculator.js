import { createElement } from "../utils.js";
import { showLoading, hideLoading } from "../loadingIndicator.js";
import * as api from "../api.js";

const pageState = {
  expTable: null, // 서버에서 불러온 경험치 테이블
  currentType: "legend", // 현재 선택된 환수혼 종류 (전설/불멸)
  currentLevel: 0, // 현재 레벨
  targetLevel: 1, // 목표 레벨
  souls: { high: 0, mid: 0, low: 0 }, // 보유 환수혼 개수
};
const elements = {}; // DOM 요소 참조를 저장할 객체

/**
 * 페이지의 기본 HTML 구조를 반환합니다.
 */
function getHTML() {
  return `
    <div class="container soul-container">
      <div class="left card">
        <h3>환수 성장 경험치 테이블</h3>
        <div class="exp-type-tabs">
          <div class="exp-tab active" data-type="legend">전설</div>
          <div class="exp-tab" data-type="immortal">불멸</div>
        </div>
        <div class="tables-container">
          <div class="table-half">
            <table>
              <thead><tr><th>Lv</th><th>경험치</th></tr></thead>
              <tbody id="expTableLeft"></tbody>
            </table>
          </div>
          <div class="table-half">
            <table>
              <thead><tr><th>Lv</th><th>경험치</th></tr></thead>
              <tbody id="expTableRight"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="right card">
        <h2>환수혼 계산기</h2>
        <div class="calculator-form">
          <div class="input-row">
            <div class="input-group type-select">
              <label>종류:</label>
              <select id="expType" class="form-control">
                <option value="legend">전설</option>
                <option value="immortal">불멸</option>
              </select>
            </div>
            <div class="input-group">
              <label>현재:</label>
              <input type="number" id="currentLevel" min="0" max="24" value="0" class="form-control">
            </div>
            <div class="input-group">
              <label>목표:</label>
              <input type="number" id="targetLevel" min="1" max="25" value="1" class="form-control"> <!-- max="25" 확인 -->
            </div>
          </div>
          <div class="soul-panel">
            <div class="soul-item">
              <img src="assets/img/high-soul.jpg" alt="최상급">
              <label>최상급 (1000)</label>
              <input type="number" id="highSoul" min="0" value="0" class="form-control">
            </div>
            <div class="soul-item">
              <img src="assets/img/mid-soul.jpg" alt="상급 (100)">
              <label>상급 (100)</label>
              <input type="number" id="midSoul" min="0" value="0" class="form-control">
            </div>
            <div class="soul-item">
              <img src="assets/img/low-soul.jpg" alt="하급 (10)">
              <label>하급 (10)</label>
              <input type="number" id="lowSoul" min="0" value="0" class="form-control">
            </div>
          </div>
          <div class="calc-btn">
            <button id="calculateBtn" class="btn btn-primary">계산</button>
          </div>
        </div>
        <div class="results-panel hidden" id="resultsPanel">
        </div>
      </div>
    </div>
  `;
}

/**
 * 경험치 테이블을 렌더링합니다.
 */
function renderExpTable() {
  if (!pageState.expTable || !elements.expTableLeft || !elements.expTableRight)
    return;
  const expData = pageState.expTable[pageState.currentType];
  if (!expData) return;

  elements.expTableLeft.innerHTML = "";
  elements.expTableRight.innerHTML = "";

  // 경험치 테이블을 좌우 두 개의 테이블로 분할하여 렌더링
  expData.forEach((exp, lv) => {
    const row = createElement("tr", "", {
      html: `<td>${lv}</td><td>${exp.toLocaleString()}</td>`,
    });
    if (lv <= 13) {
      elements.expTableLeft.appendChild(row);
    } else {
      elements.expTableRight.appendChild(row);
    }
  });
  highlightTableRows(); // 현재 및 목표 레벨 강조
}

/**
 * 계산 결과를 패널에 렌더링합니다.
 * @param {object} result - 백엔드에서 반환된 계산 결과 객체
 */
function renderCalculationResult(result) {
  if (!result || !result.required || !result.maxLevelInfo) {
    elements.resultsPanel.innerHTML = `<p class="error-message">잘못된 계산 결과입니다.</p>`;
    elements.resultsPanel.classList.remove("hidden");
    return;
  }

  const { required, maxLevelInfo } = result;
  // 환수혼 종류에 대한 한글 이름
  const typeName =
    { legend: "전설", immortal: "불멸" }[pageState.currentType] || "알 수 없음";

  const formatNumber = (num) => (Number(num) || 0).toLocaleString(); // 숫자 포맷팅 헬퍼

  // 필요 환수혼 섹션 렌더링
  const requiredSectionHtml = createRequiredSoulsSection(
    required,
    typeName,
    formatNumber
  );
  // 도달 가능 레벨 섹션 렌더링
  const maxLevelSectionHtml = createMaxLevelInfoSection(
    maxLevelInfo,
    typeName,
    formatNumber
  );

  elements.resultsPanel.innerHTML = `
        <div class="result-column">
            ${requiredSectionHtml}
        </div>
        <div class="result-column">
            ${maxLevelSectionHtml}
        </div>
    `;
  elements.resultsPanel.classList.remove("hidden"); // 결과 패널 표시
}

/**
 * 필요 환수혼 섹션 HTML을 생성합니다.
 */
function createRequiredSoulsSection(required, typeName, formatNumber) {
  let neededHtml = "";
  if (!required.isSufficient && required.needed) {
    neededHtml = `
            <div class="sub-title">추가 필요 (최적 조합)</div>
            <div class="data-row"><span><img src="assets/img/high-soul.jpg" class="soul-icon">최상급</span><span class="data-value">${formatNumber(
              required.needed.high
            )}개</span></div>
            <div class="data-row"><span><img src="assets/img/mid-soul.jpg" class="soul-icon">상급</span><span class="data-value">${formatNumber(
              required.needed.mid
            )}개</span></div>
            <div class="data-row"><span><img src="assets/img/low-soul.jpg" class="soul-icon">하급</span><span class="data-value">${formatNumber(
              required.needed.low
            )}개</span></div>
        `;
  } else {
    neededHtml = `<div class="sub-title sufficient">보유한 환수혼으로 충분합니다!</div>`;
  }

  return `
        <div class="result-box">
            <div class="result-title required-title">필요 환수혼 <span class="type-badge">${typeName}</span></div>
            <div class="result-section">
                <div class="data-row">
                    <span>레벨 ${pageState.currentLevel} → ${
    pageState.targetLevel
  }</span>
                    <span class="data-value highlight">${formatNumber(
                      required.exp
                    )}exp</span>
                </div>
            </div>
            <div class="sub-title">총 필요 환수혼</div>
            <div class="data-row"><span><img src="assets/img/high-soul.jpg" class="soul-icon">최상급</span><span class="data-value">${formatNumber(
              required.souls.high
            )}개</span></div>
            <div class="data-row"><span><img src="assets/img/mid-soul.jpg" class="soul-icon">상급</span><span class="data-value">${formatNumber(
              required.souls.mid
            )}개</span></div>
            <div class="data-row"><span><img src="assets/img/low-soul.jpg" class="soul-icon">하급</span><span class="data-value">${formatNumber(
              required.souls.low
            )}개</span></div>
            ${neededHtml}
        </div>
    `;
}

/**
 * 도달 가능 레벨 섹션 HTML을 생성합니다.
 */
function createMaxLevelInfoSection(maxLevelInfo, typeName, formatNumber) {
  let maxLevelProgressHtml = "";
  // 최대 레벨이 아니면서 다음 레벨 경험치 정보가 있을 때만 진행도 표시
  if (
    maxLevelInfo.level < 25 &&
    maxLevelInfo.nextLevelExp !== undefined &&
    maxLevelInfo.nextLevelExp > 0
  ) {
    maxLevelProgressHtml = `
            <div class="data-row"><span>다음 레벨 진행도</span><span class="data-value">${
              maxLevelInfo.progressPercent || 0
            }%</span></div>
            <div class="data-row"><span>남은 경험치</span><span class="data-value">${formatNumber(
              maxLevelInfo.remainingExp
            )} / ${formatNumber(maxLevelInfo.nextLevelExp)}</span></div>
        `;
  } else if (maxLevelInfo.level === 25) {
    maxLevelProgressHtml = `<div class="data-row"><span class="sufficient">최대 레벨 (25) 달성 완료!</span></div>`;
  }

  const targetStatusHtml = maxLevelInfo.isTargetReachable
    ? `<span class="sufficient">목표 레벨 ${pageState.targetLevel} 달성 가능!</span>`
    : `<span class="insufficient">목표 레벨 ${
        pageState.targetLevel
      }까지 ${formatNumber(maxLevelInfo.expShortage)} 경험치 부족</span>`;

  return `
        <div class="result-box">
            <div class="result-title max-title">도달 가능 레벨 <span class="type-badge">${typeName}</span></div>
            <div class="result-section">
                <div class="data-row"><span>보유 환수혼</span><span class="data-value highlight">${formatNumber(
                  maxLevelInfo.ownedExp
                )}exp</span></div>
            </div>
            <div class="result-section">
                <div class="data-row"><span>최대 도달 레벨</span><span class="data-value highlight">${
                  maxLevelInfo.level
                }</span></div>
                ${maxLevelProgressHtml}
            </div>
            <div class="result-section">${targetStatusHtml}</div>
        </div>
    `;
}

/**
 * 경험치 테이블에서 현재 및 목표 레벨에 해당하는 행을 강조 표시합니다.
 */
function highlightTableRows() {
  if (!elements.container) return;
  const allRows = elements.container.querySelectorAll(
    "#expTableLeft tr, #expTableRight tr"
  );

  // 모든 강조 표시 제거
  allRows.forEach((row) =>
    row.classList.remove("current-level", "target-level")
  );

  const current = pageState.currentLevel;
  const target = pageState.targetLevel;

  // 인덱스를 사용하여 해당 레벨 행을 강조 표시
  // +1을 하는 이유는 경험치 테이블이 0레벨부터 시작하기 때문에, 테이블의 실제 행 인덱스와 맞추기 위함입니다.
  // 예를 들어, 0레벨은 첫 번째 행 (index 0), 1레벨은 두 번째 행 (index 1)에 해당합니다.
  // 이전에 `lv + 1`을 했다면 `current`와 `target`은 이미 표시하고자 하는 행 인덱스와 일치합니다.
  // 현재 코드는 `lv` (레벨 숫자)가 테이블의 `lv` 열과 직접 매핑되므로, 인덱스를 직접 사용합니다.
  if (allRows[current]) allRows[current].classList.add("current-level");
  if (allRows[target]) allRows[target].classList.add("target-level");
}

/**
 * 환수혼 종류(전설/불멸) 변경 이벤트를 처리합니다.
 */
function handleTypeChange(newType) {
  pageState.currentType = newType;
  elements.expType.value = newType; // 드롭다운 값 업데이트

  // 탭 활성화 상태 업데이트
  elements.container.querySelectorAll(".exp-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.type === newType);
  });

  renderExpTable(); // 테이블 재렌더링
  elements.resultsPanel.classList.add("hidden"); // 결과 패널 숨기기
}

/**
 * 입력 필드(현재 레벨, 목표 레벨)의 유효성을 검사하고 상태를 업데이트합니다.
 */
function validateInputs() {
  let current = parseInt(elements.currentLevel.value, 10);
  let target = parseInt(elements.targetLevel.value, 10);

  // 현재 레벨 유효성 검사
  if (isNaN(current) || current < 0) current = 0;
  if (current > 24) current = 24; // 최대 24레벨까지만 현재 레벨로 설정 가능

  // 목표 레벨 유효성 검사
  if (isNaN(target) || target < 1) target = 1;
  if (target > 25) target = 25; // 최대 25레벨까지만 목표 레벨로 설정 가능

  // 목표 레벨이 현재 레벨보다 작거나 같을 경우 조정
  if (target <= current) {
    target = current + 1;
    if (target > 25) target = 25; // 25를 초과하지 않도록
  }

  // DOM 값 업데이트 및 페이지 상태 업데이트
  elements.currentLevel.value = current;
  elements.targetLevel.value = target;

  pageState.currentLevel = current;
  pageState.targetLevel = target;
  highlightTableRows(); // 테이블 강조 업데이트
  elements.resultsPanel.classList.add("hidden"); // 결과 패널 숨기기
}

/**
 * 계산 버튼 클릭 이벤트를 처리하고 백엔드에 계산 요청을 보냅니다.
 */
async function handleCalculate() {
  validateInputs(); // 입력값 유효성 검사

  // 보유 환수혼 개수 상태 업데이트
  pageState.souls = {
    high: parseInt(elements.highSoul.value, 10) || 0,
    mid: parseInt(elements.midSoul.value, 10) || 0,
    low: parseInt(elements.lowSoul.value, 10) || 0,
  };

  // 계산 중 로딩 인디케이터 표시
  showLoading(
    elements.resultsPanel,
    "계산 중...",
    "환수혼 소모량을 계산하고 있습니다."
  );

  try {
    // 백엔드 API 호출
    const result = await api.calculateSoul({
      type: pageState.currentType,
      currentLevel: pageState.currentLevel,
      targetLevel: pageState.targetLevel,
      ownedSouls: pageState.souls,
    });
    renderCalculationResult(result); // 결과 렌더링
  } catch (error) {
    alert(`계산 오류: ${error.message}`);
    console.error("Soul calculation failed:", error);
    elements.resultsPanel.classList.add("hidden"); // 오류 발생 시 패널 숨김
  } finally {
    hideLoading(); // 로딩 인디케이터 숨김
  }
}

/**
 * 페이지의 모든 주요 이벤트 리스너를 설정합니다.
 */
function setupEventListeners() {
  // 환수혼 종류 드롭다운 변경 이벤트
  elements.expType.addEventListener("change", (e) =>
    handleTypeChange(e.target.value)
  );

  // 환수혼 종류 탭 클릭 이벤트
  elements.container.querySelectorAll(".exp-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      handleTypeChange(e.currentTarget.dataset.type);
    });
  });

  // 현재 레벨 및 목표 레벨 입력 변경 이벤트
  elements.currentLevel.addEventListener("change", validateInputs);
  elements.targetLevel.addEventListener("change", validateInputs);

  // 보유 환수혼 입력 변경 이벤트 (실시간 반영은 아니므로 change 이벤트만)
  elements.highSoul.addEventListener("change", handleCalculate);
  elements.midSoul.addEventListener("change", handleCalculate);
  elements.lowSoul.addEventListener("change", handleCalculate);

  // 계산 버튼 클릭 이벤트
  elements.calculateBtn.addEventListener("click", handleCalculate);
}

/**
 * 페이지 초기화 함수.
 * @param {HTMLElement} container - 페이지 내용이 렌더링될 DOM 요소
 */
export async function init(container) {
  container.innerHTML = getHTML(); // 페이지 HTML 삽입

  // DOM 요소 참조 저장
  elements.container = container;
  elements.expTableLeft = container.querySelector("#expTableLeft");
  elements.expTableRight = container.querySelector("#expTableRight");
  elements.expType = container.querySelector("#expType");
  elements.currentLevel = container.querySelector("#currentLevel");
  elements.targetLevel = container.querySelector("#targetLevel");
  elements.highSoul = container.querySelector("#highSoul");
  elements.midSoul = container.querySelector("#midSoul");
  elements.lowSoul = container.querySelector("#lowSoul");
  elements.calculateBtn = container.querySelector("#calculateBtn");
  elements.resultsPanel = container.querySelector("#resultsPanel");

  setupEventListeners(); // 이벤트 리스너 설정

  // 경험치 테이블 로드 및 렌더링
  showLoading(container, "경험치 테이블 로딩 중...");
  try {
    pageState.expTable = await api.fetchSoulExpTable();
    renderExpTable();
    validateInputs(); // 초기값으로 유효성 검사 및 하이라이트
  } catch (error) {
    console.error("Failed to load soul exp table:", error);
    container.innerHTML = `<p class="error-message">경험치 데이터를 불러오는 데 실패했습니다: ${error.message}</p>`;
  } finally {
    hideLoading();
  }

  console.log("환수혼 계산 페이지 초기화 완료.");
}

/**
 * 페이지 정리 함수.
 */
export function cleanup() {
  // 이벤트 리스너 제거
  if (elements.expType)
    elements.expType.removeEventListener("change", handleTypeChange);
  if (elements.container) {
    elements.container.querySelectorAll(".exp-tab").forEach((tab) => {
      tab.removeEventListener("click", handleTypeChange);
    });
  }
  if (elements.currentLevel)
    elements.currentLevel.removeEventListener("change", validateInputs);
  if (elements.targetLevel)
    elements.targetLevel.removeEventListener("change", validateInputs);
  if (elements.highSoul)
    elements.highSoul.removeEventListener("change", handleCalculate);
  if (elements.midSoul)
    elements.midSoul.removeEventListener("change", handleCalculate);
  if (elements.lowSoul)
    elements.lowSoul.removeEventListener("change", handleCalculate);
  if (elements.calculateBtn)
    elements.calculateBtn.removeEventListener("click", handleCalculate);

  console.log("환수혼 계산 페이지 정리 완료.");
}
