import type { CakeSize, ProductType } from "./sizingTypes";

export const productTypeOptions = [
  { value: "topCakeTopper", label: "Top cake topper" },
  { value: "sideCakeCharm", label: "Side cake charm" },
  { value: "cupcakeCharm", label: "Cupcake charm" },
  { value: "logoCakeCharm", label: "Logo cake charm" },
  { value: "numberTopper", label: "Number topper" },
  { value: "monogramTopper", label: "Monogram topper" },
] as const;

export const cakeSizes = {
  "4": { label: "4 inch", filenameLabel: "4inch", diameterMm: 101.6 },
  "6": { label: "6 inch", filenameLabel: "6inch", diameterMm: 152.4 },
  "8": { label: "8 inch", filenameLabel: "8inch", diameterMm: 203.2 },
  "10": { label: "10 inch", filenameLabel: "10inch", diameterMm: 254 },
} as const;

export const materialOptions = [
  { value: "3mmAcrylic", label: "3mm acrylic" },
  { value: "mirrorAcrylic", label: "Mirror acrylic" },
  { value: "layeredAcrylic", label: "Layered acrylic" },
  { value: "3mmPlywood", label: "3mm plywood" },
  { value: "other", label: "Other" },
] as const;

export const designUseOptions = [
  { value: "heroTopper", label: "Hero topper" },
  { value: "subtleCharm", label: "Subtle charm" },
  { value: "logoBranding", label: "Logo branding" },
  { value: "cupcakeDecoration", label: "Cupcake decoration" },
  { value: "weddingMonogram", label: "Wedding/monogram" },
  { value: "numberFeature", label: "Number feature" },
] as const;

export const fontCategoryOptions = [
  { value: "unknown", label: "Unknown" },
  { value: "script", label: "Script" },
  { value: "serif", label: "Serif" },
  { value: "sansSerif", label: "Sans-serif" },
  { value: "chunky", label: "Chunky" },
  { value: "thin", label: "Thin" },
  { value: "handwritten", label: "Handwritten" },
  { value: "decorative", label: "Decorative" },
] as const;

export const stakeOptionOptions = [
  { value: "auto", label: "Auto" },
  { value: "none", label: "No stake" },
  { value: "single", label: "Single stake" },
  { value: "double", label: "Double stake" },
] as const;

export const aspectRatioCategories = {
  veryTall: { maxExclusive: 0.5 },
  tall: { minInclusive: 0.5, maxExclusive: 0.8 },
  balanced: { minInclusive: 0.8, maxInclusive: 1.4 },
  wide: { minExclusive: 1.4, maxInclusive: 2.2 },
  veryWide: { minExclusive: 2.2 },
} as const;

export const topperSizingRules = {
  topCakeTopper: {
    "4": { minWidth: 70, preferredWidth: 78, maxWidth: 85, maxVisibleHeight: 90 },
    "6": { minWidth: 105, preferredWidth: 120, maxWidth: 130, maxVisibleHeight: 120 },
    "8": { minWidth: 135, preferredWidth: 150, maxWidth: 165, maxVisibleHeight: 145 },
    "10": { minWidth: 165, preferredWidth: 180, maxWidth: 200, maxVisibleHeight: 175 },
  },
  numberTopper: {
    "4": { minWidth: 70, preferredWidth: 80, maxWidth: 85, maxVisibleHeight: 95 },
    "6": { minWidth: 110, preferredWidth: 125, maxWidth: 140, maxVisibleHeight: 130 },
    "8": { minWidth: 140, preferredWidth: 155, maxWidth: 175, maxVisibleHeight: 160 },
    "10": { minWidth: 170, preferredWidth: 190, maxWidth: 210, maxVisibleHeight: 190 },
  },
  monogramTopper: {
    "4": { minWidth: 70, preferredWidth: 78, maxWidth: 85, maxVisibleHeight: 90 },
    "6": { minWidth: 110, preferredWidth: 120, maxWidth: 130, maxVisibleHeight: 120 },
    "8": { minWidth: 140, preferredWidth: 150, maxWidth: 165, maxVisibleHeight: 145 },
    "10": { minWidth: 165, preferredWidth: 180, maxWidth: 200, maxVisibleHeight: 175 },
  },
} as const;

export const charmSizingRules = {
  sideCakeCharm: {
    defaultWidth: 40,
    minWidth: 25,
    maxWidth: 60,
    maxVisibleHeight: 60,
  },
  cupcakeCharm: {
    defaultWidth: 30,
    minWidth: 20,
    maxWidth: 40,
    maxVisibleHeight: 40,
  },
  logoCakeCharm: {
    defaultWidth: 35,
    minWidth: 30,
    maxWidth: 60,
    maxVisibleHeight: 60,
  },
} as const;

export const stakeRules = {
  appliesTo: ["topCakeTopper", "numberTopper", "monogramTopper"] satisfies ProductType[],
  depths: {
    "4": { min: 35, preferred: 40, max: 45 },
    "6": { min: 40, preferred: 45, max: 50 },
    "8": { min: 45, preferred: 50, max: 60 },
    "10": { min: 50, preferred: 60, max: 65 },
  } satisfies Record<CakeSize, { min: number; preferred: number; max: number }>,
  doubleStakeWidthThresholdMm: 120,
  heavyMaterials: ["mirrorAcrylic", "layeredAcrylic"],
} as const;

export const warningThresholds = {
  cupcakeMaxRecommendedWidthMm: 40,
  logoMinReadableWidthMm: 30,
  manualOverrideTolerancePercent: 10,
  verySmallHeightMm: 20,
  verySmallWidthMm: 20,
} as const;

export function productTypeLabel(productType: ProductType): string {
  return productTypeOptions.find((option) => option.value === productType)?.label ?? productType;
}
