// const BASE_URL = "http://localhost:8080";
const BASE_URL =
  "https://wind-app-backend-462093198351.asia-northeast3.run.app";
// Module-scoped memory cache for larger datasets like rankings
const memoryCache = {};

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "서버 응답을 읽을 수 없습니다." }));
    // Log the full error response from the server if available
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
 * @param {string} key - 캐시를 위한 sessionStorage 키
 * @param {string} url - fetch를 요청할 URL
 * @returns {Promise<any>}
 */
async function fetchWithSessionCache(key, url) {
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
      sessionStorage.removeItem(key); // Corrupted data, clear it
    }
  }

  // console.log(`[API] Fetching fresh data for key: ${key} from ${url}`);
  const response = await fetch(url);
  const data = await handleResponse(response);

  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(
      `[Cache Error] Failed to save to sessionStorage for ${key}:`,
      e
    );
    // This could be due to quota exceed, consider implementing a fallback or warning
  }

  return data;
}

/**
 * 인메모리 캐싱 기능이 포함된 fetch 헬퍼 함수.
 * 주로 용량이 크거나, 페이지 전환 시에도 빠르게 접근해야 하지만
 * sessionStorage에 저장하기에는 부담이 있는 데이터에 적합합니다.
 * 세션이 끝나면 사라집니다.
 * @param {string} key - 캐시를 위한 모듈 내 memoryCache 키
 * @param {string} url - fetch를 요청할 URL
 * @returns {Promise<any>}
 */
async function fetchWithMemoryCache(key, url) {
  if (memoryCache[key]) {
    console.log(`[Cache] Using memory cached data for key: ${key}`);
    return memoryCache[key];
  }

  // console.log(`[API] Fetching fresh data for key: ${key} from ${url}`);
  const response = await fetch(url);
  const data = await handleResponse(response);

  memoryCache[key] = data; // Store in memory cache

  return data;
}

export async function fetchAllSpirits() {
  // allSpirits 데이터는 초기 로딩 시 한 번만 필요하므로, 캐시하지 않음
  // main.js에서 글로벌 state에 저장하므로 추가 캐싱 불필요
  const response = await fetch(`${BASE_URL}/api/alldata`);
  return handleResponse(response);
}

export async function calculateOptimalCombination(creatures) {
  const response = await fetch(`${BASE_URL}/api/calculate/bond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatures }),
  });
  return handleResponse(response);
}

export async function fetchRankings(category, type, statKey = "") {
  let url = `${BASE_URL}/api/rankings?category=${encodeURIComponent(
    category
  )}&type=${encodeURIComponent(type)}`;
  if (type === "stat" && statKey) {
    url += `&statKey=${encodeURIComponent(statKey)}`;
  }
  // 랭킹 데이터는 용량이 크므로 페이지 내 메모리 캐시를 사용
  // URL 자체가 캐시 키 역할을 하도록 합니다.
  return fetchWithMemoryCache(url, url);
}

export async function fetchSoulExpTable() {
  return fetchWithSessionCache(
    "soulExpTable",
    `${BASE_URL}/api/soul/exp-table`
  );
}

export async function calculateSoul(data) {
  const response = await fetch(`${BASE_URL}/api/calculate/soul`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export async function fetchChakData() {
  return fetchWithSessionCache("chakData", `${BASE_URL}/api/chak/data`);
}

export async function calculateChak(data) {
  const response = await fetch(`${BASE_URL}/api/calculate/chak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}
