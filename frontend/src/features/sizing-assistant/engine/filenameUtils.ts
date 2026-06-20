import { cakeSizes, productTypeLabel } from "./sizingRules";
import type { CakeSize, ProductType } from "./sizingTypes";

export function buildSizedSvgFilename(input: {
  productType: ProductType;
  cakeSize: CakeSize;
  widthMm: number;
  heightMm: number;
}): string {
  const product = slugify(productTypeLabel(input.productType));
  const cake = cakeSizes[input.cakeSize].filenameLabel;
  const width = Math.round(input.widthMm);
  const height = Math.round(input.heightMm);
  return `ens-sized-${product}-${cake}-${width}x${height}mm.svg`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
