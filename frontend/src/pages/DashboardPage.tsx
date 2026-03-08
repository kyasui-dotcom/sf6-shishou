import { useState, useEffect } from "react";
import { getStats, getMemos } from "../lib/api";

type Props = {
  onNavigate: (page: string) => void;
};

export function DashboardPage({ onNavigate }: Props) {
  const [stats, setStats] = useState<any>(null);
  const [recentMemos, setRecentMemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getMemos()])
      .then(([s, m]) => {
        setStats(s);
        setRecentMemos(m.slice(0, 10));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">読み込み中...</div>;

  return (
    <div className="dashboard">
      <div className="stats-overview">
        <h2>戦績サマリー</h2>
        {stats?.overall?.total > 0 ? (
          <>
            <div className="stat-cards">
              <div className="stat-card">
                <span className="stat-value">{stats.overall.total}</span>
                <span className="stat-label">総試合数</span>
              </div>
              <div className="stat-card win">
                <span className="stat-value">{stats.overall.wins}</span>
                <span className="stat-label">勝ち</span>
              </div>
              <div className="stat-card loss">
                <span className="stat-value">{stats.overall.losses}</span>
                <span className="stat-label">負け</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.overall.winRate}%</span>
                <span className="stat-label">勝率</span>
              </div>
            </div>

            {stats.byOpponent?.length > 0 && (
              <div className="character-stats">
                <h3>キャラ別勝率</h3>
                <div className="char-stat-list">
                  {stats.byOpponent.map((s: any) => (
                    <div key={s.character} className="char-stat-row">
                      <span className="char-name">{s.character}</span>
                      <div className="win-rate-bar">
                        <div className="win-rate-fill" style={{ width: `${s.winRate}%` }} />
                      </div>
                      <span className="char-rate">{s.winRate}% ({s.wins}勝{s.losses}敗)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.lossTagStats?.length > 0 && (
              <div className="tag-stats">
                <h3>負けパターン（タグ別）</h3>
                <div className="tag-list">
                  {stats.lossTagStats.map((t: any) => (
                    <span key={t.tag} className="tag-badge">{t.tag}: {t.count}回</span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="empty-state">まだメモがありません。対戦メモを記録しましょう！</p>
        )}
      </div>

      {recentMemos.length > 0 && (
        <div className="recent-memos">
          <h3>最近のメモ</h3>
          {recentMemos.map((m: any) => (
            <div key={m.id} className={`memo-item ${m.result}`}>
              <span className={`result-badge ${m.result}`}>{m.result === "win" ? "WIN" : "LOSE"}</span>
              <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
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

      <button className="btn-primary fab" onClick={() => onNavigate("record")}>
        + メモを書く
      </button>
    </div>
  );
}
