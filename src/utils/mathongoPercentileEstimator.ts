import type { ExamPattern } from '../types/exam.ts';

export type ShiftDifficulty = 'TOUGH' | 'MODERATE' | 'EASY';

export interface PercentileReport {
  percentile: number;
  percentileString: string;
  percentileRange: string;
  estimatedRank: number;
  rankRange: string;
  categoryCutoffStatus: string;
  targetColleges: string[];
  nextMilestone: {
    targetPercentile: number;
    marksNeeded: number;
    rankJump: number;
    advice: string;
  };
  shiftDifficulty: ShiftDifficulty;
}

/**
 * Calibrated against real MathonGo & NTA data from recent JEE Main & JEE Advanced sessions.
 * Normalizes scores to 300 marks (JEE Main) or percentage basis (JEE Advanced).
 */
export function estimateMathonGoPercentile(
  rawScore: number,
  maxMarks: number = 300,
  pattern: ExamPattern = 'JEE_MAIN',
  shiftDifficulty: ShiftDifficulty = 'MODERATE'
): PercentileReport {
  if (pattern === 'JEE_ADVANCED') {
    return estimateJEEAdvancedRank(rawScore, maxMarks);
  }

  // JEE Main: Normalize raw score to standard 300-mark paper
  const safeMax = maxMarks > 0 ? maxMarks : 300;
  const normalizedScore = (rawScore / safeMax) * 300;

  // Shift difficulty offset based on real MathonGo shift variance
  const shiftOffsets: Record<ShiftDifficulty, number> = {
    TOUGH: 14,      // Tough shift: lower marks needed for top percentile (e.g. tough Maths)
    MODERATE: 0,    // Standard shift baseline
    EASY: -15,      // Easy shift: high marks required (high competition)
  };

  const effectiveScore = normalizedScore + shiftOffsets[shiftDifficulty];

  // Official MathonGo Anchor Table: [effectiveScore, percentile, minRank, maxRank]
  // Based on ~1.4 million total candidates
  const table: [number, number, number, number][] = [
    [290, 99.99, 1, 140],
    [270, 99.92, 140, 1120],
    [250, 99.82, 1120, 2520],
    [230, 99.62, 2520, 5320],
    [210, 99.35, 5320, 9100],
    [192, 99.00, 9100, 14000],
    [175, 98.30, 14000, 23800],
    [160, 97.40, 23800, 36400],
    [145, 96.10, 36400, 54600],
    [130, 94.40, 54600, 78400],
    [115, 92.20, 78400, 109200],
    [102, 90.10, 109200, 138600],
    [90, 87.20, 138600, 179200],
    [75, 82.50, 179200, 245000],
    [60, 75.00, 245000, 350000],
    [45, 64.00, 350000, 504000],
    [30, 48.00, 504000, 728000],
    [15, 28.00, 728000, 1008000],
    [0, 5.00, 1008000, 1350000],
    [-20, 0.10, 1350000, 1400000],
  ];

  let exactPercentile = 5.0;
  let estimatedRank = 1000000;

  if (effectiveScore >= table[0][0]) {
    exactPercentile = 99.99;
    estimatedRank = Math.max(1, Math.round(140 - (effectiveScore - 290) * 10));
  } else if (effectiveScore <= table[table.length - 1][0]) {
    exactPercentile = 0.1;
    estimatedRank = 1380000;
  } else {
    for (let i = 0; i < table.length - 1; i++) {
      const higher = table[i];
      const lower = table[i + 1];
      if (effectiveScore <= higher[0] && effectiveScore >= lower[0]) {
        const fraction = (effectiveScore - lower[0]) / (higher[0] - lower[0]);
        exactPercentile = lower[1] + fraction * (higher[1] - lower[1]);
        estimatedRank = Math.round(lower[3] - fraction * (lower[3] - higher[2]));
        break;
      }
    }
  }

  exactPercentile = Math.min(99.99, Math.max(0.1, parseFloat(exactPercentile.toFixed(2))));
  const minRank = Math.max(1, Math.round(estimatedRank * 0.92));
  const maxRank = Math.round(estimatedRank * 1.08);

  const percentileString = `${exactPercentile.toFixed(2)} %ile`;
  const percentileRange = `${Math.max(0.1, exactPercentile - 0.25).toFixed(2)} - ${Math.min(99.99, exactPercentile + 0.25).toFixed(2)} %ile`;
  const rankRange = `AIR ${minRank.toLocaleString()} - ${maxRank.toLocaleString()}`;

  // Real-world College Target Predictor
  let targetColleges: string[] = [];
  let categoryCutoffStatus = '';

  if (exactPercentile >= 99.5) {
    categoryCutoffStatus = '🔥 Top Tier (AIR < 7,000) • Confirmed NIT Trichy/Surathkal/Warangal';
    targetColleges = [
      'NIT Trichy, Surathkal, Warangal (CSE / IT / ECE)',
      'IIIT Hyderabad & IIIT Allahabad (CSE / ECE)',
      'Top Branch in Tier-1 NITs Guaranteed',
    ];
  } else if (exactPercentile >= 99.0) {
    categoryCutoffStatus = '💎 Elite 99 %ile Club • Top NITs Core & Tier-1 CSE';
    targetColleges = [
      'NIT Rourkela, Calicut, Jaipur, Allahabad (CSE/ECE)',
      'NIT Trichy & Surathkal (Electrical / Mechanical)',
      'DTU / NSUT (Computer Engineering)',
    ];
  } else if (exactPercentile >= 97.5) {
    categoryCutoffStatus = '⭐ Strong Performer • High Probability of Tier-1/Tier-2 NITs';
    targetColleges = [
      'NIT Kurukshetra, Durgapur, Silchar, Jalandhar (CSE / IT)',
      'Top NITs (Civil / Chemical / Metallurgy)',
      'Top IIITs (Jabalpur, Gwalior, Lucknow)',
    ];
  } else if (exactPercentile >= 95.0) {
    categoryCutoffStatus = '🎯 Solid Qualifier • Mid NITs & Premier State Colleges';
    targetColleges = [
      'Mid NITs (Core branches: Electrical, Mechanical, Civil)',
      'State Engineering Colleges (COEP, VJTI, PEC, Thapar, LNMIIT)',
      'Eligible for JEE Advanced (Well above CRL cutoff)',
    ];
  } else if (exactPercentile >= 91.0) {
    categoryCutoffStatus = '✅ JEE Advanced Qualified (General Cutoff is ~90.8 - 92.5 %ile)';
    targetColleges = [
      'Eligible to sit for JEE Advanced (IIT Entrance)',
      'Home State Quota in NITs & Top State Universities',
    ];
  } else {
    categoryCutoffStatus = '⚠️ Below General Cutoff for JEE Advanced • Focus on High-Yield Units';
    targetColleges = [
      'Target +40 to +60 marks in next mock to breach 95-99 percentile',
      'Focus on Modern Physics, Chemical Bonding, Coordination Chem & Coordinate Geometry',
    ];
  }

  // Next Milestone advice
  let targetPercentile = 99.0;
  let marksNeeded = 0;
  let rankJump = 0;
  let advice = '';

  if (exactPercentile < 90.0) {
    targetPercentile = 93.0;
    marksNeeded = Math.max(12, Math.round(118 - normalizedScore));
    rankJump = Math.max(50000, estimatedRank - 95000);
    advice = `Solving just 3 to 4 more questions correctly will jump your rank by ~${rankJump.toLocaleString()} places!`;
  } else if (exactPercentile < 97.0) {
    targetPercentile = 98.0;
    marksNeeded = Math.max(10, Math.round(170 - normalizedScore));
    rankJump = Math.max(25000, estimatedRank - 25000);
    advice = `Converting 3 silly mistakes (+15 marks) will catapult you into Tier-1 NIT CSE eligibility.`;
  } else if (exactPercentile < 99.0) {
    targetPercentile = 99.2;
    marksNeeded = Math.max(8, Math.round(196 - normalizedScore));
    rankJump = Math.max(6000, estimatedRank - 10000);
    advice = `You are on the doorstep of the 99 %ile club. Fine-tune your time-traps to cross into Top NIT branches.`;
  } else {
    targetPercentile = 99.8;
    marksNeeded = Math.max(12, Math.round(245 - normalizedScore));
    rankJump = Math.max(5000, estimatedRank - 2500);
    advice = `Phenomenal performance! Keep polishing Section B numerical speed for single-digit AIR potential.`;
  }

  return {
    percentile: exactPercentile,
    percentileString,
    percentileRange,
    estimatedRank,
    rankRange,
    categoryCutoffStatus,
    targetColleges,
    nextMilestone: {
      targetPercentile,
      marksNeeded,
      rankJump,
      advice,
    },
    shiftDifficulty,
  };
}

/**
 * MathonGo JEE Advanced Rank & Seat Matrix Predictor
 */
function estimateJEEAdvancedRank(rawScore: number, maxMarks: number): PercentileReport {
  const safeMax = maxMarks > 0 ? maxMarks : 180;
  const percentage = Math.max(0, (rawScore / safeMax) * 100);

  let rank = 20000;
  let minRank = 15000;
  let maxRank = 25000;
  let status = '';
  let targetColleges: string[] = [];

  if (percentage >= 65) {
    rank = Math.max(1, Math.round(450 - (percentage - 65) * 20));
    minRank = 1;
    maxRank = 500;
    status = '🏆 Top Rankers Zone (AIR < 500) • IIT Bombay / Delhi / Madras CSE';
    targetColleges = [
      'IIT Bombay, IIT Delhi, IIT Madras (CSE / Data Science)',
      'IIT Kanpur, IIT Kharagpur (MnC / CSE)',
    ];
  } else if (percentage >= 55) {
    rank = Math.round(1400 - (percentage - 55) * 90);
    minRank = 500;
    maxRank = 1600;
    status = '🔥 Top 7 IITs Core & Elite Branches (AIR 500 - 1,600)';
    targetColleges = [
      'IIT Roorkee, IIT Guwahati (CSE / Data Science / MnC)',
      'IIT Bombay, IIT Delhi (Electrical / Mechanical)',
      'IIT BHU (Computer Science)',
    ];
  } else if (percentage >= 45) {
    rank = Math.round(3800 - (percentage - 45) * 240);
    minRank = 1600;
    maxRank = 4200;
    status = '⭐ Confirmed Top 7 IIT Seat (AIR 1,600 - 4,200)';
    targetColleges = [
      'IIT Hyderabad, IIT Indore, IIT Gandhinagar (CSE/ECE)',
      'IIT Kharagpur, IIT Madras (Mechanical / Aerospace / Chemical)',
    ];
  } else if (percentage >= 35) {
    rank = Math.round(8500 - (percentage - 35) * 450);
    minRank = 4200;
    maxRank = 9000;
    status = '🎯 All 23 IITs Eligibility (AIR 4,200 - 9,000)';
    targetColleges = [
      'IIT Patna, IIT Ropar, IIT Mandi, IIT Jodhpur (Circuital & Core)',
      'IIT Kharagpur, IIT Roorkee (Civil, Metallurgy, Mining)',
    ];
  } else if (percentage >= 28) {
    rank = Math.round(14500 - (percentage - 28) * 800);
    minRank = 9000;
    maxRank = 16500;
    status = '✅ IIT Qualified Cutoff (Standard General Cutoff is ~27-30% aggregate)';
    targetColleges = [
      'Qualified for IIT Admission (Newer IITs & 5-Year Dual Degrees)',
      'Eligible for IISER / RGIPT / IIPE admissions via JEE Advanced channel',
    ];
  } else {
    rank = 24000;
    minRank = 18000;
    maxRank = 35000;
    status = '⚠️ Below General Qualifying Cutoff (~28% required in JEE Advanced)';
    targetColleges = [
      'Focus on multi-concept questions and high-weightage chapters to reach 35%+',
    ];
  }

  const percentile = Math.min(99.99, parseFloat((100 - (rank / 180000) * 100).toFixed(2)));

  return {
    percentile,
    percentileString: `AIR ~${rank.toLocaleString()}`,
    percentileRange: `AIR ${minRank.toLocaleString()} - ${maxRank.toLocaleString()}`,
    estimatedRank: rank,
    rankRange: `AIR ${minRank.toLocaleString()} - ${maxRank.toLocaleString()}`,
    categoryCutoffStatus: status,
    targetColleges,
    nextMilestone: {
      targetPercentile: 99.0,
      marksNeeded: Math.max(12, Math.round(safeMax * 0.45 - rawScore)),
      rankJump: Math.max(3000, rank - 4000),
      advice: `In JEE Advanced, just 3 well-solved multi-correct questions (+12 marks) catapults your rank by thousands of positions!`,
    },
    shiftDifficulty: 'MODERATE',
  };
}
