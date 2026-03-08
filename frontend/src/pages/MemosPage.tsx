import { useState, useEffect } from "react";
import { getMemos, deleteMemo } from "../lib/api";
import { CHARACTERS, TAGS } from "../lib/constants";

export function MemosPage() {
  const [memos, setMemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpponent, setFilterOpponent] = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const loadMemos = () => {
    setLoading(true);
    const filters: any = {};
    if (filterOpponent) filters.opponent = filterOpponent;
    if (filterResult) filters.result = filterResult;
    if (filterTag) filters.tag = filterTag;
    getMemos(filters)
      .then(setMemos)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMemos();
  }, [filterOpponent, filterResult, filterTag]);

  const handleDelete = async (id: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    await deleteMemo(id);
    loadMemos();
  };

  return (
    <div className="memos-page">
      <h2>メモ一覧</h2>

      <div className="filters">
        <select value={filterOpponent} onChange={(e) => setFilterOpponent(e.target.value)}>
          <option value="">全キャラ</option>
          {CHARACTERS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)}>
          <option value="">全結果</option>
          <option value="win">勝ち</option>
          <option value="loss">負け</option>
        </select>
        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
          <option value="">全タグ</option>
          {TAGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : memos.length === 0 ? (
        <p className="empty-state">メモがありません</p>
      ) : (
        <div className="memo-list">
          {memos.map((m) => (
            <div key={m.id} className={`memo-item ${m.result}`}>
              <div className="memo-header">
                <span className={`result-badge ${m.result}`}>{m.result === "win" ? "WIN" : "LOSE"}</span>
                <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
                <span className="memo-date">{new Date(m.createdAt).toLocaleDateString("ja-JP")}</span>
                <button className="btn-delete" onClick={() => handleDelete(m.id)} title="削除">×</button>
              </div>
              {m.memo && <p className="memo-text">{m.memo}</p>}
              {m.tags?.length > 0 && (
                <div className="memo-tags">
                  {m.tags.map((t: string) => <span key={t} className="tag-sm">{t}</span>)}
                </div>
              )}
              {m.isPublic && <span className="public-badge">公開中</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
