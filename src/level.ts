import { SCORE_THRESHOLDS } from './config.js';

export function getLevelConfig(score, RND, MAX, FLR) {
  let t = 'normal', r = RND(), c = 1, icy = false, forceSubIcy = false;
  let isFinalStairs = (score >= SCORE_THRESHOLDS.FINAL_STAIRS);
  let isDarkBeforeFinal = (score >= SCORE_THRESHOLDS.DARK_PRE && score < SCORE_THRESHOLDS.FINAL_STAIRS);

  if (isFinalStairs) {
    icy = true;
  } else if (isDarkBeforeFinal) {
    icy = true;
  } else if (score < SCORE_THRESHOLDS.EASY) {
    c = RND() < 0.25 ? MAX(2, 3 - FLR(score / 6000)) : 1;
    if (r < 0.10) t = 'super';
  } else if (score < SCORE_THRESHOLDS.MEDIUM) {
    if (r < 0.15) t = 'super';
    else if (r < 0.30) t = 'h-slide';
    else if (r < 0.40) t = 'v-slide';
  } else if (score < SCORE_THRESHOLDS.UPPER_MEDIUM) {
    if (r < 0.40) t = 'super';
    else if (r < 0.60) t = 'h-slide';
    else if (r < 0.70) t = 'v-slide';
  } else if (score < SCORE_THRESHOLDS.MID_HIGH) {
    if (score >= 60000 && r < 0.20) forceSubIcy = true;
    let r2 = RND();
    if (r2 < 0.05) t = 'super';
    else if (r2 < 0.25) t = 'h-slide';
  } else if (score <= SCORE_THRESHOLDS.HIGH) {
    if (r < 0.25) forceSubIcy = true;
    if (RND() < 0.15) t = 'h-slide';
  } else if (score <= SCORE_THRESHOLDS.VERY_HIGH) {
    icy = r < 0.25;
    if (!icy && RND() < 0.15) t = 'h-slide';
  } else if (score < SCORE_THRESHOLDS.METEOR_END) {
    icy = r < 0.15;
    if (!icy && RND() < 0.15) t = 'h-slide';
  } else if (score < SCORE_THRESHOLDS.DARK_PRE) {
    icy = r < 0.35;
    let r2 = RND();
    if (!icy) {
      if (r2 < 0.40) t = 'h-slide';
      else if (r2 < 0.60) t = 'v-slide';
    }
  }

  if (icy) t = 'normal';
  if (t === 'super') c = 1;

  let genSub = false, subIcy = false, subT = 'normal', subC = 1;
  if (score < SCORE_THRESHOLDS.EASY && t !== 'super') {
    genSub = true;
    subC = MAX(1, c);
  } else if (score < SCORE_THRESHOLDS.MEDIUM && t !== 'super') {
    let mediumSpan = SCORE_THRESHOLDS.MEDIUM - SCORE_THRESHOLDS.EASY;
    if (RND() < (1 - (score - SCORE_THRESHOLDS.EASY) / mediumSpan) * 0.7) {
      genSub = true;
      subC = MAX(1, c - 1);
    }
  } else if (score >= SCORE_THRESHOLDS.MID_HIGH && score <= SCORE_THRESHOLDS.VERY_HIGH && t !== 'super') {
    if (RND() < 0.7) {
      genSub = true;
      subC = 1;
      subIcy = RND() < 0.5;
    }
  } else if (isDarkBeforeFinal) {
    if (RND() < 0.40) {
      genSub = true;
      subIcy = true;
    }
  }
  if (forceSubIcy && t !== 'super') {
    genSub = true;
    subIcy = true;
  }

  return { t, c, icy, genSub, subIcy, subT, subC };
}
