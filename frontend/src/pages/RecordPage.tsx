import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createMemo, parseMatchImage, getCharacterNote, saveCharacterNote } from "../lib/api";
import { CHARACTERS, TAGS, TAG_KEY_MAP } from "../lib/constants";
import { CharacterSelect } from "../components/CharacterSelect";

type Props = {
  mainCharacter: string;
  subCharacters: string[];
  onNavigate: (page: string) => void;
};

export function RecordPage({ mainCharacter, subCharacters, onNavigate }: Props) {
  const { t } = useTranslation();
  const myCharacters = [
    ...(mainCharacter ? [mainCharacter] : []),
    ...subCharacters.filter((c) => c !== mainCharacter),
  ];
  const otherCharacters = CHARACTERS.filter((c) => !myCharacters.includes(c));
  const [myCharacter, setMyCharacter] = useState(mainCharacter || "");
  const [opponentCharacter, setOpponentCharacter] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "">("");
  const [memo, setMemo] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [continuous, setContinuous] = useState(false);
  const [lp, setLp] = useState("");
  const [mr, setMr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Character strategy notes
  const [existingNotes, setExistingNotes] = useState("");
  const [strategyNote, setStrategyNote] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Fetch existing notes when matchup changes
  useEffect(() => {
    if (myCharacter && opponentCharacter) {
      setLoadingNotes(true);
      getCharacterNote(myCharacter, opponentCharacter)
        .then((note) => {
          setExistingNotes(note.content || "");
          if (note.content) setNotesExpanded(true);
        })
        .catch(() => setExistingNotes(""))
        .finally(() => setLoadingNotes(false));
    } else {
      setExistingNotes("");
      setNotesExpanded(false);
    }
  }, [myCharacter, opponentCharacter]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewUrl(URL.createObjectURL(file));
    setParsing(true);
    setError("");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await parseMatchImage(base64);

      const allMyChars = [mainCharacter, ...subCharacters];
      let iAmPlayer1 = true;
      if (allMyChars.includes(data.player2) && !allMyChars.includes(data.player1)) {
        iAmPlayer1 = false;
      }

      const me = iAmPlayer1 ? data.player1 : data.player2;
      const opponent = iAmPlayer1 ? data.player2 : data.player1;
      const didWin = (data.winner === "player1" && iAmPlayer1) || (data.winner === "player2" && !iAmPlayer1);

      setMyCharacter(me);
      setOpponentCharacter(opponent);
      setResult(didWin ? "win" : "loss");
    } catch (err: any) {
      setError(err.message || t("record.parseError"));
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCharacter || !opponentCharacter || !result) {
      setError(t("record.charAndResultRequired"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await createMemo({
        myCharacter,
        opponentCharacter,
        result,
        memo,
        tags: selectedTags,
        isPublic,
        lp: lp ? parseInt(lp) : null,
        mr: mr ? parseInt(mr) : null,
      });

      // Save strategy note if user wrote one
      if (strategyNote.trim()) {
        const timestamp = new Date().toLocaleDateString("ja-JP");
        const newEntry = `[${timestamp}] ${strategyNote.trim()}`;
        const updated = existingNotes
          ? existingNotes + "\n" + newEntry
          : newEntry;
        await saveCharacterNote(myCharacter, opponentCharacter, updated);
        setExistingNotes(updated);
        setStrategyNote("");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (continuous) {
        setResult("");
        setMemo("");
        setSelectedTags([]);
        setPreviewUrl(null);
        setLp("");
        setMr("");
        setStrategyNote("");
      } else {
        onNavigate("dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="record-page">
      <h2>{t("record.title")}</h2>

      <div className="photo-capture">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageCapture}
          style={{ display: "none" }}
          id="capture-input"
        />
        <button
          type="button"
          className="btn-capture"
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
        >
          {parsing ? t("record.parsing") : t("record.capture")}
        </button>
        {previewUrl && (
          <div className="preview-container">
            <img src={previewUrl} alt={t("record.resultScreenAlt")} className="preview-image" />
          </div>
        )}
      </div>

      <div className="divider"><span>{t("record.orManual")}</span></div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            {t("record.myCharacter")}
            <select value={myCharacter} onChange={(e) => setMyCharacter(e.target.value)} required>
              <option value="">{t("common.select")}</option>
              {myCharacters.length > 0 && (
                <optgroup label={t("record.myCharGroup")}>
                  {myCharacters.map((c) => (
                    <option key={c} value={c}>{c}{c === mainCharacter ? t("record.mainSuffix") : t("record.subSuffix")}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label={t("record.otherCharGroup")}>
                {otherCharacters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>
          </label>

          <span className="vs-label">vs</span>

          <label>
            {t("record.opponentCharacter")}
            <CharacterSelect value={opponentCharacter} onChange={setOpponentCharacter} showAll allLabel={t("common.select")} />
          </label>
        </div>

        {/* Character strategy notes section */}
        {myCharacter && opponentCharacter && (
          <div className="strategy-notes-section">
            <button
              type="button"
              className="strategy-toggle"
              onClick={() => setNotesExpanded(!notesExpanded)}
            >
              {t("record.strategyNotes")} {existingNotes ? "(" + existingNotes.split("\n").length + ")" : ""}
              <span className={notesExpanded ? "arrow-up" : "arrow-down"}>
                {notesExpanded ? "\u25B2" : "\u25BC"}
              </span>
            </button>

            {notesExpanded && (
              <div className="strategy-notes-content">
                {loadingNotes ? (
                  <p className="loading-sm">{t("common.loading")}</p>
                ) : existingNotes ? (
                  <div className="existing-notes">
                    {existingNotes.split("\n").map((line, i) => (
                      <p key={i} className="note-line">{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="empty-notes">{t("record.noStrategyYet")}</p>
                )}

                <textarea
                  value={strategyNote}
                  onChange={(e) => setStrategyNote(e.target.value)}
                  placeholder={t("record.strategyPlaceholder")}
                  rows={2}
                  className="strategy-input"
                />
              </div>
            )}
          </div>
        )}

        <div className="result-buttons">
          <button
            type="button"
            className={`result-btn win ${result === "win" ? "selected" : ""}`}
            onClick={() => setResult("win")}
          >
            {t("common.win")}
          </button>
          <button
            type="button"
            className={`result-btn loss ${result === "loss" ? "selected" : ""}`}
            onClick={() => setResult("loss")}
          >
            {t("common.lose")}
          </button>
        </div>

        <div className="form-row">
          <label>
            {t("record.lp")}
            <input type="number" value={lp} onChange={(e) => setLp(e.target.value)} placeholder="LP" />
          </label>
          <label>
            {t("record.mr")}
            <input type="number" value={mr} onChange={(e) => setMr(e.target.value)} placeholder="MR" />
          </label>
        </div>

        <label>
          {t("record.memo")}
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder={t("record.memoPlaceholder")}
            rows={3}
          />
        </label>

        <div className="tags-section">
          <p>{t("record.tags")}</p>
          <div className="tag-buttons">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-btn ${selectedTags.includes(tag) ? "selected" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {TAG_KEY_MAP[tag] ? t(TAG_KEY_MAP[tag]) : tag}
              </button>
            ))}
          </div>
        </div>

        <div className="options-row">
          <label className="checkbox-label">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            {t("record.publishToCommunity")}
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} />
            {t("record.continuousMode")}
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {saved && <p className="success">{t("record.saved")}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? t("common.saving") : t("record.submitButton")}
        </button>
      </form>
    </div>
  );
}
