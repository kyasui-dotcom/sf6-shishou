import { useState, useRef } from "react";
import { createMemo, parseMatchImage } from "../lib/api";
import { CHARACTERS, TAGS } from "../lib/constants";

type Props = {
  mainCharacter: string;
  subCharacters: string[];
  onNavigate: (page: string) => void;
};

export function RecordPage({ mainCharacter, subCharacters, onNavigate }: Props) {
  // メイン・サブを先頭に表示、残りは全キャラ
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    setPreviewUrl(URL.createObjectURL(file));
    setParsing(true);
    setError("");

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await parseMatchImage(base64);

      // Determine which side is the user
      // Default: assume player1 is the user, but check if either matches main/sub
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
      setError(err.message || "画像の解析に失敗しました");
    } finally {
      setParsing(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCharacter || !opponentCharacter || !result) {
      setError("キャラクターと勝敗を選択してください");
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
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);

      if (continuous) {
        setResult("");
        setMemo("");
        setSelectedTags([]);
        setPreviewUrl(null);
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
      <h2>対戦メモ記録</h2>

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
          {parsing ? "解析中..." : "📷 リザルト画面から入力"}
        </button>
        {previewUrl && (
          <div className="preview-container">
            <img src={previewUrl} alt="リザルト画面" className="preview-image" />
          </div>
        )}
      </div>

      <div className="divider"><span>または手動入力</span></div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            自分のキャラ
            <select value={myCharacter} onChange={(e) => setMyCharacter(e.target.value)} required>
              <option value="">選択</option>
              {myCharacters.length > 0 && (
                <optgroup label="マイキャラ">
                  {myCharacters.map((c) => (
                    <option key={c} value={c}>{c}{c === mainCharacter ? "（メイン）" : "（サブ）"}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="その他">
                {otherCharacters.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </optgroup>
            </select>
          </label>

          <span className="vs-label">vs</span>

          <label>
            相手のキャラ
            <select value={opponentCharacter} onChange={(e) => setOpponentCharacter(e.target.value)} required>
              <option value="">選択</option>
              {CHARACTERS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="result-buttons">
          <button
            type="button"
            className={`result-btn win ${result === "win" ? "selected" : ""}`}
            onClick={() => setResult("win")}
          >
            WIN
          </button>
          <button
            type="button"
            className={`result-btn loss ${result === "loss" ? "selected" : ""}`}
            onClick={() => setResult("loss")}
          >
            LOSE
          </button>
        </div>

        <label>
          メモ（なぜ勝った/負けた？）
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例：起き攻めで毎回投げを食らった。対空が全く出せなかった。"
            rows={3}
          />
        </label>

        <div className="tags-section">
          <p>タグ（該当するものを選択）</p>
          <div className="tag-buttons">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-btn ${selectedTags.includes(tag) ? "selected" : ""}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="options-row">
          <label className="checkbox-label">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            コミュニティに公開
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} />
            連続入力モード
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {saved && <p className="success">保存しました！</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "保存中..." : "記録する"}
        </button>
      </form>
    </div>
  );
}
