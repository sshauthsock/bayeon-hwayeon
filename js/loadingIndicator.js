const styleId = "loading-indicator-style";
let loadingOverlay = null;

function initStyles() {
  // Styles are injected only once to avoid duplicates
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
        .loading-overlay {
            position: absolute; /* Changed from fixed to absolute for #app-container */
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(255, 255, 255, 0.8);
            display: flex; justify-content: center; align-items: center;
            z-index: 10000; backdrop-filter: blur(4px);
            opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s;
        }
        .loading-overlay.visible { opacity: 1; visibility: visible; }
        .loading-container {
            background-color: #ffffff; border-radius: 15px; padding: 30px;
            text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            max-width: 400px; width: 90%;
        }
        .loading-spinner {
            border: 5px solid #e0e0e0; width: 60px; height: 60px;
            border-radius: 50%; border-top-color: #3498db;
            margin: 0 auto 20px; animation: spin 1.2s linear infinite;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .loading-text { margin: 15px 0; color: #333; font-size: 20px; font-weight: bold; }
        .loading-subtext { color: #666; font-size: 14px; margin-bottom: 5px; }
    `;
  document.head.appendChild(style);
}

/**
 * 로딩 인디케이터를 지정된 컨테이너 내부에 표시합니다.
 * @param {HTMLElement} container - 로딩 인디케이터를 추가할 부모 DOM 요소
 * @param {string} text - 로딩 메시지
 * @param {string} subText - 보조 로딩 메시지
 */
export function showLoading(
  container,
  text = "처리 중...",
  subText = "잠시만 기다려주세요."
) {
  if (!container) {
    console.warn("Loading indicator container not provided.");
    return;
  }

  // 기존 로딩 오버레이가 있다면 제거하여 중복 생성 방지
  if (loadingOverlay) {
    loadingOverlay.remove();
    loadingOverlay = null;
  }

  initStyles(); // 스타일이 주입되었는지 확인

  loadingOverlay = document.createElement("div");
  loadingOverlay.className = "loading-overlay";
  loadingOverlay.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
            <div class="loading-subtext">${subText}</div>
        </div>
    `;
  container.style.position = "relative"; // 부모 컨테이너의 position이 relative여야 absolute 자식이 제대로 작동
  container.appendChild(loadingOverlay);

  // requestAnimationFrame을 사용하여 DOM이 완전히 추가된 후 클래스 추가
  requestAnimationFrame(() => {
    loadingOverlay?.classList.add("visible");
  });
}

/**
 * 로딩 인디케이터를 숨기고 DOM에서 제거합니다.
 */
export function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove("visible");
    // 트랜지션이 끝난 후 요소를 제거하여 부드러운 전환을 보장
    // 하지만 "무한 로딩" 문제 해결을 위해 즉시 제거하도록 요구되었으므로, 트랜지션 대기하지 않음
    loadingOverlay.remove();
    loadingOverlay = null;
  }
}
