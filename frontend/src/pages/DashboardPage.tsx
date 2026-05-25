import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getStats, getMemos, getLpHistory } from "../lib/api";
import { TAG_KEY_MAP } from "../lib/constants";
import { CharacterSelect } from "../components/CharacterSelect";
import type { Stats, Memo, LpHistoryPoint } from "../lib/types";
import { LpChart } from "../components/LpChart";

type Props = {
  onNavigate: (page: string) => void;
};

export function DashboardPage({ onNavigate }: Props) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentMemos, setRecentMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lpHistory, setLpHistory] = useState<LpHistoryPoint[]>([]);
  const [chartMode, setChartMode] = useState<"lp" | "mr">("lp");
  const [chartPeriod, setChartPeriod] = useState("all");
  const [chartChar, setChartChar] = useState("");

  // Search state
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Memo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFilterChar, setSearchFilterChar] = useState("");
  const [searchFilterResult, setSearchFilterResult] = useState("");

  useEffect(() => {
    Promise.all([getStats(), getMemos()])
      .then(([s, m]: [Stats, Memo[]]) => {
        setStats(s);
        setRecentMemos(m.slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getLpHistory({ myCharacter: chartChar || undefined, period: chartPeriod })
      .then((data: LpHistoryPoint[]) => setLpHistory(data))
      .catch(() => setLpHistory([]));
  }, [chartChar, chartPeriod]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Execute search
  const doSearch = useCallback(() => {
    if (!debouncedSearch && !searchFilterChar && !searchFilterResult) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const filters: Record<string, string> = {};
    if (debouncedSearch) filters.search = debouncedSearch;
    if (searchFilterChar) filters.opponent = searchFilterChar;
    if (searchFilterResult) filters.result = searchFilterResult;
    getMemos(filters)
      .then((results: Memo[]) => setSearchResults(results))
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedSearch, searchFilterChar, searchFilterResult]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const isSearchActive = !!(searchText || searchFilterChar || searchFilterResult);

  if (loading) return <div className="loading">{t("common.loading")}</div>;

  return (
    <div className="dashboard">
      {/* Search Section */}
      <div className="search-section">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            className="search-input"
          />
          {searchText && (
            <button className="search-clear" onClick={() => setSearchText("")}>&times;</button>
          )}
        </div>
        {isSearchActive && (
          <div className="search-filters">
            <CharacterSelect value={searchFilterChar} onChange={setSearchFilterChar} showAll allLabel={t("common.allCharacters")} className="search-char-filter" />
            <select value={searchFilterResult} onChange={(e) => setSearchFilterResult(e.target.value)} className="search-result-filter">
              <option value="">{t("dashboard.allResults")}</option>
              <option value="win">{t("common.win")}</option>
              <option value="loss">{t("common.lose")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Search Results */}
      {isSearchActive ? (
        <div className="search-results">
          <h3>{t("dashboard.searchResults")} {searching ? "" : "(" + searchResults.length + ")"}</h3>
          {searching ? (
            <p className="loading-sm">{t("common.loading")}</p>
          ) : searchResults.length === 0 ? (
            <p className="empty-state">{t("dashboard.noSearchResults")}</p>
          ) : (
            searchResults.map((m) => (
              <div key={m.id} className={"memo-item " + m.result}>
                <span className={"result-badge " + m.result}>{m.result === "win" ? t("common.win") : t("common.lose")}</span>
                <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
                <span className="memo-date">{new Date(m.createdAt).toLocaleDateString()}</span>
                {m.memo && <p className="memo-text">{m.memo}</p>}
                {m.tags?.length > 0 && (
                  <div className="memo-tags">
                    {m.tags.map((tg: string) => (
                      <span key={tg} className="tag-sm">{TAG_KEY_MAP[tg] ? t(TAG_KEY_MAP[tg]) : tg}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="stats-overview">
            <h2>{t("dashboard.summary")}</h2>
            {stats && stats.overall.total > 0 ? (
              <>
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-value">{stats.overall.total}</span>
                    <span className="stat-label">{t("dashboard.totalMatches")}</span>
                  </div>
                  <div className="stat-card win">
                    <span className="stat-value">{stats.overall.wins}</span>
                    <span className="stat-label">{t("dashboard.wins")}</span>
                  </div>
                  <div className="stat-card loss">
                    <span className="stat-value">{stats.overall.losses}</span>
                    <span className="stat-label">{t("dashboard.losses")}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{stats.overall.winRate}%</span>
                    <span className="stat-label">{t("dashboard.winRate")}</span>
                  </div>
                </div>

                {stats.byOpponent.length > 0 && (
                  <div className="character-stats">
                    <h3>{t("dashboard.characterWinRate")}</h3>
                    <div className="char-stat-list">
                      {stats.byOpponent.map((s) => (
                        <div key={s.character} className="char-stat-row">
                          <span className="char-name">{s.character}</span>
                          <div className="win-rate-bar">
                            <div className="win-rate-fill" style={{ width: s.winRate + "%" }} />
                          </div>
                          <span className="char-rate">{s.winRate}% ({t("common.winsLosses", { wins: s.wins, losses: s.losses })})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.lossTagStats.length > 0 && (
                  <div className="tag-stats">
                    <h3>{t("dashboard.lossPatterns")}</h3>
                    <div className="tag-list">
                      {stats.lossTagStats.map((tg) => (
                        <span key={tg.tag} className="tag-badge">
                          {TAG_KEY_MAP[tg.tag] ? t(TAG_KEY_MAP[tg.tag]) : tg.tag}: {t("dashboard.timesCount", { count: tg.count })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="empty-state">{t("dashboard.emptyState")}</p>
            )}
          </div>

          <div className="lp-chart-section">
            <h3>{chartMode === "lp" ? t("dashboard.lpTrend") : t("dashboard.mrTrend")}</h3>
            <div className="lp-chart-filters">
              <CharacterSelect value={chartChar} onChange={setChartChar} showAll allLabel={t("common.allCharacters")} />
              <div className="period-buttons">
                {(["7d", "30d", "90d", "all"] as const).map((p) => (
                  <button
                    key={p}
                    className={"period-btn " + (chartPeriod === p ? "active" : "")}
                    onClick={() => setChartPeriod(p)}
                  >
                    {t("dashboard.period" + (p === "7d" ? "7d" : p === "30d" ? "30d" : p === "90d" ? "90d" : "All"))}
                  </button>
                ))}
              </div>
              <div className="mode-toggle">
                <button className={"mode-btn " + (chartMode === "lp" ? "active" : "")} onClick={() => setChartMode("lp")}>LP</button>
                <button className={"mode-btn " + (chartMode === "mr" ? "active" : "")} onClick={() => setChartMode("mr")}>MR</button>
              </div>
            </div>
            {lpHistory.length > 0 ? (
              <>
                <LpChart data={lpHistory} mode={chartMode} />
                {(() => {
                  const last = [...lpHistory].reverse().find(h => (chartMode === "lp" ? h.lp : h.mr) != null);
                  if (!last) return null;
                  const val = chartMode === "lp" ? last.lp : last.mr;
                  return val != null ? (
                    <div className="lp-current">
                      {chartMode === "lp" ? t("dashboard.currentLp") : t("dashboard.currentMr")}: <strong>{val.toLocaleString()}</strong>
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <p className="empty-state" style={{ padding: "20px 0" }}>{t("dashboard.noLpData")}</p>
            )}
          </div>

          {recentMemos.length > 0 && (
            <div className="recent-memos">
              <h3>{t("dashboard.recentMemos")}</h3>
              {recentMemos.map((m) => (
                <div key={m.id} className={"memo-item " + m.result}>
                  <span className={"result-badge " + m.result}>{m.result === "win" ? t("common.win") : t("common.lose")}</span>
                  <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
                  {m.memo && <p className="memo-text">{m.memo}</p>}
                  {m.tags?.length > 0 && (
                    <div className="memo-tags">
                      {m.tags.map((tg: string) => (
                        <span key={tg} className="tag-sm">{TAG_KEY_MAP[tg] ? t(TAG_KEY_MAP[tg]) : tg}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button className="btn-primary fab" onClick={() => onNavigate("record")}>
        {t("dashboard.addMemo")}
      </button>
    </div>
  );
}
