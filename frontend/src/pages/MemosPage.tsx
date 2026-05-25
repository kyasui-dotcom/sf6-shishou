import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getMemos, deleteMemo } from "../lib/api";
import { TAGS, TAG_KEY_MAP } from "../lib/constants";
import { CharacterSelect } from "../components/CharacterSelect";
import { LOCALE_MAP } from "../i18n";
import type { Memo } from "../lib/types";

export function MemosPage() {
  const { t, i18n } = useTranslation();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMyChar, setFilterMyChar] = useState("");
  const [filterOpponent, setFilterOpponent] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadMemos = useCallback(() => {
    setLoading(true);
    const filters: Record<string, string> = {};
    if (filterMyChar) filters.myCharacter = filterMyChar;
    if (filterOpponent) filters.opponent = filterOpponent;
    if (filterResult) filters.result = filterResult;
    if (filterTag) filters.tag = filterTag;
    if (debouncedSearch) filters.search = debouncedSearch;
    getMemos(filters)
      .then(setMemos)
      .finally(() => setLoading(false));
  }, [filterMyChar, filterOpponent, filterResult, filterTag, debouncedSearch]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("memos.deleteConfirm"))) return;
    await deleteMemo(id);
    loadMemos();
  };

  const locale = LOCALE_MAP[i18n.language.split("-")[0]] || "ja-JP";

  return (
    <div className="memos-page">
      <h2>{t("memos.title")}</h2>

      <input
        type="text"
        placeholder={t("memos.searchPlaceholder")}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="search-input"
      />

      <div className="filters">
        <CharacterSelect value={filterMyChar} onChange={setFilterMyChar} showAll allLabel={t("memos.filterMyChar")} />
        <CharacterSelect value={filterOpponent} onChange={setFilterOpponent} showAll allLabel={t("common.allCharacters")} />
        <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
          <option value="">{t("memos.allResults")}</option>
          <option value="win">{t("common.winLabel")}</option>
          <option value="loss">{t("common.lossLabel")}</option>
        </select>
        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="">{t("memos.allTags")}</option>
          {TAGS.map((tg) => (
            <option key={tg} value={tg}>{TAG_KEY_MAP[tg] ? t(TAG_KEY_MAP[tg]) : tg}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : memos.length === 0 ? (
        <p className="empty-state">{t("memos.empty")}</p>
      ) : (
        <div className="memo-list">
          {memos.map((m) => (
            <div key={m.id} className={`memo-item ${m.result}`}>
              <div className="memo-header">
                <span className={`result-badge ${m.result}`}>{m.result === "win" ? t("common.win") : t("common.lose")}</span>
                <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
                <span className="memo-date">{new Date(m.createdAt).toLocaleDateString(locale)}</span>
                <button className="btn-delete" onClick={() => handleDelete(m.id)} title={t("common.delete")}>×</button>
              </div>
              {m.memo && <p className="memo-text">{m.memo}</p>}
              {m.tags?.length > 0 && (
                <div className="memo-tags">
                  {m.tags.map((tg: string) => (
                    <span key={tg} className="tag-sm">{TAG_KEY_MAP[tg] ? t(TAG_KEY_MAP[tg]) : tg}</span>
                  ))}
                </div>
              )}
              {m.isPublic && <span className="public-badge">{t("common.publicBadge")}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
