// js/components/statFilter.js

import { createElement } from "../utils.js";
import { STATS_MAPPING } from "../constants.js";

/**
 * 스탯 필터 드롭다운 UI를 생성하고 관리합니다.
 * 이 컴포넌트는 환수 목록에서 특정 능력치로 필터링하는 기능을 제공합니다.
 *
 * @param {HTMLElement} container - 스탯 필터가 렌더링될 부모 DOM 요소.
 * @param {Array<object>} allSpirits - 전체 환수 데이터 (스탯 목록을 추출하기 위함).
 * @param {function} onFilterChange - 필터 값이 변경될 때 호출될 콜백 함수.
 *                                    선택된 스탯 키(string)를 인자로 받습니다 (필터 초기화 시에는 빈 문자열).
 * @returns {{statFilter: HTMLElement, clearBtn: HTMLElement, cleanup: function}}
 *          생성된 DOM 요소들의 참조와 컴포넌트를 정리(cleanup)하는 함수를 반환합니다.
 */
export function createStatFilter(container, allSpirits, onFilterChange) {
  // 필터 컨테이너 요소 생성
  const filterWrapper = createElement("div", "stat-filter-container");

  // 스탯 선택 드롭다운 (select) 요소 생성
  const statFilter = createElement("select", "stat-filter", {
    id: "statFilter", // ID 부여 (외부에서 참조 가능)
  });
  // 기본 옵션 (필터 없음) 추가
  statFilter.appendChild(
    createElement("option", "", { value: "", text: "능력치 필터" })
  );

  // 필터 초기화 버튼 생성
  const clearBtn = createElement("button", "clear-filter-btn", {
    text: "초기화",
  });
  clearBtn.style.display = "none"; // 초기에는 이 버튼을 숨깁니다.

  // 모든 환수 데이터를 기반으로 가능한 모든 스탯 옵션을 드롭다운에 채웁니다.
  populateStatOptions(statFilter, allSpirits);

  // --- 이벤트 리스너 정의 및 부착 ---

  // 스탯 필터 드롭다운 변경 시 실행될 핸들러
  const handleFilterChange = function () {
    const selectedStat = this.value; // 현재 선택된 값 (스탯 키)
    // 선택된 스탯이 있으면 초기화 버튼을 표시하고, 없으면 숨깁니다.
    clearBtn.style.display = selectedStat ? "block" : "none";
    // 상위 컴포넌트에 변경된 필터 값 알림
    onFilterChange(selectedStat);
  };

  // 초기화 버튼 클릭 시 실행될 핸들러
  const handleClearClick = () => {
    statFilter.value = ""; // 드롭다운 값을 기본 옵션으로 초기화
    clearBtn.style.display = "none"; // 초기화 버튼 숨김
    // 상위 컴포넌트에 필터가 초기화되었음을 알림
    onFilterChange("");
  };

  // 이벤트 리스너 부착
  statFilter.addEventListener("change", handleFilterChange);
  clearBtn.addEventListener("click", handleClearClick);

  // 생성된 요소들을 필터 컨테이너에 추가하고, 필터 컨테이너를 부모 컨테이너에 추가
  filterWrapper.append(statFilter, clearBtn);
  container.appendChild(filterWrapper);

  // --- 컴포넌트 정리 함수 ---
  // 페이지 전환 시 메모리 누수를 방지하기 위해 이벤트 리스너와 DOM 요소를 제거하는 함수를 반환합니다.
  const cleanup = () => {
    statFilter.removeEventListener("change", handleFilterChange);
    clearBtn.removeEventListener("click", handleClearClick);
    filterWrapper.remove(); // DOM에서 필터 전체 요소 제거
  };

  // 외부에서 컴포넌트의 DOM 요소와 정리 함수를 사용할 수 있도록 반환
  return { statFilter, clearBtn, cleanup };
}

/**
 * 주어진 `<select>` 요소에 모든 가능한 스탯 옵션을 채웁니다.
 * 이 함수는 `allSpirits` 데이터를 분석하여 등록 및 장착 효과에 존재하는 모든 스탯 키를 수집합니다.
 *
 * @param {HTMLElement} selectElement - 옵션을 추가할 `<select>` HTML 요소.
 * @param {Array<object>} spirits - 모든 환수 데이터 배열.
 */
function populateStatOptions(selectElement, spirits) {
  const allStats = new Set(); // 중복 없이 스탯 키를 저장하기 위한 Set

  // 모든 환수와 그들의 스탯을 순회합니다.
  spirits.forEach((s) =>
    s.stats.forEach((stat) => {
      // 장착 효과 스탯 수집
      if (stat.bindStat) {
        Object.keys(stat.bindStat).forEach((key) => allStats.add(key));
      }
      // 등록 효과 스탯 수집
      if (stat.registrationStat) {
        Object.keys(stat.registrationStat).forEach((key) => allStats.add(key));
      }
    })
  );

  // 수집된 스탯 키를 알파벳 순으로 정렬한 후 `<option>` 요소로 변환하여 `<select>`에 추가합니다.
  [...allStats].sort().forEach((key) =>
    selectElement.appendChild(
      createElement("option", "", {
        value: key, // 옵션의 실제 값 (스탯 키)
        text: STATS_MAPPING[key] || key, // 사용자에게 보여줄 텍스트 (한글 이름 또는 영어 키)
      })
    )
  );
}
