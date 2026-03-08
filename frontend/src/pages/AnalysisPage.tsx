import { useState } from "react";
import { analyzeMatches, getCounterAdvice } from "../lib/api";
import { CHARACTERS } from "../lib/constants";
import ReactMarkdown from "react-markdown";

type Props = {
  mainCharacter: string;
  plan: string;
};

type Tab = "analysis" | "counter";

export function AnalysisPage({ mainCharacter, plan }: Props) {
  const [tab, setTab] = useState<Tab>("analysis");

  // Analysis state
  const [myCharacter, setMyCharacter] = useState(mainCharacter || "");
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [info, setInfo] = useState<{ memoCount: number; communityMemoCount: number } | null>(null);

  // Counter state
  const [counterMyChar, setCounterMyChar] = useState(mainCharacter || "");
  const [counterOpponent, setCounterOpponent] = useState("");
  const [annoyingMove, setAnnoyingMove] = useState("");
  const [counterAdvice, setCounterAdvice] = useState("");
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterError, setCounterError] = useState("");

  const handleAnalyze = async () => {
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysis("");
    try {
      const result = await analyzeMatches(
        myCharacter || undefined,
        opponentCharacter || undefined
      );
      setAnalysis(result.analysis);
      setInfo({ memoCount: result.memoCount, communityMemoCount: result.communityMemoCount });
    } catch (err: any) {
      setAnalysisError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCounter = async () => {
    if (!counterOpponent || !annoyingMove.trim()) {
      setCounterError("相手キャラとやられた技を入力してください");
      return;
    }
    setCounterLoading(true);
    setCounterError("");
    setCounterAdvice("");
    try {
      const result = await getCounterAdvice(counterMyChar, counterOpponent, annoyingMove.trim());
      setCounterAdvice(result.advice);
    } catch (err: any) {
      setCounterError(err.message);
    } finally {
      setCounterLoading(false);
    }
  };

  return (
    <div className="analysis-page">
      <h2>AI師匠</h2>

      <div className="tab-switch" style={{ marginBottom: 16 }}>
        <button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>
          メモ分析
        </button>
        <button className={tab === "counter" ? "active" : ""} onClick={() => setTab("counter")}>
          技対策
        </button>
      </div>

      {plan === "free" && (
        <div className="paywall-banner">
          <p>AI機能は有料プラン限定です</p>
          <p className="paywall-price">月額 ¥500 で全AI機能が使い放題</p>
          <button className="btn-upgrade">プランをアップグレード</button>
        </div>
      )}

      {tab === "analysis" && (
        <>
          <p className="description">対戦メモをAIが分析して、弱点と改善策を提案します。</p>

          <div className="analysis-filters">
            <label>
              自分のキャラ（任意）
              <select value={myCharacter} onChange={(e) => setMyCharacter(e.target.value)}>
                <option value="">全キャラ</option>
                {CHARACTERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              相手キャラ（任意）
              <select value={opponentCharacter} onChange={(e) => setOpponentCharacter(e.target.value)}>
                <option value="">全キャラ</option>
                {CHARACTERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <button className="btn-primary" onClick={handleAnalyze} disabled={analysisLoading || plan === "free"}>
            {analysisLoading ? "分析中...（30秒ほどかかります）" : "師匠に分析してもらう"}
          </button>

          {analysisError && <p className="error">{analysisError}</p>}

          {analysis && (
            <div className="analysis-result">
              {info && (
                <p className="analysis-info">
                  あなたのメモ {info.memoCount}件
                  {info.communityMemoCount > 0 && ` + コミュニティメモ ${info.communityMemoCount}件`}
                  を分析しました。
                </p>
              )}
              <div className="analysis-content">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "counter" && (
        <>
          <p className="description">うざい技・行動を入力すると、師匠が対策を教えてくれます。</p>

          <div className="analysis-filters">
            <label>
              自分のキャラ（任意）
              <select value={counterMyChar} onChange={(e) => setCounterMyChar(e.target.value)}>
                <option value="">未指定</option>
                {CHARACTERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              相手キャラ
              <select value={counterOpponent} onChange={(e) => setCounterOpponent(e.target.value)}>
                <option value="">選択</option>
                {CHARACTERS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            やられた技・行動
            <textarea
              value={annoyingMove}
              onChange={(e) => setAnnoyingMove(e.target.value)}
              placeholder="例：ドライブラッシュからの投げが見えない、起き上がりにSA3重ねられる、中足ドライブラッシュが止められない"
              rows={3}
            />
          </label>

          <button className="btn-primary" onClick={handleCounter} disabled={counterLoading || plan === "free"} style={{ marginTop: 8 }}>
            {counterLoading ? "対策を考え中..." : "師匠に対策を聞く"}
          </button>

          {counterError && <p className="error">{counterError}</p>}

          {counterAdvice && (
            <div className="analysis-result">
              <div className="analysis-content">
                <ReactMarkdown>{counterAdvice}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
