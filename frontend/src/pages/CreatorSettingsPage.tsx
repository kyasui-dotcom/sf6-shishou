import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getMyCreatorProfile, registerCreator, updateCreatorProfile, getCreatorAnalytics, createCheckoutSession } from "../lib/api";
import type { CreatorProfile, CreatorAnalytics } from "../lib/types";

type Props = {
  onBack: () => void;
  plan: "free" | "premium";
};

export function CreatorSettingsPage({ onBack, plan }: Props) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState(500);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (plan === "free") {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyCreatorProfile()
      .then((p: CreatorProfile) => {
        setProfile(p);
        if (p.isCreator) {
          setDisplayName(p.displayName || "");
          setBio(p.bio || "");
          setMonthlyPrice(p.monthlyPrice || 500);
          setIsActive(p.isActive || false);
          if (p.onboardingComplete) {
            getCreatorAnalytics().then(setAnalytics).catch(() => {});
          }
        }
      })
      .finally(() => setLoading(false));
  }, [plan]);

  const handleRegister = async () => {
    setSaving(true);
    try {
      const { url } = await registerCreator();
      window.location.href = url;
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || t("common.error"));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCreatorProfile({ displayName, bio, monthlyPrice, isActive });
      setSaveMsg(t("common.saved"));
      setTimeout(() => setSaveMsg(""), 2000);
      const p = await getMyCreatorProfile();
      setProfile(p);
    } catch {
      setSaveMsg(t("common.error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  return (
    <div className="creator-settings-page">
      <button className="btn-back" onClick={onBack}>&larr; {t("common.back")}</button>
      <h2>{t("creator.settingsTitle")}</h2>

      {!profile?.isCreator ? (
        <div className="creator-register-section">
          <p>{t("creator.registerDescription")}</p>
          <ul className="creator-benefits">
            <li>{t("creator.benefit1")}</li>
            <li>{t("creator.benefit2")}</li>
            <li>{t("creator.benefit3")}</li>
          </ul>
          {plan === "free" ? (
            <div className="paywall-banner">
              <p>{t("creator.premiumRequired")}</p>
              <button className="btn-upgrade" onClick={handleUpgrade}>{t("analysis.upgrade")}</button>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleRegister} disabled={saving}>
              {saving ? t("common.loading") : t("creator.registerButton")}
            </button>
          )}
        </div>
      ) : !profile.onboardingComplete ? (
        <div className="creator-register-section">
          <p>{t("creator.onboardingIncomplete")}</p>
          <button className="btn-primary" onClick={handleRegister} disabled={saving}>
            {t("creator.continueOnboarding")}
          </button>
        </div>
      ) : (
        <>
        {analytics && (
          <div className="creator-dashboard">
            <h3>{t("creator.dashboard")}</h3>
            <div className="dashboard-stats">
              <div className="dashboard-stat-card">
                <span className="dashboard-stat-value">{analytics.subscriberCount}</span>
                <span className="dashboard-stat-label">{t("creator.totalSubscribers")}</span>
              </div>
              <div className="dashboard-stat-card">
                <span className="dashboard-stat-value creator-revenue">&yen;{analytics.estimatedRevenue.toLocaleString()}</span>
                <span className="dashboard-stat-label">{t("creator.estimatedRevenue")}</span>
              </div>
              <div className="dashboard-stat-card">
                <span className="dashboard-stat-value">{analytics.publicMemoCount}</span>
                <span className="dashboard-stat-label">{t("creator.publicMemos")}</span>
              </div>
            </div>
            {analytics.topMemos.length > 0 && (
              <div className="creator-top-memos">
                <h4>{t("creator.topMemos")}</h4>
                {analytics.topMemos.map(memo => (
                  <div key={memo.id} className="creator-top-memo-item">
                    <span className={`result-badge ${memo.result}`}>{memo.result === "win" ? "W" : "L"}</span>
                    <span className="matchup">{memo.myCharacter} vs {memo.opponentCharacter}</span>
                    <span className="like-count">{memo.likeCount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="creator-edit-form">
          <div className="form-group">
            <label>{t("creator.displayName")}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>{t("creator.bio")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("creator.bioPlaceholder")}
            />
          </div>

          <div className="form-group">
            <label>{t("creator.monthlyPrice")} (¥)</label>
            <input
              type="number"
              value={monthlyPrice}
              onChange={(e) => setMonthlyPrice(Math.max(300, parseInt(e.target.value) || 300))}
              min={300}
              max={100000}
            />
            <span className="form-hint">{t("creator.priceHint")}</span>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {t("creator.isActive")}
            </label>
          </div>

          {profile.subscriberCount !== undefined && profile.subscriberCount > 0 && (
            <p className="creator-stats">
              {t("creator.subscriberCount")}: {profile.subscriberCount}
            </p>
          )}

          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </button>
          {saveMsg && <p className="success">{saveMsg}</p>}
        </div>
        </>
      )}
    </div>
  );
}
