import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getFrameData } from "../lib/api";
import { CharacterSelect } from "../components/CharacterSelect";
import type { FrameDataMove, MoveCategory } from "../lib/types";

type Props = {
  mainCharacter: string;
};

const CATEGORIES: MoveCategory[] = ["normal", "special", "super", "throw", "unique", "target_combo", "command_normal"];

function frameClass(val: number | null): string {
  if (val === null || val === undefined) return "";
  if (val > 0) return "frame-positive";
  if (val < 0) return "frame-negative";
  return "frame-neutral";
}

function formatFrame(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return val > 0 ? "+" + val : "" + val;
}

export function FrameDataPage({ mainCharacter }: Props) {
  const { t } = useTranslation();

  const [character, setCharacter] = useState(mainCharacter || "Ryu");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [moves, setMoves] = useState<FrameDataMove[]>([]);
  const [loading, setLoading] = useState(true);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLoading(true);
    const s = search.trim();
    getFrameData(character, category || undefined, s || undefined)
      .then((data: FrameDataMove[]) => setMoves(data))
      .catch(() => setMoves([]))
      .finally(() => setLoading(false));
  }, [character, category, search]);

  const handleSearchInput = (val: string) => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 300);
  };

  return (
    <div className="frame-data-page">
      <h2>{t("frameData.title")}</h2>

      <div className="frame-data-filters">
        <CharacterSelect value={character} onChange={setCharacter} />

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t("frameData.allCategories")}</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{t("frameData.cat_" + cat)}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder={t("frameData.search")}
          onChange={(e) => handleSearchInput(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : moves.length === 0 ? (
        <p className="empty-state">{t("frameData.empty")}</p>
      ) : (
        <div className="frame-data-table-wrap">
          <table className="frame-data-table">
            <thead>
              <tr>
                <th>{t("frameData.moveName")}</th>
                <th>{t("frameData.input")}</th>
                <th>{t("frameData.startup")}</th>
                <th>{t("frameData.active")}</th>
                <th>{t("frameData.recovery")}</th>
                <th>{t("frameData.onBlock")}</th>
                <th>{t("frameData.onHit")}</th>
                <th>{t("frameData.damage")}</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="move-name-cell">
                    <span className="move-name-en">{m.moveName}</span>
                    {m.moveNameJp && <span className="move-name-jp">{m.moveNameJp}</span>}
                  </td>
                  <td className="input-cell">{m.input || "-"}</td>
                  <td>{m.startup ?? "-"}</td>
                  <td>{m.active ?? "-"}</td>
                  <td>{m.recovery ?? "-"}</td>
                  <td className={frameClass(m.onBlock)}>{formatFrame(m.onBlock)}</td>
                  <td className={frameClass(m.onHit)}>{formatFrame(m.onHit)}</td>
                  <td>{m.damage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
