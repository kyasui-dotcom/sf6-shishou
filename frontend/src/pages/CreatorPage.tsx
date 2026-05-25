import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getCreatorDetail, subscribeToCreator, translateMemo } from "../lib/api";
import { TAG_KEY_MAP } from "../lib/constants";
import type { CreatorDetail } from "../lib/types";

const UNSUPPORTED_TRANSLATE_LANGS = ["th"];

type Props = {
  creatorId: string;
  plan: string;
  onBack: () => void;
};

export function CreatorPage({ creatorId, plan, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const currentLang = i18n.language.split("-")[0];
  const isTranslationSupported = !UNSUPPORTED_TRANSLATE_LANGS.includes(currentLang);

  useEffect(() => {
    setLoading(true);
    getCreatorDetail(creatorId)
      .then(setCreator)
      .finally(() => setLoading(false));
  }, [creatorId]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const { url } = await subscribeToCreator(creatorId);
      window.location.href = url;
    } catch {
      // ignore
    } finally {
      setSubscribing(false);
    }
  };

  const handleTranslate = async (memoId: string) => {
    setTranslating((prev) => ({ ...prev, [memoId]: true }));
    try {
      const result = await translateMemo(memoId, currentLang);
      setTranslations((prev) => ({ ...prev, [memoId]: result.translatedText }));
    } catch {
      // ignore
    } finally {
      setTranslating((prev) => ({ ...prev, [memoId]: false }));
    }
  };

  if (loading) {
    return <div className="loading">{t("common.loading")}</div>;
  }

  if (!creator) {
    return <div className="empty-state">{t("community.creatorNotFound")}</div>;
  }

  return (
    <div className="creator-page">
      <button className="btn-back" onClick={onBack}>&larr; {t("common.back")}</button>

      <div className="creator-profile">
        <h2>{creator.displayName || creator.username}</h2>
        <p className="creator-meta">{creator.mainCharacter}</p>
        {creator.bio && <p className="creator-bio-full">{creator.bio}</p>}

        {!creator.isOwner && !creator.isSubscribed && (
          <button
            className="btn-primary btn-subscribe"
            onClick={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing
              ? t("common.loading")
              : `${t("community.subscribeTo")} - ¥${creator.monthlyPrice.toLocaleString()}/${t("community.month")}`
            }
          </button>
        )}
        {creator.isSubscribed && (
          <div className="subscribed-badge">{t("community.subscribed")}</div>
        )}
      </div>

      <h3>{t("community.creatorMemos")} ({creator.memos.length})</h3>

      <div className="memo-list">
        {creator.memos.map((m) => (
          <div key={m.id} className={`memo-item ${m.result}`}>
            <div className="memo-header">
              <span className={`result-badge ${m.result}`}>
                {m.result === "win" ? t("common.win") : t("common.lose")}
              </span>
              <span className="matchup">{m.myCharacter} vs {m.opponentCharacter}</span>
            </div>
            {m.memo && (
              <p className="memo-text">
                {m.memo}
                {m.isPreview && (
                  <span className="preview-ellipsis">
                    ... <span className="preview-lock">{t("community.subscribeToRead")}</span>
                  </span>
                )}
              </p>
            )}
            {m.tags?.length > 0 && (
              <div className="memo-tags">
                {m.tags.map((tg: string) => (
                  <span key={tg} className="tag-sm">{TAG_KEY_MAP[tg] ? t(TAG_KEY_MAP[tg]) : tg}</span>
                ))}
              </div>
            )}
            {/* Translation */}
            {m.memo && !m.isPreview && isTranslationSupported && plan !== "free" && (
              <div className="translate-section">
                {translations[m.id] ? (
                  <div className="translated-text">
                    <span className="translated-label">{t("community.translatedLabel")}</span>
                    <p className="memo-text">{translations[m.id]}</p>
                    <button
                      className="btn-translate-toggle"
                      onClick={() => setTranslations((prev) => {
                        const next = { ...prev };
                        delete next[m.id];
                        return next;
                      })}
                    >
                      {t("community.hideTranslation")}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-translate"
                    onClick={() => handleTranslate(m.id)}
                    disabled={translating[m.id]}
                  >
                    {translating[m.id] ? t("community.translating") : t("community.translate")}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
