/**
 * 지정된 태그, 클래스, 속성을 가진 HTML 요소를 생성합니다.
 * @param {string} tag - 생성할 요소의 태그 이름
 * @param {string|Array<string>} className - 요소에 추가할 클래스 이름(들)
 * @param {object} attributes - 요소에 설정할 속성 (text, html, id, data-*, etc.)
 * @returns {HTMLElement} 생성된 HTML 요소
 */
export function createElement(tag, className, attributes = {}) {
  const element = document.createElement(tag);
  if (className) {
    if (Array.isArray(className)) {
      element.classList.add(...className);
    } else {
      element.className = className;
    }
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "text" || key === "textContent") {
      element.textContent = value;
    } else if (key === "html" || key === "innerHTML") {
      element.innerHTML = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  return element;
}

/**
 * 함수가 마지막으로 호출된 후 일정 시간이 지나면 실행되도록 하는 디바운스 함수입니다.
 * @param {Function} func - 디바운스할 함수
 * @param {number} wait - 대기 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
export function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * 환수의 등록/장착 효과가 25레벨까지 모두 있는지 확인합니다.
 * @param {object} spirit - 확인할 환수 데이터 객체 (spiritInfo.js의 SpiritInfo 타입)
 * @returns {{hasFullRegistration: boolean, hasFullBind: boolean, hasLevel25Bind: boolean}}
 */
export function checkSpiritStats(spirit) {
  if (!spirit || !Array.isArray(spirit.stats)) {
    return {
      hasFullRegistration: false,
      hasFullBind: false,
      hasLevel25Bind: false,
    };
  }
  const level25Stat = spirit.stats.find((s) => s.level === 25);

  const hasFullRegistration = !!(
    level25Stat?.registrationStat &&
    Object.keys(level25Stat.registrationStat).length > 0
  );
  const hasFullBind = !!(
    level25Stat?.bindStat && Object.keys(level25Stat.bindStat).length > 0
  );
  // 추가: 25레벨 장착 정보가 존재하는 경우 (오른쪽 상단 표시용)
  const hasLevel25Bind = hasFullBind;

  return { hasFullRegistration, hasFullBind, hasLevel25Bind };
}

/**
 * 특정 환수가 주어진 스탯 키에 해당하는 효과를 가지고 있는지 확인합니다.
 * 주로 필터링에 사용됩니다.
 * @param {object} item - 확인할 환수 데이터 객체
 * @param {string} statKey - 확인할 스탯의 키 (예: "damageResistancePenetration")
 * @returns {boolean} 해당 스탯 효과가 있다면 true, 없으면 false
 */
export function checkItemForStatEffect(item, statKey) {
  if (!item?.stats) return false;
  // 모든 레벨의 스탯을 확인하여 하나라도 해당 스탯 효과가 있는지 검사
  for (const stat of item.stats) {
    if (
      stat?.registrationStat?.[statKey] !== undefined ||
      stat?.bindStat?.[statKey] !== undefined
    ) {
      // 값이 0이더라도 키가 존재하면 효과가 있다고 간주
      return true;
    }
  }
  return false;
}

/**
 * 다음 달의 마지막 목요일을 계산하여 반환합니다.
 * (광고 로딩 시점 등 특정 날짜 기준 필요 시 사용 가능)
 * @returns {Date} 다음 달의 마지막 목요일 Date 객체
 */
export function getNextMonthLastThursday() {
  const now = new Date();
  // 다음 달 1일로 설정
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // 그 다음 달 1일에서 하루를 빼서 다음 달의 마지막 날을 구함
  const lastDayOfNextMonth = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  );

  let lastThursday = lastDayOfNextMonth;

  // 마지막 날부터 거꾸로 탐색하며 목요일(요일 인덱스 4)을 찾음
  while (lastThursday.getDay() !== 4) {
    lastThursday.setDate(lastThursday.getDate() - 1);
  }

  // 자정으로 시간 설정
  lastThursday.setHours(0, 0, 0, 0);

  return lastThursday;
}
