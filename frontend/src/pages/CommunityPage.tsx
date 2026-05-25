import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  getCommunityMemos,
  getCommunityCombos,
  rateCombo,
  getFeedbackList,
  submitFeedback,
  voteFeedback,
  translateMemo,
  getCreators,
  createCheckoutSession,
  toggleMemoLike,
} from "../lib/api";
import { TAG_KEY_MAP } from "../lib/constants";
import { CharacterSelect } from "../components/CharacterSelect";
import type { CommunityMemo, CommunityCombo, Feedback, Creator } from "../lib/types";
import { VideoEmbed } from "../components/VideoEmbed";

type CommunityTab = "memos" | "combos" | "creators" | "feedback";

const UNSUPPORTED_TRANSLATE_LANGS = ["th"];

type Props = {
  plan: string;
  onNavigateCreator?: (creatorId: string) => void;
};

export function CommunityPage({ plan, onNavigateCreator }: Props) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<CommunityTab>("memos");

  const FEEDBACK_CATEGORIES = [
    { value: "feature", label: t("community.categories.feature") },
    { value: "improvement", label: t("community.categories.improvement") },
    { value: "bug", label: t("community.categories.bug") },
    { value: "other", label: t("community.categories.other") },
  ];

  // Memos state
  const [memos, setMemos] = useState<CommunityMemo[]>([]);
  const [memosLoading, setMemosLoading] = useState(true);
  const [filterMyChar, setFilterMyChar] = useState("");
  const [filterOpponent, setFilterOpponent] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "popular">("recent");

  // Combos state
  const [communityCombos, setCommunityCombos] = useState<CommunityCombo[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [comboChar, setComboChar] = useState("");
  const [comboSearch, setComboSearch] = useState("");
  const [debouncedComboSearch, setDebouncedComboSearch] = useState("");
  const [comboSort, setComboSort] = useState<"recent" | "popular">("recent");
  const [comboControlType, setComboControlType] = useState("");

  // Translation state
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Creators state
  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const currentLang = i18n.language.split("-")[0];
  const isTranslationSupported = !UNSUPPORTED_TRANSLATE_LANGS.includes(currentLang);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedComboSearch(comboSearch), 300);
    return () => clearTimeout(timer);
  }, [comboSearch]);

  const loadMemos = () => {
    setMemosLoading(true);
    const filters: Record<string, string> = {};
    if (filterMyChar) filters.myCharacter = filterMyChar;
    if (filterOpponent) filters.opponent = filterOpponent;
    if (debouncedSearch) filters.search = debouncedSearch;
    getCommunityMemos({ ...filters, sort: sortMode })
      .then(setMemos)
      .finally(() => setMemosLoading(false));
  };

  useEffect(() => {
    if (tab !== "memos") return;
    loadMemos();
  }, [filterMyChar, filterOpponent, debouncedSearch, sortMode, tab]);

  const loadCombos = () => {
    setCombosLoading(true);
    const filters: Record<string, string> = {};
    if (comboChar) filters.character = comboChar;
    if (comboControlType) filters.controlType = comboControlType;
    if (debouncedComboSearch) filters.search = debouncedComboSearch;
    getCommunityCombos({ ...filters, sort: comboSort })
      .then(setCommunityCombos)
      .finally(() => setCombosLoading(false));
  };

  useEffect(() => {
    if (tab !== "combos") return;
    loadCombos();
  }, [comboChar, comboControlType, debouncedComboSearch, comboSort, tab]);

  const handleRate = async (comboId: string, rating: "works" | "doesnt_work") => {
    // Optimistic update
    setCommunityCombos(prev => prev.map(c => {
      if (c.id !== comboId) return c;
      const wasThisRating = c.userRating === rating;
      const wasOtherRating = c.userRating && c.userRating !== rating;
      return {
        ...c,
        userRating: wasThisRating ? null : rating,
        worksCount: c.worksCount + (rating === "works" ? (wasThisRating ? -1 : 1) : (wasOtherRating && c.userRating === "works" ? -1 : 0)),
        doesntWorkCount: c.doesntWorkCount + (rating === "doesnt_work" ? (wasThisRating ? -1 : 1) : (wasOtherRating && c.userRating === "doesnt_work" ? -1 : 0)),
      };
    }));
    try {
      await rateCombo(comboId, rating);
    } catch {
      loadCombos();
    }
  };

  useEffect(() => {
    if (tab !== "creators") return;
    setCreatorsLoading(true);
    getCreators()
      .then(setCreatorsList)
      .finally(() => setCreatorsLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "feedback") return;
    setFeedbackLoading(true);
    getFeedbackList(filterCategory)
      .then(setFeedbackList)
      .finally(() => setFeedbackLoading(false));
  }, [filterCategory, tab]);

  const handleTranslate = async (memoId: string) => {
    if (plan === "free") {
      try {
        const { url } = await createCheckoutSession();
        window.location.href = url;
      } catch {
        // ignore
      }
      return;
    }
    setTranslating((prev) => ({ ...prev, [memoId]: true }));
    try {
      const result = await translateMemo(memoId, currentLang);
      setTranslations((prev) => ({ ...prev, [memoId]: result.translatedText }));
    } catch {
      // ignore
    } finally {
      setTranslating((prev) => ({ ...prev, [memoId]: false }));
    }
  };

  const handleLike = async (memoId: string) => {
    setMemos(prev => prev.map(m =>
      m.id === memoId
        ? { ...m, userLiked: !m.userLiked, likeCount: (m.likeCount || 0) + (m.userLiked ? -1 : 1) }
        : m
    ));
    try {
      await toggleMemoLike(memoId);
    } catch {
      // Revert on error - just reload
      loadMemos();
    }
  };

  const handleSubmitFeedback = async () => {
    if (!newContent.trim()) return;
    setSubmitting(true);
    try {
      await submitFeedback(newContent.trim(), newCategory);
      setNewContent("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2000);
      const list = await getFeedbackList(filterCategory);
      setFeedbackList(list);
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string) => {
    try {
      const result = await voteFeedback(id);
      setFeedbackList((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, userVoted: result.voted, voteCount: f.voteCount + (result.voted ? 1 : -1) }
            : f
        )
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="community-page">
      <h2>{t("community.title")}</h2>

      <div className="tab-switch" style={{ marginBottom: 16 }}>
        <button className={tab === "memos" ? "active" : ""} onClick={() => setTab("memos")}>
          {t("community.tabMemos")}
        </button>
        <button className={tab === "combos" ? "active" : ""} onClick={() => setTab("combos")}>
          {t("community.tabCombos")}
        </button>
        <button className={tab === "creators" ? "active" : ""} onClick={() => setTab("creators")}>
          {t("community.tabCreators")}
        </button>
        <button className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")}>
          {t("community.tabFeedback")}
        </button>
      </div>

      {/* Memos Tab */}
      {tab === "memos" && (
        <>
          <p className="description">{t("community.memosDescription")}</p>

          <input
            type="text"
            placeholder={t("community.searchPlaceholder")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />

          <div className="filters">
            <CharacterSelect value={filterMyChar} onChange={setFilterMyChar} showAll allLabel={t("community.filterMyChar")} />
            <CharacterSelect value={filterOpponent} onChange={setFilterOpponent} showAll allLabel={t("community.filterOpponent")} />
          </div>

          <div className="sort-toggle">
            <button className={`sort-btn ${sortMode === "recent" ? "active" : ""}`} onClick={() => setSortMode("recent")}>
              {t("community.sortRecent")}
            </button>
            <button className={`sort-btn ${sortMode === "popular" ? "active" : ""}`} onClick={() => setSortMode("popular")}>
              {t("community.sortPopular")}
            </button>
          </div>

          {memosLoading ? (
            <div className="loading">{t("common.loading")}</div>
          ) : memos.length === 0 ? (
            <p className="empty-state">{t("community.emptyMemos")}</p>
          ) : (
            <div className="memo-list">
              {memos.map((m) => (
                <div key={m.id} className={`memo-item ${m.result}`}>
                  <div className="memo-header">
                    <span className={`result-badge ${m.result}`}>{m.result === "win" ? t("common.win") : t("common.lose")}</span>
                    <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
                    <span className="memo-user">{t("common.by")} {m.username}</span>
                    {m.isCreatorMemo && <span className="creator-badge">Creator</span>}
                  </div>
                  {m.memo && (
                    <>
                      <p className="memo-text">
                        {m.memo}
                        {m.isPreview && <span className="preview-ellipsis">... <span className="preview-lock">{t("community.subscribeToRead")}</span></span>}
                      </p>
                    </>
                  )}
                  {m.tags?.length > 0 && (
                    <div className="memo-tags">
                      {m.tags.map((tg: string) => (
                        <span key={tg} className="tag-sm">{TAG_KEY_MAP[tg] ? t(TAG_KEY_MAP[tg]) : tg}</span>
                      ))}
                    </div>
                  )}
                  {/* Translation */}
                  {m.memo && !m.isPreview && isTranslationSupported && (
                    <div className="translate-section">
                      {translations[m.id] ? (
                        <div className="translated-text">
                          <span className="translated-label">{t("community.translatedLabel")}</span>
                          <p className="memo-text">{translations[m.id]}</p>
                          <button
                            className="btn-translate-toggle"
                            onClick={() => setTranslations((prev) => {
                              const next = { ...prev };
                              delete next[m.id];
                              return next;
                            })}
                          >
                            {t("community.hideTranslation")}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-translate"
                          onClick={() => handleTranslate(m.id)}
                          disabled={translating[m.id]}
                        >
                          {translating[m.id]
                            ? t("community.translating")
                            : plan === "free"
                              ? `${t("community.translate")} (${t("community.premiumOnly")})`
                              : t("community.translate")
                          }
                        </button>
                      )}
                    </div>
                  )}
                  <div className="memo-actions-row">
                    <button
                      className={`like-btn ${m.userLiked ? "liked" : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleLike(m.id); }}
                    >
                      {m.userLiked ? "\u2764\uFE0F" : "\uD83E\uDD0D"} {m.likeCount || 0}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Combos Tab */}
      {tab === "combos" && (
        <>
          <p className="description">{t("community.combosDescription")}</p>

          <input
            type="text"
            placeholder={t("community.searchPlaceholder")}
            value={comboSearch}
            onChange={(e) => setComboSearch(e.target.value)}
            className="search-input"
          />

          <div className="filters">
            <CharacterSelect value={comboChar} onChange={setComboChar} showAll allLabel={t("community.filterCharacter")} />
            <div className="control-type-toggle">
              <button className={`ctrl-btn ${comboControlType === "" ? "active" : ""}`} onClick={() => setComboControlType("")}>
                {t("combos.all")}
              </button>
              <button className={`ctrl-btn ${comboControlType === "classic" ? "active" : ""}`} onClick={() => setComboControlType("classic")}>
                {t("combos.classic")}
              </button>
              <button className={`ctrl-btn ${comboControlType === "modern" ? "active" : ""}`} onClick={() => setComboControlType("modern")}>
                {t("combos.modern")}
              </button>
            </div>
          </div>

          <div className="sort-toggle">
            <button className={`sort-btn ${comboSort === "recent" ? "active" : ""}`} onClick={() => setComboSort("recent")}>
              {t("community.sortRecent")}
            </button>
            <button className={`sort-btn ${comboSort === "popular" ? "active" : ""}`} onClick={() => setComboSort("popular")}>
              {t("community.sortPopular")}
            </button>
          </div>

          {combosLoading ? (
            <div className="loading">{t("common.loading")}</div>
          ) : communityCombos.length === 0 ? (
            <p className="empty-state">{t("community.emptyCombos")}</p>
          ) : (
            <div className="combo-community-list">
              {communityCombos.map((combo) => (
                <div key={combo.id} className="combo-community-card">
                  <div className="combo-community-header">
                    <span className="combo-community-char">{combo.character}</span>
                    <span className={`ctrl-badge ${combo.controlType}`}>
                      {combo.controlType === "modern" ? "MO" : "CL"}
                    </span>
                    <span className="combo-community-name">{combo.name || "-"}</span>
                    <span className="memo-user">{t("common.by")} {combo.username}</span>
                  </div>
                  {combo.command && (
                    <div className="combo-card-command">{combo.command}</div>
                  )}
                  {combo.damage != null && combo.damage > 0 && (
                    <div className="combo-community-damage">{combo.damage} dmg</div>
                  )}
                  {combo.memo && (
                    <div className="combo-card-memo">{combo.memo}</div>
                  )}
                  {combo.videoUrl && (
                    <VideoEmbed url={combo.videoUrl} />
                  )}
                  <div className="combo-rating-row">
                    <button
                      className={`combo-rating-btn rating-works ${combo.userRating === "works" ? "active" : ""}`}
                      onClick={() => handleRate(combo.id, "works")}
                    >
                      ✅ {t("combos.works")} {combo.worksCount > 0 && combo.worksCount}
                    </button>
                    <button
                      className={`combo-rating-btn rating-doesnt-work ${combo.userRating === "doesnt_work" ? "active" : ""}`}
                      onClick={() => handleRate(combo.id, "doesnt_work")}
                    >
                      ❌ {t("combos.doesntWork")} {combo.doesntWorkCount > 0 && combo.doesntWorkCount}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Creators Tab */}
      {tab === "creators" && (
        <>
          <p className="description">{t("community.creatorsDescription")}</p>

          {creatorsLoading ? (
            <div className="loading">{t("common.loading")}</div>
          ) : creatorsList.length === 0 ? (
            <p className="empty-state">{t("community.emptyCreators")}</p>
          ) : (
            <div className="creators-list">
              {creatorsList.map((cr) => (
                <div
                  key={cr.id}
                  className="creator-card"
                  onClick={() => onNavigateCreator?.(cr.id)}
                >
                  <div className="creator-card-header">
                    <span className="creator-name">{cr.displayName || cr.username}</span>
                    <span className="creator-char">{cr.mainCharacter}</span>
                  </div>
                  {cr.bio && <p className="creator-bio">{cr.bio}</p>}
                  <div className="creator-card-footer">
                    <span className="creator-price">¥{cr.monthlyPrice.toLocaleString()}/月</span>
                    <span className="creator-subs">{cr.subscriberCount} {t("community.subscribers")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Feedback Tab */}
      {tab === "feedback" && (
        <>
          <p className="description">{t("community.feedbackDescription")}</p>

          <div className="feedback-form">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t("community.feedbackPlaceholder")}
              rows={3}
              maxLength={500}
            />
            <button className="btn-primary" onClick={handleSubmitFeedback} disabled={submitting || !newContent.trim()}>
              {submitting ? t("common.submitting") : t("common.submit")}
            </button>
            {submitSuccess && <p className="success">{t("common.submitted")}</p>}
          </div>

          <div className="feedback-filter" style={{ marginTop: 16 }}>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">{t("community.allCategories")}</option>
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {feedbackLoading ? (
            <div className="loading">{t("common.loading")}</div>
          ) : feedbackList.length === 0 ? (
            <p className="empty-state">{t("community.emptyFeedback")}</p>
          ) : (
            <div className="feedback-list">
              {feedbackList.map((f) => (
                <div key={f.id} className="feedback-item">
                  <button
                    className={`vote-btn ${f.userVoted ? "voted" : ""}`}
                    onClick={() => handleVote(f.id)}
                  >
                    <span className="vote-arrow">▲</span>
                    <span className="vote-count">{f.voteCount}</span>
                  </button>
                  <div className="feedback-body">
                    <span className={`feedback-category cat-${f.category}`}>
                      {FEEDBACK_CATEGORIES.find((c) => c.value === f.category)?.label || f.category}
                    </span>
                    <p className="feedback-text">{f.content}</p>
                    <span className="feedback-meta">{t("common.by")} {f.username}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
