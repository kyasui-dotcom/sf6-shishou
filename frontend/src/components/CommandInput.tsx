import { useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
};

// SF6 numpad notation + buttons
const DIRECTIONS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
];

const BUTTONS_CLASSIC = ["LP", "MP", "HP", "LK", "MK", "HK"];
const BUTTONS_MODERN = ["L", "M", "H", "S", "A", "DP"];
const MODIFIERS = [">", ",", "~", "dl.", "cl.", "xx", "TC"];
const SPECIAL = ["236", "214", "623", "41236", "63214", "360", "[4]6", "[2]8", "j.", "DR"];

export function CommandInput({ value, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const [showPad, setShowPad] = useState(false);
  const [buttonSet, setButtonSet] = useState<"classic" | "modern">("classic");

  const append = (s: string) => {
    onChange(value + s);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  const clear = () => {
    onChange("");
  };

  const buttons = buttonSet === "classic" ? BUTTONS_CLASSIC : BUTTONS_MODERN;

  return (
    <div className="cmd-input-wrap">
      <div className="cmd-input-row">
        <input
          type="text"
          className="combo-command-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className={"cmd-pad-toggle" + (showPad ? " active" : "")}
          onClick={() => setShowPad(!showPad)}
          title={t("combos.commandPad")}
        >
          ⌨
        </button>
      </div>

      {showPad && (
        <div className="cmd-pad">
          <div className="cmd-pad-section">
            <div className="cmd-pad-label">{t("combos.directions")}</div>
            <div className="cmd-numpad">
              {DIRECTIONS.map((row, ri) => (
                <div key={ri} className="cmd-numpad-row">
                  {row.map((d) => (
                    <button key={d} type="button" className="cmd-btn dir" onClick={() => append(d)}>
                      {d}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="cmd-pad-section">
            <div className="cmd-pad-label">
              <button
                type="button"
                className={"cmd-set-btn" + (buttonSet === "classic" ? " active" : "")}
                onClick={() => setButtonSet("classic")}
              >CL</button>
              <button
                type="button"
                className={"cmd-set-btn" + (buttonSet === "modern" ? " active" : "")}
                onClick={() => setButtonSet("modern")}
              >MO</button>
            </div>
            <div className="cmd-btn-grid">
              {buttons.map((b) => (
                <button key={b} type="button" className="cmd-btn btn" onClick={() => append(b)}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="cmd-pad-section">
            <div className="cmd-pad-label">{t("combos.special")}</div>
            <div className="cmd-btn-grid special">
              {SPECIAL.map((s) => (
                <button key={s} type="button" className="cmd-btn sp" onClick={() => append(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="cmd-pad-section">
            <div className="cmd-pad-label">{t("combos.modifiers")}</div>
            <div className="cmd-btn-grid">
              {MODIFIERS.map((m) => (
                <button key={m} type="button" className="cmd-btn mod" onClick={() => append(m)}>
                  {m}
                </button>
              ))}
              <button type="button" className="cmd-btn del" onClick={backspace}>⌫</button>
              <button type="button" className="cmd-btn del" onClick={clear}>CLR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
