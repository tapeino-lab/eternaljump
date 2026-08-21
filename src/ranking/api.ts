export const RankingAPI: any = {
  key: 'EternalJumper_Rankings',
  pbKey: 'EternalJumper_PB',
  taPbKey: "8bitJump_TAPB",
  // @ts-ignore
  version: `v${import.meta.env.VITE_APP_VERSION}`,
  isShowingResult: false,
  openedFromLangStats: false,
  prefetchedScoresPromise: null,
  syncPersonalBestPromise: null
};
