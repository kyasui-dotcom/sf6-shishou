import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getSetplays, createSetplay, updateSetplay, deleteSetplay } from "../lib/api";
import { CharacterSelect } from "../components/CharacterSelect";
import type { Setplay, SetplayNode } from "../lib/types";

type Props = {
  mainCharacter: string;
  onNavigate?: (page: "combos" | "setplay") => void;
};

function newNode(label: string, type: SetplayNode["type"] = "action"): SetplayNode {
  return { id: crypto.randomUUID(), label, type, children: [] };
}

function defaultTree(): SetplayNode {
  return {
    id: crypto.randomUUID(),
    label: "",
    type: "action",
    children: [
      { id: crypto.randomUUID(), label: "", type: "branch", children: [
        { id: crypto.randomUUID(), label: "", type: "result", children: [] },
      ]},
    ],
  };
}

// Recursive tree renderer
function TreeNode({ node, depth, onUpdate, onDelete, onAddChild, t }: {
  node: SetplayNode;
  depth: number;
  onUpdate: (id: string, label: string, type: SetplayNode["type"]) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  t: (key: string) => string;
}) {
  const typeColors: Record<string, string> = {
    action: "var(--accent)",
    branch: "var(--win)",
    result: "var(--text-muted)",
  };

  const typeLabels: Record<string, string> = {
    action: t("setplay.action"),
    branch: t("setplay.branch"),
    result: t("setplay.result"),
  };

  return (
    <div className="sp-node" style={{ marginLeft: depth * 20 }}>
      <div className="sp-node-row">
        <div className="sp-node-line" style={{ borderColor: typeColors[node.type] }} />
        <select
          className="sp-node-type"
          value={node.type}
          onChange={(e) => onUpdate(node.id, node.label, e.target.value as SetplayNode["type"])}
          style={{ color: typeColors[node.type] }}
        >
          <option value="action">{typeLabels.action}</option>
          <option value="branch">{typeLabels.branch}</option>
          <option value="result">{typeLabels.result}</option>
        </select>
        <input
          className="sp-node-label"
          value={node.label}
          onChange={(e) => onUpdate(node.id, e.target.value, node.type)}
          placeholder={typeLabels[node.type]}
        />
        <button className="sp-btn-add" type="button" onClick={() => onAddChild(node.id)} title="+">+</button>
        {depth > 0 && (
          <button className="sp-btn-del" type="button" onClick={() => onDelete(node.id)} title="x">&times;</button>
        )}
      </div>
      {node.children && node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddChild={onAddChild}
          t={t}
        />
      ))}
    </div>
  );
}

// Deep clone + update/delete helpers
function updateNodeInTree(tree: SetplayNode, id: string, label: string, type: SetplayNode["type"]): SetplayNode {
  if (tree.id === id) return { ...tree, label, type };
  return { ...tree, children: (tree.children || []).map(c => updateNodeInTree(c, id, label, type)) };
}

function deleteNodeInTree(tree: SetplayNode, id: string): SetplayNode {
  return { ...tree, children: (tree.children || []).filter(c => c.id !== id).map(c => deleteNodeInTree(c, id)) };
}

function addChildToNode(tree: SetplayNode, parentId: string): SetplayNode {
  if (tree.id === parentId) {
    return { ...tree, children: [...(tree.children || []), newNode("", "branch")] };
  }
  return { ...tree, children: (tree.children || []).map(c => addChildToNode(c, parentId)) };
}

export function SetplayPage({ mainCharacter, onNavigate }: Props) {
  const { t } = useTranslation();
  const [character, setCharacter] = useState(mainCharacter || "Ryu");
  const [setplays, setSetplays] = useState<Setplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState("");
  const [formSituation, setFormSituation] = useState("");
  const [formTree, setFormTree] = useState<SetplayNode>(defaultTree());

  const load = useCallback(() => {
    setLoading(true);
    getSetplays(character)
      .then((data: Setplay[]) => setSetplays(data))
      .finally(() => setLoading(false));
  }, [character]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setFormName("");
    setFormSituation("");
    setFormTree(defaultTree());
  };

  const startAdd = () => {
    setEditingId(null);
    resetForm();
    setAdding(true);
  };

  const startEdit = (sp: Setplay) => {
    setAdding(false);
    setEditingId(sp.id);
    setFormName(sp.name);
    setFormSituation(sp.situation);
    setFormTree(sp.tree || defaultTree());
  };

  const cancel = () => {
    setEditingId(null);
    setAdding(false);
    resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (adding) {
        await createSetplay({ character, name: formName, situation: formSituation, tree: formTree });
      } else if (editingId) {
        await updateSetplay(editingId, { name: formName, situation: formSituation, tree: formTree });
      }
      cancel();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("setplay.deleteConfirm"))) return;
    await deleteSetplay(id);
    if (editingId === id) cancel();
    load();
  };

  const handleUpdateNode = (id: string, label: string, type: SetplayNode["type"]) => {
    setFormTree(prev => updateNodeInTree(prev, id, label, type));
  };

  const handleDeleteNode = (id: string) => {
    setFormTree(prev => deleteNodeInTree(prev, id));
  };

  const handleAddChild = (parentId: string) => {
    setFormTree(prev => addChildToNode(prev, parentId));
  };

  const renderForm = () => (
    <div className="sp-form">
      <input
        className="sp-name-input"
        value={formName}
        onChange={(e) => setFormName(e.target.value)}
        placeholder={t("setplay.namePlaceholder")}
      />
      <input
        className="sp-situation-input"
        value={formSituation}
        onChange={(e) => setFormSituation(e.target.value)}
        placeholder={t("setplay.situationPlaceholder")}
      />
      <div className="sp-tree-editor">
        <TreeNode
          node={formTree}
          depth={0}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onAddChild={handleAddChild}
          t={t}
        />
      </div>
      <div className="sp-form-actions">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
        <button className="btn-cancel" onClick={cancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );

  // Read-only tree renderer
  const renderTree = (node: SetplayNode, depth: number = 0): JSX.Element => {
    const typeEmoji: Record<string, string> = { action: "▶", branch: "◆", result: "●" };
    return (
      <div key={node.id} className="sp-view-node" style={{ marginLeft: depth * 16 }}>
        <span className={"sp-view-type " + node.type}>{typeEmoji[node.type] || "▶"}</span>
        <span className="sp-view-label">{node.label || "..."}</span>
        {node.children && node.children.map(c => renderTree(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="setplay-page">
      <div className="page-tabs">
        <button className="page-tab" onClick={() => onNavigate && onNavigate("combos")}>{t("combos.title")}</button>
        <button className="page-tab active">{t("setplay.title")}</button>
      </div>

      <div className="sp-header">
        <CharacterSelect value={character} onChange={(v) => { setCharacter(v); cancel(); }} />
        {!adding && !editingId && (
          <button className="btn-primary" onClick={startAdd}>{t("setplay.add")}</button>
        )}
      </div>

      {adding && <div className="sp-card editing">{renderForm()}</div>}

      {loading ? (
        <div className="loading">{t("common.loading")}</div>
      ) : setplays.length === 0 && !adding ? (
        <p className="empty-state">{t("setplay.empty")}</p>
      ) : (
        <div className="sp-list">
          {setplays.map((sp) => (
            <div key={sp.id} className={"sp-card" + (editingId === sp.id ? " editing" : "")}>
              {editingId === sp.id ? renderForm() : (
                <div onClick={() => startEdit(sp)}>
                  <div className="sp-card-header">
                    <strong>{sp.name || t("setplay.unnamed")}</strong>
                    {sp.situation && <span className="sp-situation">{sp.situation}</span>}
                    <button className="sp-btn-del float-right" onClick={(e) => { e.stopPropagation(); handleDelete(sp.id); }}>&times;</button>
                  </div>
                  <div className="sp-tree-view">
                    {sp.tree && renderTree(sp.tree)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
