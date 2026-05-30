import type { MaterialProfile } from "../types/design";

interface MaterialSelectorProps {
  materials: MaterialProfile[];
  value: string;
  onChange: (value: string) => void;
}

export function MaterialSelector({ materials, value, onChange }: MaterialSelectorProps) {
  return (
    <label className="field">
      <span>Material</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label="Material selection">
        {materials.map((material) => (
          <option key={material.material_id} value={material.material_id}>
            {material.material_name}
          </option>
        ))}
      </select>
    </label>
  );
}
