import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getApiBase, getVapidKey, subscribePush, unsubscribePush, getMemos, getCharacterNotes, getCombos, createCheckoutSession, createPortalSession } from "../lib/api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Props = {
  plan: string;
  onNavigateCreatorSettings?: () => void;
};

export function SettingsPage({ plan, onNavigateCreatorSettings }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleUpgrade = async () => {
    setStripeLoading(true);
    try {
      const res = await createCheckoutSession();
      if (res.url) window.location.href = res.url;
      else alert(res.error || "エラーが発生しました");
    } catch (err) {
      console.error("Checkout error:", err);
      alert("エラーが発生しました");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setStripeLoading(true);
    try {
      const res = await createPortalSession();
      if (res.url) window.location.href = res.url;
      else alert(res.error || "エラーが発生しました");
    } catch (err) {
      console.error("Portal error:", err);
      alert("エラーが発生しました");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [memos, notes, combos] = await Promise.all([
        getMemos(),
        getCharacterNotes(),
        getCombos(),
      ]);
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        app: "SF6 Shishou",
        memos,
        characterNotes: notes,
        combos,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sf6-shishou-export-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator) {
      setNotifEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    setNotifLoading(true);
    try {
      if (notifEnabled) {
        // Unsubscribe
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await unsubscribePush(sub.endpoint);
          await sub.unsubscribe();
        }
        setNotifEnabled(false);
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setNotifEnabled(false);
          return;
        }

        const { publicKey } = await getVapidKey();
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        });

        await subscribePush(sub.toJSON());
        setNotifEnabled(true);
      }
    } catch (err) {
      console.error("Push notification error:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const bookmarkletCode = useMemo(() => {
    const token = localStorage.getItem("token") || "";
    const apiBase = getApiBase();
    const code = `javascript:void((function(){
if(!location.hostname.includes('streetfighter.com')){alert('Buckler\\'s Boot Camp\\u306e\\u30da\\u30fc\\u30b8\\u3067\\u5b9f\\u884c\\u3057\\u3066\\u304f\\u3060\\u3055\\u3044\\nhttps://www.streetfighter.com/6/buckler/');return}
var T='${token}',A='${apiBase}';
var o=document.createElement('div');
o.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);color:white;display:flex;align-items:center;justify-content:center;z-index:99999;font-size:18px;flex-direction:column;gap:12px;font-family:sans-serif;';
o.innerHTML='<div>\\u6226\\u7e3e\\u30c7\\u30fc\\u30bf\\u3092\\u53d6\\u5f97\\u4e2d...</div>';
document.body.appendChild(o);
var nd=document.getElementById('__NEXT_DATA__');
if(!nd){o.innerHTML='<div>\\u30c7\\u30fc\\u30bf\\u304c\\u898b\\u3064\\u304b\\u308a\\u307e\\u305b\\u3093</div><div style=\\"font-size:14px\\">\\u6226\\u7e3e\\u30da\\u30fc\\u30b8(battlelog)\\u3092\\u958b\\u3044\\u3066\\u304b\\u3089\\u5b9f\\u884c\\u3057\\u3066\\u304f\\u3060\\u3055\\u3044</div>';setTimeout(function(){o.remove()},5000);return}
try{
var d=JSON.parse(nd.textContent);
function findReplays(obj,depth){
if(!obj||depth>8)return null;
if(Array.isArray(obj)){
for(var i=0;i<obj.length;i++){
if(obj[i]&&obj[i].replay_id)return obj;
var r=findReplays(obj[i],depth+1);if(r)return r;
}}
if(typeof obj==='object'){
for(var k in obj){
if(k==='replay_list'||k==='replayList')return obj[k];
var r=findReplays(obj[k],depth+1);if(r)return r;
}}return null}
var replays=findReplays(d,0);
if(!replays||replays.length===0){o.innerHTML='<div>\\u5bfe\\u6226\\u30c7\\u30fc\\u30bf\\u304c\\u898b\\u3064\\u304b\\u308a\\u307e\\u305b\\u3093</div><div style=\\"font-size:14px\\">\\u6226\\u7e3e\\u30da\\u30fc\\u30b8(battlelog)\\u3092\\u958b\\u3044\\u3066\\u304b\\u3089\\u5b9f\\u884c\\u3057\\u3066\\u304f\\u3060\\u3055\\u3044</div>';setTimeout(function(){o.remove()},5000);return}
var pm=location.pathname.match(/\\/profile\\/(\\d+)/);
var myId=pm?pm[1]:'';
var matches=[];
for(var i=0;i<replays.length;i++){
var rp=replays[i];
var p1=rp.player1_info||rp.player1Info;
var p2=rp.player2_info||rp.player2Info;
if(!p1||!p2)continue;
var p1id=String((p1.player||{}).short_id||(p1.player||{}).shortId||'');
var isP1=p1id===myId;
if(!myId)isP1=true;
var my=isP1?p1:p2;var op=isP1?p2:p1;
var myR=(my.round_results||my.roundResults||[]);
var opR=(op.round_results||op.roundResults||[]);
var myW=0,opW=0;
for(var j=0;j<myR.length;j++){if(myR[j]>0)myW++}
for(var j=0;j<opR.length;j++){if(opR[j]>0)opW++}
matches.push({
myCharacter:my.character_name||my.characterName||'Unknown',
opponentCharacter:op.character_name||op.characterName||'Unknown',
result:myW>opW?'win':'loss',
replayId:String(rp.replay_id||rp.replayId||Math.random()),
playedAt:rp.uploaded_at||rp.uploadedAt||'',
lp:my.league_point||my.leaguePoint||0,
mr:my.master_rating||my.masterRating||0
})}
if(matches.length===0){o.innerHTML='<div>\\u89e3\\u6790\\u3067\\u304d\\u308b\\u5bfe\\u6226\\u30c7\\u30fc\\u30bf\\u304c\\u3042\\u308a\\u307e\\u305b\\u3093</div>';setTimeout(function(){o.remove()},4000);return}
o.innerHTML='<div>'+matches.length+'\\u4ef6\\u306e\\u5bfe\\u6226\\u3092\\u9001\\u4fe1\\u4e2d...</div>';
fetch(A+'/import',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+T},body:JSON.stringify({matches:matches})}).then(function(r){return r.json()}).then(function(r){
if(r.error){o.innerHTML='<div>\\u30a8\\u30e9\\u30fc: '+r.error+'</div>';setTimeout(function(){o.remove()},5000);return}
o.innerHTML='<div style=\\"font-size:24px\\">\\u2705</div><div>'+r.imported+'\\u4ef6\\u30a4\\u30f3\\u30dd\\u30fc\\u30c8\\u5b8c\\u4e86</div>'+(r.skipped>0?'<div style=\\"font-size:14px\\">('+r.skipped+'\\u4ef6\\u30b9\\u30ad\\u30c3\\u30d7)</div>':'');
setTimeout(function(){o.remove()},5000)
}).catch(function(e){o.innerHTML='<div>\\u30a8\\u30e9\\u30fc: '+e.message+'</div>';setTimeout(function(){o.remove()},5000)})
}catch(e){o.innerHTML='<div>\\u30c7\\u30fc\\u30bf\\u89e3\\u6790\\u30a8\\u30e9\\u30fc: '+e.message+'</div>';setTimeout(function(){o.remove()},5000)}
})())`;
    return code.replace(/\n/g, "");
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="settings-page">
      <h2>{t("settings.title")}</h2>

      <div className="settings-section">
        <h3>{t("settings.importTitle")}</h3>
        <p className="settings-desc">
          {t("settings.importDescription")}
        </p>

        <div className="import-steps">
          <div className="step">
            <span className="step-num">1</span>
            <div>
              <strong>{t("settings.step1Title")}</strong>
              <p>{t("settings.step1Desc")}</p>
              <a
                className="bookmarklet-btn"
                href={bookmarkletCode}
                onClick={(e) => e.preventDefault()}
                draggable
              >
                {t("settings.bookmarkletLabel")}
              </a>
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? t("settings.copied") : t("settings.copyCode")}
              </button>
            </div>
          </div>

          <div className="step">
            <span className="step-num">2</span>
            <div>
              <strong>{t("settings.step2Title")}</strong>
              <p>
                <a href="https://www.streetfighter.com/6/buckler/" target="_blank" rel="noopener noreferrer">
                  Buckler's Boot Camp
                </a>
                {t("settings.step2Desc")}
              </p>
            </div>
          </div>

          <div className="step">
            <span className="step-num">3</span>
            <div>
              <strong>{t("settings.step3Title")}</strong>
              <p>{t("settings.step3Desc")}</p>
            </div>
          </div>
        </div>

        <div className="import-notes">
          <h4>{t("settings.notesTitle")}</h4>
          <ul>
            <li>{t("settings.note1")}</li>
            <li>{t("settings.note2")}</li>
            <li>{t("settings.note3")}</li>
            <li>{t("settings.note4")}</li>
          </ul>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t("settings.planTitle")}</h3>
        <p className="settings-desc">
          {t("settings.currentPlan")} <strong className={plan === "premium" ? "text-gold" : ""}>{plan === "premium" ? t("settings.planPremium") : t("settings.planFree")}</strong>
        </p>
        {plan === "premium" ? (
          <button
            className="btn-secondary"
            onClick={handleManageSubscription}
            disabled={stripeLoading}
            style={{ maxWidth: "300px", marginTop: "8px" }}
          >
            {stripeLoading ? t("common.processing") : t("settings.manageSubscription")}
          </button>
        ) : (
          <button
            className="btn-primary"
            onClick={handleUpgrade}
            disabled={stripeLoading}
            style={{ maxWidth: "300px", marginTop: "8px" }}
          >
            {stripeLoading ? t("common.processing") : t("settings.upgradePremium")}
          </button>
        )}
      </div>

      {("Notification" in window) && (
        <div className="settings-section">
          <h3>{t("settings.notifications")}</h3>
          <p className="settings-desc">{t("settings.notificationsDesc")}</p>
          <button
            className="btn-primary"
            onClick={handleToggleNotifications}
            disabled={notifLoading}
            style={{ maxWidth: "300px" }}
          >
            {notifLoading ? t("common.processing") : (
              notifEnabled ? t("settings.disableNotifications") : t("settings.enableNotifications")
            )}
          </button>
          {Notification.permission === "denied" && (
            <p className="error" style={{ marginTop: "8px" }}>{t("settings.notificationsDenied")}</p>
          )}
        </div>
      )}

      <div className="settings-section">
        <h3>{t("settings.exportTitle")}</h3>
        <p className="settings-desc">{t("settings.exportDescription")}</p>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={exporting}
          style={{ maxWidth: "300px" }}
        >
          {exporting ? t("common.processing") : exportDone ? t("settings.exportDone") : t("settings.exportButton")}
        </button>
      </div>

      <div className="settings-section">
        <h3>{t("creator.settingsTitle")}</h3>
        <p className="settings-desc">{t("creator.settingsDescription")}</p>
        <button className="btn-primary" onClick={onNavigateCreatorSettings}>
          {t("creator.manageButton")}
        </button>
      </div>
    </div>
  );
}
