export function getLevelConfig(score, RND, MAX, FLR) {
  let t = 'normal', r = RND(), c = 1, icy = false, forceSubIcy = false;
  let isFinalStairs = (score >= 140000);
  let isDarkBeforeFinal = (score >= 135000 && score < 140000);

  if (isFinalStairs) {
    icy = true;
  } else if (isDarkBeforeFinal) {
    icy = true;
  } else if (score < 20000) {
    c = RND() < 0.25 ? MAX(2, 3 - FLR(score / 6000)) : 1;
    if (r < 0.10) t = 'super';
  } else if (score < 52000) {
    if (r < 0.15) t = 'super';
    else if (r < 0.30) t = 'h-slide';
    else if (r < 0.40) t = 'v-slide';
  } else if (score < 55000) {
    if (r < 0.40) t = 'super';
    else if (r < 0.60) t = 'h-slide';
    else if (r < 0.70) t = 'v-slide';
  } else if (score < 80000) {
    if (score >= 60000 && r < 0.20) forceSubIcy = true;
    let r2 = RND();
    if (r2 < 0.05) t = 'super';
    else if (r2 < 0.25) t = 'h-slide';
  } else if (score <= 100000) {
    if (r < 0.25) forceSubIcy = true;
    if (RND() < 0.15) t = 'h-slide';
  } else if (score <= 105000) {
    icy = r < 0.25;
    if (!icy && RND() < 0.15) t = 'h-slide';
  } else if (score < 120000) {
    icy = r < 0.15;
    if (!icy && RND() < 0.15) t = 'h-slide';
  } else if (score < 135000) {
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
  if (score < 20000 && t !== 'super') {
    genSub = true;
    subC = MAX(1, c);
  } else if (score < 52000 && t !== 'super') {
    if (RND() < (1 - (score - 20000) / 32000) * 0.7) {
      genSub = true;
      subC = MAX(1, c - 1);
    }
  } else if (score >= 80000 && score <= 105000 && t !== 'super') {
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
