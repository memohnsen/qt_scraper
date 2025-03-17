export const qualifyingTotals = {
} as const;

export type QTEvent = keyof typeof qualifyingTotals;
export type QTAgeGroup = keyof typeof qualifyingTotals[QTEvent];
export type QTGender = keyof typeof qualifyingTotals[QTEvent][QTAgeGroup];
export type QTWeightClass = typeof qualifyingTotals[QTEvent][QTAgeGroup][QTGender][number];
