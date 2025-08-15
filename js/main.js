import * as api from "./api.js";
import { setAllSpirits } from "./state.js";
import { showLoading, hideLoading } from "./loadingIndicator.js";

// 페이지 모듈들을 맵으로 관리
const pageModules = {
  spiritInfo: () => import("./pages/spiritInfo.js"),
  bondCalculator: () => import("./pages/bondCalculator.js"),
  spiritRanking: () => import("./pages/spiritRanking.js"),
  soulCalculator: () => import("./pages/soulCalculator.js"),
  chakCalculator: () => import("./pages/chakCalculator.js"),
};

const appContainer = document.getElementById("app-container");
const mainTabs = document.getElementById("mainTabs");
let currentPageModule = null; // 현재 활성화된 페이지 모듈을 추적

// [Help Tooltip 관련 DOM 요소 참조 및 이벤트 리스너 추가 시작]
const helpBtn = document.getElementById("helpBtn");
const helpTooltip = document.getElementById("helpTooltip");
const closeHelpBtn = document.getElementById("closeHelp");
const currentHelpTitle = document.getElementById("currentHelpTitle");
const pageSpecificHelpContent = document.getElementById(
  "pageSpecificHelpContent"
);
// REMOVED: const generalHelpSection = document.getElementById("generalHelpSection"); // '환수 표시 안내' 섹션

// 도움말 버튼 클릭 시 토글 (모달 표시/숨김)
if (
  helpBtn &&
  helpTooltip &&
  closeHelpBtn &&
  currentHelpTitle &&
  pageSpecificHelpContent
) {
  helpBtn.addEventListener("click", (event) => {
    event.stopPropagation(); // 버튼 클릭이 문서 클릭 이벤트로 전파되는 것 방지
    helpTooltip.style.display =
      helpTooltip.style.display === "block" ? "none" : "block";
    // 모달이 열릴 때 배경 스크롤 방지, 닫힐 때 복원
    document.body.style.overflow =
      helpTooltip.style.display === "block" ? "hidden" : "auto";
  });

  // 닫기 버튼 클릭 시 숨김
  closeHelpBtn.addEventListener("click", (event) => {
    event.stopPropagation(); // 버튼 클릭이 문서 클릭 이벤트로 전파되는 것 방지
    helpTooltip.style.display = "none";
    document.body.style.overflow = "auto"; // 배경 스크롤 복원
  });

  // 모달 외부 클릭 시 닫기
  document.addEventListener("click", (event) => {
    if (
      !helpBtn.contains(event.target) &&
      !helpTooltip.contains(event.target)
    ) {
      if (helpTooltip.style.display === "block") {
        helpTooltip.style.display = "none";
        document.body.style.overflow = "auto"; // 배경 스크롤 복원
      }
    }
  });
} else {
  console.error(
    "Help button or related tooltip elements not found in DOM for initialization."
  );
}
// [Help Tooltip 관련 DOM 요소 참조 및 이벤트 리스너 추가 종료]

/**
 * 라우팅을 처리하고 새 페이지를 로드 및 렌더링합니다.
 */
async function route() {
  const activeTab = mainTabs.querySelector(".tab.active");
  const pageName = activeTab ? activeTab.dataset.page : "spiritInfo";
  const pageTitle = activeTab ? activeTab.textContent : "환수 정보";

  // 이전 페이지 모듈이 있다면 정리 함수 실행
  if (currentPageModule?.cleanup) {
    try {
      currentPageModule.cleanup();
      console.log(`[Router] Cleaned up previous page.`);
    } catch (e) {
      console.error("[Router] Error during page cleanup:", e);
    }
  }

  // 페이지 컨테이너 비우기
  appContainer.innerHTML = "";
  // 새 페이지 로딩 시작 시 로딩 인디케이터 표시
  showLoading(
    appContainer,
    "페이지 로딩 중...",
    "필요한 모듈을 불러오고 있습니다..."
  );

  try {
    const moduleLoader = pageModules[pageName];
    if (!moduleLoader) {
      throw new Error(`'${pageName}' 페이지를 찾을 수 없습니다.`);
    }

    // 동적으로 페이지 모듈 로드
    const pageModule = await moduleLoader();
    currentPageModule = pageModule;

    // 페이지 초기화 함수 실행
    if (pageModule.init) {
      await pageModule.init(appContainer);
      console.log(`[Router] Initialized page: ${pageName}`);

      // [Help Tooltip Content 업데이트 시작]
      // 현재 페이지의 도움말 제목 설정
      if (currentHelpTitle && pageSpecificHelpContent) {
        // 안전하게 요소 존재 확인
        currentHelpTitle.textContent = `${pageTitle} 도움말`;

        if (pageModule.getHelpContentHTML) {
          pageSpecificHelpContent.innerHTML = pageModule.getHelpContentHTML();
        } else {
          pageSpecificHelpContent.innerHTML = `<div class="content-block"><p class="text-center text-light mt-md">이 페이지에 대한 특정 도움말은 없습니다.</p></div>`;
        }
        // REMOVED: generalHelpSection.style.display 로직 제거 (이제 이 섹션이 없음)
      } else {
        console.error(
          "Help tooltip specific content elements not found for update within route()."
        );
      }
      // [Help Tooltip Content 업데이트 종료]

      // [GA4 페이지 뷰 이벤트 수동 전송 및 웹사이트 타이틀 동적 변경]
      if (typeof gtag === "function") {
        const pagePath = `/bayeon-hwayeon/${pageName}`;
        document.title = `바연화연 | ${pageTitle}`;

        gtag("event", "page_view", {
          page_title: pageTitle,
          page_path: pagePath,
        });
        console.log(`[GA4] Page view event sent for: ${pagePath}`);
      }
    } else {
      console.warn(
        `Page module '${pageName}' does not have an init() function.`
      );
      appContainer.innerHTML = `<p class="error-message">페이지를 초기화할 수 없습니다. (init 함수 없음)</p>`;
    }
  } catch (error) {
    console.error(
      `[Router] Failed to load or initialize page '${pageName}':`,
      error
    );
    appContainer.innerHTML = `<p class="error-message">페이지를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
  } finally {
    hideLoading(); // 로딩 성공/실패와 관계없이 로딩 인디케이터 숨김
  }
}

// 메인 탭 클릭 이벤트 리스너
mainTabs.addEventListener("click", (e) => {
  if (e.target.matches(".tab") && !e.target.classList.contains("active")) {
    mainTabs.querySelector(".tab.active")?.classList.remove("active");
    e.target.classList.add("active");
    route();
  }
});

/**
 * 애플리케이션 초기화 (최초 데이터 로드 및 초기 페이지 렌더링)
 */
async function initializeApp() {
  showLoading(
    appContainer,
    "초기 데이터 로딩 중",
    "서버에서 환수 정보를 불러오고 있습니다..."
  );

  try {
    const allSpiritsRaw = await api.fetchAllSpirits();

    const allSpiritsTransformed = allSpiritsRaw.map((spirit) => {
      const transformedImage = spirit.image.replace(/^images\//, "assets/img/");
      return {
        ...spirit,
        image: transformedImage,
      };
    });
    setAllSpirits(allSpiritsTransformed);

    await route();
  } catch (error) {
    console.error("애플리케이션 초기화 실패:", error);
    appContainer.innerHTML = `<p class="error-message">애플리케이션 초기화 실패: 데이터를 불러오는 데 실패했습니다. (${error.message})</p>`;
  } finally {
    hideLoading();
  }
}

// 애플리케이션 시작
initializeApp();
