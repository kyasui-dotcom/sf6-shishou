import { useState, useEffect } from "react";
import { getCommunityMemos, getFeedbackList, submitFeedback, voteFeedback } from "../lib/api";
import { CHARACTERS } from "../lib/constants";

type CommunityTab = "memos" | "feedback";

const FEEDBACK_CATEGORIES = [
  { value: "feature", label: "機能要望" },
  { value: "improvement", label: "改善提案" },
  { value: "bug", label: "バグ報告" },
  { value: "other", label: "その他" },
];

export function CommunityPage() {
  const [tab, setTab] = useState<CommunityTab>("memos");

  // Memos state
  const [memos, setMemos] = useState<any[]>([]);
  const [memosLoading, setMemosLoading] = useState(true);
  const [filterMyChar, setFilterMyChar] = useState("");
  const [filterOpponent, setFilterOpponent] = useState("");

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (tab !== "memos") return;
    setMemosLoading(true);
    const filters: any = {};
    if (filterMyChar) filters.myCharacter = filterMyChar;
    if (filterOpponent) filters.opponent = filterOpponent;
    getCommunityMemos(filters)
      .then(setMemos)
      .finally(() => setMemosLoading(false));
  }, [filterMyChar, filterOpponent, tab]);

  useEffect(() => {
    if (tab !== "feedback") return;
    setFeedbackLoading(true);
    getFeedbackList(filterCategory)
      .then(setFeedbackList)
      .finally(() => setFeedbackLoading(false));
  }, [filterCategory, tab]);

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
      <h2>コミュニティ</h2>

      <div className="tab-switch" style={{ marginBottom: 16 }}>
        <button className={tab === "memos" ? "active" : ""} onClick={() => setTab("memos")}>
          みんなのメモ
        </button>
        <button className={tab === "feedback" ? "active" : ""} onClick={() => setTab("feedback")}>
          要望・提案
        </button>
      </div>

      {tab === "memos" && (
        <>
          <p className="description">みんなの対戦メモから学ぼう</p>

          <div className="filters">
            <select value={filterMyChar} onChange={(e) => setFilterMyChar(e.target.value)}>
              <option value="">使用キャラ（全て）</option>
              {CHARACTERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={filterOpponent} onChange={(e) => setFilterOpponent(e.target.value)}>
              <option value="">対戦キャラ（全て）</option>
              {CHARACTERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {memosLoading ? (
            <div className="loading">読み込み中...</div>
          ) : memos.length === 0 ? (
            <p className="empty-state">まだ公開メモがありません。メモを記録して公開してみましょう！</p>
          ) : (
            <div className="memo-list">
              {memos.map((m) => (
                <div key={m.id} className={`memo-item ${m.result}`}>
                  <div className="memo-header">
                    <span className={`result-badge ${m.result}`}>{m.result === "win" ? "WIN" : "LOSE"}</span>
                    <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
                    <span className="memo-user">by {m.username}</span>
                  </div>
                  {m.memo && <p className="memo-text">{m.memo}</p>}
                  {m.tags?.length > 0 && (
                    <div className="memo-tags">
                      {m.tags.map((t: string) => <span key={t} className="tag-sm">{t}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "feedback" && (
        <>
          <p className="description">サービスの改善に協力してください。投票で優先度が上がります。</p>

          <div className="feedback-form">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="改善してほしいこと、欲しい機能、バグなど（500文字以内）"
              rows={3}
              maxLength={500}
            />
            <button className="btn-primary" onClick={handleSubmitFeedback} disabled={submitting || !newContent.trim()}>
              {submitting ? "送信中..." : "送信する"}
            </button>
            {submitSuccess && <p className="success">送信しました！</p>}
          </div>

          <div className="feedback-filter" style={{ marginTop: 16 }}>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="all">すべて</option>
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {feedbackLoading ? (
            <div className="loading">読み込み中...</div>
          ) : feedbackList.length === 0 ? (
            <p className="empty-state">まだ要望がありません。最初の一つを投稿してみましょう！</p>
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
                    <span className="feedback-meta">by {f.username}</span>
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
