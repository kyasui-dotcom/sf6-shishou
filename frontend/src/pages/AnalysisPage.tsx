import { useState } from "react";
import { useTranslation } from "react-i18next";
import { analyzeMatches, getCounterAdvice } from "../lib/api";
import { CharacterSelect } from "../components/CharacterSelect";
import { UpgradeModal } from "../components/UpgradeModal";
import ReactMarkdown from "react-markdown";

type Props = {
  mainCharacter: string;
  plan: string;
};

type Tab = "analysis" | "counter";

export function AnalysisPage({ mainCharacter, plan }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("analysis");

  const [myCharacter, setMyCharacter] = useState(mainCharacter || "");
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [info, setInfo] = useState<{ memoCount: number; communityMemoCount: number } | null>(null);

  const [counterMyChar, setCounterMyChar] = useState(mainCharacter || "");
  const [counterOpponent, setCounterOpponent] = useState("");
  const [annoyingMove, setAnnoyingMove] = useState("");
  const [counterAdvice, setCounterAdvice] = useState("");
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterError, setCounterError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleAnalyze = async () => {
    if (plan === "free") { setShowUpgrade(true); return; }
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
    if (plan === "free") { setShowUpgrade(true); return; }
    if (!counterOpponent || !annoyingMove.trim()) {
      setCounterError(t("analysis.counterRequired"));
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
      <h2>{t("analysis.title")}</h2>

      <div className="tab-switch" style={{ marginBottom: 16 }}>
        <button className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>
          {t("analysis.tabAnalysis")}
        </button>
        <button className={tab === "counter" ? "active" : ""} onClick={() => setTab("counter")}>
          {t("analysis.tabCounter")}
        </button>
      </div>

      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />

      {tab === "analysis" && (
        <>
          <p className="description">{t("analysis.analysisDescription")}</p>

          <div className="analysis-filters">
            <label>
              {t("analysis.myCharOptional")}
              <CharacterSelect value={myCharacter} onChange={setMyCharacter} showAll allLabel={t("common.allCharacters")} />
            </label>
            <label>
              {t("analysis.opponentCharOptional")}
              <CharacterSelect value={opponentCharacter} onChange={setOpponentCharacter} showAll allLabel={t("common.allCharacters")} />
            </label>
          </div>

          <button className="btn-primary" onClick={handleAnalyze} disabled={analysisLoading}>
            {analysisLoading ? t("analysis.analyzing") : t("analysis.analyzeButton")}
          </button>

          {analysisError && <p className="error">{analysisError}</p>}

          {analysis && (
            <div className="analysis-result">
              {info && (
                <p className="analysis-info">
                  {t("analysis.analysisInfo", {
                    memoCount: info.memoCount,
                    communityPart: info.communityMemoCount > 0
                      ? t("analysis.communityMemoPart", { count: info.communityMemoCount })
                      : "",
                  })}
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
          <p className="description">{t("analysis.counterDescription")}</p>

          <div className="analysis-filters">
            <label>
              {t("analysis.counterMyChar")}
              <CharacterSelect value={counterMyChar} onChange={setCounterMyChar} showAll allLabel={t("analysis.unspecified")} />
            </label>
            <label>
              {t("analysis.counterOpponent")}
              <CharacterSelect value={counterOpponent} onChange={setCounterOpponent} showAll allLabel={t("common.select")} />
            </label>
          </div>

          <label>
            {t("analysis.annoyingMove")}
            <textarea
              value={annoyingMove}
              onChange={(e) => setAnnoyingMove(e.target.value)}
              placeholder={t("analysis.annoyingMovePlaceholder")}
              rows={3}
            />
          </label>

          <button className="btn-primary" onClick={handleCounter} disabled={counterLoading} style={{ marginTop: 8 }}>
            {counterLoading ? t("analysis.counterLoading") : t("analysis.counterButton")}
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
