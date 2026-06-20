import {
  cakeSizes,
  designUseOptions,
  fontCategoryOptions,
  materialOptions,
  productTypeOptions,
  stakeOptionOptions,
} from "../engine/sizingRules";
import type {
  CakeSize,
  DesignUse,
  FontCategory,
  MaterialType,
  ProductType,
  SizingProductConfig,
  StakeOption,
} from "../engine/sizingTypes";
import { stakeApplies } from "../engine/calculateStakeRecommendation";

interface SizingInputPanelProps {
  config: SizingProductConfig;
  onChange: (config: SizingProductConfig) => void;
}

export function SizingInputPanel({ config, onChange }: SizingInputPanelProps) {
  const usesStake = stakeApplies(config.productType);

  function patch(patchValue: Partial<SizingProductConfig>) {
    onChange({ ...config, ...patchValue });
  }

  return (
    <section className="sa-card sa-input-panel">
      <div className="sa-card-heading">
        <div>
          <h2>Product details</h2>
          <p>Rules update live as inputs change.</p>
        </div>
      </div>

      <label className="ct-card-field">
        <span>Product type</span>
        <select
          value={config.productType}
          onChange={(event) => patch({ productType: event.target.value as ProductType })}
        >
          {productTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="ct-card-field">
        <span>Cake size</span>
        <select
          value={config.cakeSize}
          onChange={(event) => patch({ cakeSize: event.target.value as CakeSize })}
        >
          {Object.entries(cakeSizes).map(([value, size]) => (
            <option key={value} value={value}>
              {size.label} - {size.diameterMm} mm
            </option>
          ))}
        </select>
      </label>

      <label className="ct-card-field">
        <span>Material</span>
        <select
          value={config.material}
          onChange={(event) => patch({ material: event.target.value as MaterialType })}
        >
          {materialOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="ct-card-field">
        <span>Design use</span>
        <select
          value={config.designUse}
          onChange={(event) => patch({ designUse: event.target.value as DesignUse })}
        >
          {designUseOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="sa-inline-fields">
        <label className="ct-card-field">
          <span>Text lines</span>
          <input
            type="number"
            min="1"
            max="8"
            value={config.numberOfLines ?? ""}
            placeholder="Unknown"
            onChange={(event) => patch({ numberOfLines: parseOptionalNumber(event.target.value) })}
          />
        </label>
        <label className="ct-card-field">
          <span>Font category</span>
          <select
            value={config.fontCategory}
            onChange={(event) => patch({ fontCategory: event.target.value as FontCategory })}
          >
            {fontCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="ct-card-field">
        <span>Stake option</span>
        <select
          value={usesStake ? config.stakeOption : "none"}
          disabled={!usesStake}
          onChange={(event) => patch({ stakeOption: event.target.value as StakeOption })}
        >
          {stakeOptionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="sa-inline-fields">
        <label className="ct-card-field">
          <span>Max width</span>
          <span className="ct-unit-input ct-unit-input--compact">
            <input
              type="number"
              min="1"
              step="0.1"
              value={config.maxAllowedWidthMm ?? ""}
              onChange={(event) => patch({ maxAllowedWidthMm: parseOptionalNumber(event.target.value) })}
            />
            <span>mm</span>
          </span>
        </label>
        <label className="ct-card-field">
          <span>Max height</span>
          <span className="ct-unit-input ct-unit-input--compact">
            <input
              type="number"
              min="1"
              step="0.1"
              value={config.maxAllowedHeightMm ?? ""}
              onChange={(event) => patch({ maxAllowedHeightMm: parseOptionalNumber(event.target.value) })}
            />
            <span>mm</span>
          </span>
        </label>
      </div>

      <label className="ct-card-field">
        <span>Customer requested width</span>
        <span className="ct-unit-input ct-unit-input--compact">
          <input
            type="number"
            min="1"
            step="0.1"
            value={config.customerRequestedWidthMm ?? ""}
            onChange={(event) => patch({ customerRequestedWidthMm: parseOptionalNumber(event.target.value) })}
          />
          <span>mm</span>
        </span>
      </label>
    </section>
  );
}

function parseOptionalNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
