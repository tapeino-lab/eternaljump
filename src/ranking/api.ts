export const RankingAPI: any = {
  key: 'EternalJumper_Rankings',
  pbKey: 'EternalJumper_PB',
  // @ts-ignore
  version: `v${import.meta.env.VITE_APP_VERSION}`,
  isShowingResult: false,
  prefetchedScoresPromise: null,
  syncPersonalBestPromise: null
};
