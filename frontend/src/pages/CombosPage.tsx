import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getCombos, createCombo, updateCombo, deleteCombo } from "../lib/api";
import { CHARACTERS } from "../lib/constants";
import { CharacterSelect } from "../components/CharacterSelect";
import type { ComboMemo, ControlType } from "../lib/types";
import { VideoEmbed } from "../components/VideoEmbed";
import { CommandInput } from "../components/CommandInput";

type Props = {
  mainCharacter: string;
  onNavigate?: (page: "combos" | "setplay") => void;
};

export function CombosPage({ mainCharacter, onNavigate }: Props) {
  const { t } = useTranslation();
  const [combos, setCombos] = useState<ComboMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [myChar, setMyChar] = useState(mainCharacter || CHARACTERS[0]);
  const [controlType, setControlType] = useState<ControlType>("classic");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCommand, setFormCommand] = useState("");
  const [formDamage, setFormDamage] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formIsPrivate, setFormIsPrivate] = useState(false);
  const [formControlType, setFormControlType] = useState<ControlType>("classic");

  const loadCombos = useCallback(() => {
    setLoading(true);
    getCombos(myChar, controlType)
      .then(setCombos)
      .finally(() => setLoading(false));
  }, [myChar, controlType]);

  useEffect(() => {
    loadCombos();
  }, [loadCombos]);

  const resetForm = () => {
    setFormName("");
    setFormCommand("");
    setFormDamage("");
    setFormMemo("");
    setFormVideoUrl("");
    setFormIsPrivate(false);
    setFormControlType(controlType);
  };

  const startAdd = () => {
    setEditingId(null);
    resetForm();
    setAdding(true);
  };

  const startEdit = (combo: ComboMemo) => {
    setAdding(false);
    setEditingId(combo.id);
    setFormName(combo.name);
    setFormCommand(combo.command);
    setFormDamage(combo.damage ? String(combo.damage) : "");
    setFormMemo(combo.memo);
    setFormVideoUrl(combo.videoUrl || "");
    setFormIsPrivate(combo.isPublic === false);
    setFormControlType(combo.controlType || "classic");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dmg = formDamage ? parseInt(formDamage, 10) : undefined;
      if (adding) {
        await createCombo({
          character: myChar,
          controlType: formControlType,
          name: formName,
          command: formCommand,
          damage: dmg,
          memo: formMemo,
          videoUrl: formVideoUrl || undefined,
          isPublic: !formIsPrivate,
        });
      } else if (editingId) {
        await updateCombo(editingId, {
          name: formName,
          command: formCommand,
          damage: dmg ?? null,
          memo: formMemo,
          videoUrl: formVideoUrl || null,
          isPublic: !formIsPrivate,
          controlType: formControlType,
        });
      }
      cancelEdit();
      loadCombos();
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("combos.deleteConfirm"))) return;
    await deleteCombo(id);
    if (editingId === id) cancelEdit();
    loadCombos();
  };

  const renderForm = () => (
    <div className="combo-form">
      <div className="combo-form-row">
        <label>{t("combos.controlType")}</label>
        <div className="control-type-toggle">
          <button
            type="button"
            className={`ctrl-btn ${formControlType === "classic" ? "active" : ""}`}
            onClick={() => setFormControlType("classic")}
          >
            {t("combos.classic")}
          </button>
          <button
            type="button"
            className={`ctrl-btn ${formControlType === "modern" ? "active" : ""}`}
            onClick={() => setFormControlType("modern")}
          >
            {t("combos.modern")}
          </button>
        </div>
      </div>
      <div className="combo-form-row">
        <label>{t("combos.name")}</label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder={t("combos.namePlaceholder")}
        />
      </div>
      <div className="combo-form-row">
        <label>{t("combos.command")}</label>
        <CommandInput
          value={formCommand}
          onChange={setFormCommand}
          placeholder={t("combos.commandPlaceholder")}
        />
      </div>
      <div className="combo-form-row">
        <label>{t("combos.damage")}</label>
        <input
          type="number"
          value={formDamage}
          onChange={(e) => setFormDamage(e.target.value)}
          placeholder="0"
          style={{ maxWidth: 120 }}
        />
      </div>
      <div className="combo-form-row">
        <label>{t("combos.memo")}</label>
        <textarea
          value={formMemo}
          onChange={(e) => setFormMemo(e.target.value)}
          placeholder={t("combos.memoPlaceholder")}
          rows={3}
        />
      </div>
      <div className="combo-form-row">
        <label>{t("combos.videoUrl")}</label>
        <input
          type="url"
          value={formVideoUrl}
          onChange={(e) => setFormVideoUrl(e.target.value)}
          placeholder={t("combos.videoUrlPlaceholder")}
        />
      </div>
      <div className="combo-form-row">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formIsPrivate}
            onChange={(e) => setFormIsPrivate(e.target.checked)}
          />
          {t("combos.makePrivate")}
        </label>
      </div>
      <div className="combo-form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
        <button className="btn-cancel" onClick={cancelEdit}>
          {t("common.cancel")}
        </button>
        {editingId && (
          <button className="btn-delete" onClick={() => handleDelete(editingId)} title={t("common.delete")}>
            {t("common.delete")}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="combos-page">
      <div className="page-tabs">
        <button className="page-tab active">{t("combos.title")}</button>
        <button className="page-tab" onClick={() => onNavigate && onNavigate("setplay")}>{t("setplay.title")}</button>
      </div>

      <div className="combos-header">
        <div className="combos-char-select">
          <label>{t("combos.myCharLabel")}</label>
          <CharacterSelect value={myChar} onChange={(v) => { setMyChar(v); cancelEdit(); }} />
        </div>
        <div className="control-type-toggle">
          <button
            className={`ctrl-btn ${controlType === "classic" ? "active" : ""}`}
            onClick={() => { setControlType("classic"); cancelEdit(); }}
          >
            {t("combos.classic")}
          </button>
          <button
            className={`ctrl-btn ${controlType === "modern" ? "active" : ""}`}
            onClick={() => { setControlType("modern"); cancelEdit(); }}
          >
            {t("combos.modern")}
          </button>
        </div>
        {!adding && !editingId && (
          <button className="btn-primary" onClick={startAdd}>
            {t("combos.addCombo")}
          </button>
        )}
      </div>

      {adding && (
        <div className="combo-card editing">
          {renderForm()}
        </div>
      )}

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : combos.length === 0 && !adding ? (
        <p className="empty-state">{t("combos.empty")}</p>
      ) : (
        <div className="combos-list">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className={`combo-card ${editingId === combo.id ? "editing" : ""}`}
              onClick={() => { if (editingId !== combo.id && !adding) startEdit(combo); }}
            >
              {editingId === combo.id ? (
                renderForm()
              ) : (
                <>
                  <div className="combo-card-header">
                    <span className="combo-card-name">
                      {combo.videoUrl && "🎬 "}
                      {combo.isPublic === false && "🔒 "}
                      {combo.name || t("combos.name")}
                    </span>
                    <span className={`ctrl-badge ${combo.controlType}`}>
                      {combo.controlType === "modern" ? "MO" : "CL"}
                    </span>
                    {combo.damage != null && combo.damage > 0 && (
                      <span className="combo-card-damage">{combo.damage} dmg</span>
                    )}
                  </div>
                  {combo.command && (
                    <div className="combo-card-command">{combo.command}</div>
                  )}
                  {combo.memo && (
                    <div className="combo-card-memo">{combo.memo}</div>
                  )}
                  {combo.videoUrl && (
                    <VideoEmbed url={combo.videoUrl} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
