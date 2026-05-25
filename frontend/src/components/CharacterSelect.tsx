import { CHARACTER_DATA, CHARACTER_ICON_MAP, getCharacterDisplayName } from "../lib/constants";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (val: string) => void;
  showAll?: boolean;
  allLabel?: string;
  className?: string;
};

export function CharacterSelect({ value, onChange, showAll, allLabel, className }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className={"char-select-wrap " + (className || "")}>
      {value && CHARACTER_ICON_MAP[value] && (
        <img
          src={CHARACTER_ICON_MAP[value]}
          alt=""
          className="char-select-icon"
          width={20}
          height={20}
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="char-select"
      >
        {showAll && <option value="">{allLabel || "All"}</option>}
        {CHARACTER_DATA.map((c) => (
          <option key={c.key} value={c.key}>
            {getCharacterDisplayName(c.key, lang)}
          </option>
        ))}
      </select>
    </div>
  );
}

type IconProps = {
  name: string;
  size?: number;
};

export function CharacterIcon({ name, size = 20 }: IconProps) {
  const iconPath = CHARACTER_ICON_MAP[name];
  if (!iconPath) return null;
  return (
    <img
      src={iconPath}
      alt={name}
      className="char-icon"
      width={size}
      height={size}
    />
  );
}
