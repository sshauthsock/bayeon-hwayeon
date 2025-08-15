// 모든 페이지에서 공유하는 전역 상태
export const state = {
  allSpirits: [], // 서버에서 받아온 모든 환수 원본 데이터
  currentPageModule: null, // 현재 활성화된 페이지 모듈
};

// 상태를 변경하는 함수 (Mutation)
export function setAllSpirits(spirits) {
  state.allSpirits = spirits;
}
