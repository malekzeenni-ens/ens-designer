interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextInput({ value, onChange }: TextInputProps) {
  return (
    <label className="field">
      <span>Text</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={80}
        placeholder="Oliver"
        aria-label="Text to generate"
      />
    </label>
  );
}
