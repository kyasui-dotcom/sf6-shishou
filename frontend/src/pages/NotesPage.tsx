import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getCharacterNotes, getCharacterNote, saveCharacterNote } from "../lib/api";
import { CHARACTERS } from "../lib/constants";
import { CharacterSelect, CharacterIcon } from "../components/CharacterSelect";
import type { CharacterNote } from "../lib/types";

type Props = {
  mainCharacter: string;
};

export function NotesPage({ mainCharacter }: Props) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<CharacterNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [myChar, setMyChar] = useState(mainCharacter || CHARACTERS[0]);
  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const loadNotes = useCallback(() => {
    setLoading(true);
    getCharacterNotes(myChar)
      .then(setNotes)
      .finally(() => setLoading(false));
  }, [myChar]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const openNote = async (oppChar: string) => {
    setSelectedOpp(oppChar);
    setSaveMsg("");
    try {
      const note = await getCharacterNote(myChar, oppChar);
      setEditContent(note.content || "");
    } catch {
      setEditContent("");
    }
  };

  const handleSave = async () => {
    if (!selectedOpp) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await saveCharacterNote(myChar, selectedOpp, editContent);
      setSaveMsg(t("common.saved"));
      loadNotes();
    } catch (e: any) {
      setSaveMsg(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const noteMap = new Map<string, CharacterNote>();
  for (const n of notes) {
    noteMap.set(n.opponentCharacter, n);
  }

  if (selectedOpp) {
    return (
      <div className="notes-page">
        <button className="btn-back" onClick={() => { setSelectedOpp(null); loadNotes(); }}>
          {t("common.back")}
        </button>
        <h2 className="note-matchup-title">
          {myChar} vs {selectedOpp}
        </h2>
        <p className="note-hint">{t("notes.hint")}</p>
        <textarea
          className="note-editor"
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder={t("notes.editorPlaceholder", { opponent: selectedOpp })}
          rows={15}
        />
        <div className="note-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
          {saveMsg && <span className="save-msg">{saveMsg}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="notes-page">
      <h2>{t("notes.title")}</h2>

      <div className="notes-char-select">
        <label>{t("notes.myCharLabel")}</label>
        <CharacterSelect value={myChar} onChange={setMyChar} />
      </div>

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : (
        <div className="notes-grid">
          {CHARACTERS.filter((ch) => ch !== myChar).map((oppChar) => {
            const note = noteMap.get(oppChar);
            const hasContent = note && note.content;
            return (
              <button
                key={oppChar}
                className={`note-card ${hasContent ? "has-note" : ""}`}
                onClick={() => openNote(oppChar)}
              >
                <span className="note-card-name">{oppChar}</span>
                {hasContent && <span className="note-card-indicator"></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
