// js/api.js

// 백엔드 API의 기본 URL
// const BASE_URL = "http://localhost:8080"; // 로컬 테스트용
const BASE_URL =
  "https://wind-app-backend-462093198351.asia-northeast3.run.app"; // 배포용

// 모듈 스코프 메모리 캐시 (fetchRankings에서 사용)
const memoryCache = {};

/**
 * 이미지 경로를 'images/'에서 'assets/img/'로 변환하는 헬퍼 함수.
 * @param {object} spirit - image 속성을 가진 환수 객체
 * @returns {object} 경로가 변환된 환수 객체 또는 원본 (새로운 객체 반환)
 */
function _transformSpiritImagePath(spirit) {
  if (spirit && typeof spirit.image === "string") {
    // 'images/'로 시작하는 경우에만 'assets/img/'로 변경
    const transformedImage = spirit.image.replace(/^images\//, "assets/img/");
    return { ...spirit, image: transformedImage }; // 새로운 객체 반환
  }
  return spirit; // 이미지가 없거나 문자열이 아니면 원본 반환
}

/**
 * 스피릿 객체 배열에 대한 이미지 경로 변환 헬퍼 함수.
 * @param {Array<object>} spiritsArray - 환수 객체 배열
 * @returns {Array<object>} 경로가 변환된 환수 객체 배열 (새로운 배열 반환)
 */
function _transformSpiritsArrayPaths(spiritsArray) {
  if (!Array.isArray(spiritsArray)) {
    return spiritsArray;
  }
  return spiritsArray.map(_transformSpiritImagePath);
}

/**
 * Fetch 응답을 처리하고 JSON으로 파싱합니다.
 * @param {Response} response - Fetch API 응답 객체
 * @returns {Promise<any>} 파싱된 JSON 데이터
 * @throws {Error} 응답이 성공적이지 않을 경우
 */
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "서버 응답을 읽을 수 없습니다." }));
    console.error(
      `API Error ${response.status}:`,
      errorData.error || response.statusText,
      errorData
    );
    throw new Error(errorData.error || `서버 오류: ${response.statusText}`);
  }
  return response.json();
}

/**
 * sessionStorage를 이용한 캐싱 기능이 포함된 fetch 헬퍼 함수.
 * 주로 변경 빈도가 낮고, 세션 내에서만 유지되면 되는 데이터에 적합합니다.
 * 이미지 경로 변환을 포함합니다.
 * @param {string} key - 캐시를 위한 sessionStorage 키
 * @param {string} url - fetch를 요청할 URL
 * @param {boolean} [shouldTransformSpirits=false] - 응답에 spirits 데이터가 포함되어 이미지 경로 변환이 필요한지 여부
 * @returns {Promise<any>}
 */
async function fetchWithSessionCache(key, url, shouldTransformSpirits = false) {
  const cachedItem = sessionStorage.getItem(key);
  if (cachedItem) {
    try {
      console.log(`[Cache] Using sessionStorage cached data for key: ${key}`);
      return JSON.parse(cachedItem);
    } catch (e) {
      console.error(
        `[Cache Error] Failed to parse sessionStorage data for ${key}, fetching fresh.`,
        e
      );
      sessionStorage.removeItem(key); // 손상된 데이터, 삭제
    }
  }

  const response = await fetch(url);
  const rawData = await handleResponse(response);

  let processedData = rawData;
  // fetchAllSpirits의 경우 rawData 자체가 spirits 배열이므로 직접 변환
  if (shouldTransformSpirits && Array.isArray(rawData)) {
    processedData = _transformSpiritsArrayPaths(rawData);
  }
  // 다른 데이터 (예: chakData, soulExpTable)는 spirits 배열을 포함하지 않으므로 추가 변환 없음

  try {
    sessionStorage.setItem(key, JSON.stringify(processedData));
  } catch (e) {
    console.error(
      `[Cache Error] Failed to save to sessionStorage for ${key}:`,
      e
    );
  }

  return processedData;
}

/**
 * 인메모리 캐싱 기능이 포함된 fetch 헬퍼 함수.
 * 주로 용량이 크거나, 페이지 전환 시에도 빠르게 접근해야 하지만
 * sessionStorage에 저장하기에는 부담이 있는 데이터에 적합합니다.
 * 이미지 경로 변환을 포함합니다.
 * @param {string} key - 캐시를 위한 모듈 내 memoryCache 키
 * @param {string} url - fetch를 요청할 URL
 * @returns {Promise<any>}
 */
async function fetchWithMemoryCache(key, url) {
  if (memoryCache[key]) {
    console.log(`[Cache] Using memory cached data for key: ${key}`);
    return memoryCache[key];
  }

  const response = await fetch(url);
  const rawData = await handleResponse(response);

  // 랭킹 데이터는 특정 구조를 가지므로 여기서 변환 로직을 포함
  // rawData의 깊은 복사본을 만들어 원본 객체가 캐시되거나 다른 곳에서 변경되지 않도록 함
  let transformedData = JSON.parse(JSON.stringify(rawData)); // <--- 깊은 복사

  if (key.includes("/api/rankings")) {
    if (Array.isArray(transformedData.rankings)) {
      const type = key.includes("type=bond")
        ? "bond"
        : key.includes("type=stat")
        ? "stat"
        : null;

      if (type === "bond") {
        // 결속 랭킹: 각 랭킹 항목 안에 spirits 배열이 있음
        transformedData.rankings = transformedData.rankings.map(
          (rankingItem) => {
            let item = rankingItem; // 이미 깊은 복사되었으므로 추가 복사 불필요
            if (Array.isArray(item.spirits)) {
              item.spirits = _transformSpiritsArrayPaths(item.spirits);
            }
            // 백엔드 응답이 bindStat이라면 bindStats로 통일
            // resultModal이 bindStats를 기대하므로, bindStat이 있으면 복사
            if (item.bindStat !== undefined && item.bindStats === undefined) {
              item.bindStats = item.bindStat;
              // delete item.bindStat; // 원본 데이터에서 삭제하지 않도록 주의 (현재는 깊은 복사이므로 안전)
            }
            return item;
          }
        );
      } else if (type === "stat") {
        // 능력치 랭킹: 각 랭킹 항목 자체에 image 필드가 있음
        transformedData.rankings = _transformSpiritsArrayPaths(
          transformedData.rankings
        );
      }
    }
  }

  memoryCache[key] = transformedData; // 변환된 데이터를 메모리 캐시에 저장
  return transformedData;
}

// --- 실제 API 호출 함수들 ---

/**
 * 모든 환수 데이터를 가져옵니다. 초기 로딩 시 사용됩니다.
 * @returns {Promise<Array<object>>} 모든 환수 데이터 배열
 */
export async function fetchAllSpirits() {
  // fetchWithSessionCache 내부에서 rawData가 배열이면 이미지 경로를 변환하도록 지시 (true)
  // key를 "allSpiritsData"로 명시하여 캐시 관리
  return fetchWithSessionCache(
    "allSpiritsData",
    `${BASE_URL}/api/alldata`,
    true
  );
}

/**
 * 최적 결속 조합을 계산합니다.
 * @param {Array<object>} creatures - 계산할 환수 목록 (이름, 레벨 포함)
 * @returns {Promise<object>} 최적 조합 결과
 */
export async function calculateOptimalCombination(creatures) {
  const response = await fetch(`${BASE_URL}/api/calculate/bond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatures }),
  });
  const result = await handleResponse(response);
  // 백엔드에서 받아온 조합 결과의 spirits 배열 경로 변환
  if (result && Array.isArray(result.spirits)) {
    result.spirits = _transformSpiritsArrayPaths(result.spirits);
  }
  return result;
}

/**
 * 랭킹 데이터를 가져옵니다.
 * @param {string} category - 환수 종류 (수호, 탑승, 변신)
 * @param {string} type - 랭킹 종류 (bond, stat)
 * @param {string} [statKey=""] - 능력치 랭킹일 경우 스탯 키
 * @returns {Promise<object>} 랭킹 데이터
 */
export async function fetchRankings(category, type, statKey = "") {
  let url = `${BASE_URL}/api/rankings?category=${encodeURIComponent(
    category
  )}&type=${encodeURIComponent(type)}`;
  if (type === "stat" && statKey) {
    url += `&statKey=${encodeURIComponent(statKey)}`;
  }
  // 랭킹 데이터는 용량이 크므로 페이지 내 메모리 캐시를 사용
  // fetchWithMemoryCache 내부에서 이미 랭킹 데이터에 대한 이미지 경로 변환이 일어납니다.
  return fetchWithMemoryCache(url, url);
}

/**
 * 환수혼 경험치 테이블을 가져옵니다.
 * @returns {Promise<object>} 경험치 테이블 데이터
 */
export async function fetchSoulExpTable() {
  // 이 API 응답에는 spirits 데이터가 없으므로 변환은 필요 없습니다.
  return fetchWithSessionCache(
    "soulExpTable",
    `${BASE_URL}/api/soul/exp-table`
  );
}

/**
 * 환수혼 계산을 요청합니다.
 * @param {object} data - 계산에 필요한 데이터 (종류, 현재 레벨, 목표 레벨, 보유 환수혼 등)
 * @returns {Promise<object>} 계산 결과
 */
export async function calculateSoul(data) {
  const response = await fetch(`${BASE_URL}/api/calculate/soul`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * 착 데이터를 가져옵니다.
 * @returns {Promise<object>} 착 데이터
 */
export async function fetchChakData() {
  // 이 API 응답에는 spirits 데이터가 없으므로 변환은 필요 없습니다.
  return fetchWithSessionCache("chakData", `${BASE_URL}/api/chak/data`);
}

/**
 * 착 능력치 계산을 요청합니다.
 * @param {object} data - 계산에 필요한 데이터 (스탯 상태, 보유 자원 등)
 * @returns {Promise<object>} 계산 결과
 */
export async function calculateChak(data) {
  const response = await fetch(`${BASE_URL}/api/calculate/chak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}
