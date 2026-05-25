import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createCheckoutSession } from "../lib/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function UpgradeModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await createCheckoutSession();
      if (res.url) window.location.href = res.url;
      else alert(res.error || "エラーが発生しました");
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upgrade-modal-overlay" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t("common.premiumRequired")}</h3>
        <p>{t("common.premiumDescription")}</p>
        <div className="upgrade-modal-actions">
          <button className="btn-upgrade" onClick={handleUpgrade} disabled={loading}>
            {loading ? t("common.processing") : t("common.upgradeNow")}
          </button>
          <button className="btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
