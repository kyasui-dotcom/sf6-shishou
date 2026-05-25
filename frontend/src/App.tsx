import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RecordPage } from "./pages/RecordPage";
import { MemosPage } from "./pages/MemosPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CommunityPage } from "./pages/CommunityPage";
import { CreatorPage } from "./pages/CreatorPage";
import { CreatorSettingsPage } from "./pages/CreatorSettingsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotesPage } from "./pages/NotesPage";
import { CombosPage } from "./pages/CombosPage";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { FrameDataPage } from "./pages/FrameDataPage";
import { SetplayPage } from "./pages/SetplayPage";
import "./styles.css";

type Page = "dashboard" | "record" | "memos" | "combos" | "notes" | "analysis" | "community" | "creator" | "creator-settings" | "settings" | "frame-data" | "setplay";

export default function App() {
  const { user, loading, login, register, logout, refresh } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [animating, setAnimating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { t, i18n } = useTranslation();

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstallPrompt(null));
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  // Theme state
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("sf6-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sf6-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0f0f1a" : "#f0f2f5");
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  // Sync <html lang> with i18n language
  useEffect(() => {
    document.documentElement.lang = i18n.language.split("-")[0];
  }, [i18n.language]);

  // Handle Stripe checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const creatorSub = params.get("creator_sub");
    const creatorId = params.get("creator");

    if (checkout === "success") {
      setToast(t("app.toast.upgradeComplete"));
      setCurrentPage("analysis");
      refresh();
    } else if (checkout === "cancel") {
      setToast(t("app.toast.upgradeCancelled"));
    } else if (creatorSub === "success" && creatorId) {
      setToast(t("app.toast.subscriptionComplete"));
      setSelectedCreatorId(creatorId);
      setCurrentPage("creator");
      refresh();
    } else if (creatorSub === "cancel") {
      setToast(t("app.toast.subscriptionCancelled"));
    }

    const creatorReturn = params.get("creator");
    if (params.get("creator") === "complete") {
      setToast(t("app.toast.creatorSetupComplete"));
      setCurrentPage("creator-settings");
    }

    if (checkout || creatorSub || creatorReturn) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refresh, t]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const navigateTo = useCallback((page: Page) => {
    if (page === currentPage) return;
    setAnimating(true);
    if (mainRef.current) {
      mainRef.current.classList.add("page-exit");
    }
    setTimeout(() => {
      setCurrentPage(page);
      setAnimating(false);
      if (mainRef.current) {
        mainRef.current.classList.remove("page-exit");
        mainRef.current.classList.add("page-enter");
        mainRef.current.scrollTo(0, 0);
      }
      setTimeout(() => {
        if (mainRef.current) {
          mainRef.current.classList.remove("page-enter");
        }
      }, 200);
    }, 150);
  }, [currentPage]);

  if (loading) {
    return (
      <div className="splash-screen">
        <div className="splash-icon">🥋</div>
        <div className="splash-title">{t("app.title")}</div>
        <div className="splash-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage onNavigate={(p) => navigateTo(p as Page)} />;
      case "record":
        return <RecordPage mainCharacter={user.mainCharacter} subCharacters={user.subCharacters || []} onNavigate={(p) => navigateTo(p as Page)} />;
      case "memos":
        return <MemosPage />;
      case "combos":
        return <CombosPage mainCharacter={user.mainCharacter} onNavigate={navigateTo} />;
      case "notes":
        return <NotesPage mainCharacter={user.mainCharacter} />;
      case "analysis":
        return <AnalysisPage mainCharacter={user.mainCharacter} plan={user.plan || "free"} />;
      case "community":
        return (
          <CommunityPage
            plan={user.plan || "free"}
            onNavigateCreator={(id) => {
              setSelectedCreatorId(id);
              navigateTo("creator" as Page);
            }}
          />
        );
      case "creator":
        return selectedCreatorId ? (
          <CreatorPage
            creatorId={selectedCreatorId}
            plan={user.plan || "free"}
            onBack={() => navigateTo("community")}
          />
        ) : null;
      case "creator-settings":
        return <CreatorSettingsPage onBack={() => navigateTo("settings")} plan={user.plan || "free"} />;
      case "frame-data":
        return <FrameDataPage mainCharacter={user.mainCharacter} />;
      case "setplay":
        return <SetplayPage mainCharacter={user.mainCharacter} onNavigate={navigateTo} />;
      case "settings":
        return (
          <SettingsPage
            plan={user.plan || "free"}
            onNavigateCreatorSettings={() => navigateTo("creator-settings" as Page)}
          />
        );
    }
  };

  return (
    <div className="app">
      {toast && (
        <div className="toast" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      <header className="app-header">
        <h1 onClick={() => navigateTo("dashboard")}>🥋 {t("app.title")}</h1>
        <div className="header-right">
          <button className="btn-theme-toggle" onClick={toggleTheme} title={t("app.toggleTheme")}>
            {theme === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
          <LanguageSwitcher />
          <span className="username">{user.username}</span>
          <button className="btn-settings" onClick={() => navigateTo("settings")}>{t("app.settings")}</button>
          <button className="btn-logout" onClick={logout}>{t("app.logout")}</button>
        </div>
      </header>

      {installPrompt && (
        <div className="install-banner">
          <span>{t("app.installBanner")}</span>
          <div className="install-banner-actions">
            <button className="btn-install" onClick={handleInstall}>{t("app.installButton")}</button>
            <button className="btn-install-dismiss" onClick={() => setInstallPrompt(null)}>&#x2715;</button>
          </div>
        </div>
      )}

      <main className="app-main" ref={mainRef}>
        {renderPage()}
      </main>

      <nav className="bottom-nav">
        <button className={currentPage === "dashboard" ? "active" : ""} onClick={() => navigateTo("dashboard")} disabled={animating}>
          <span className="nav-icon">📊</span>
          <span>{t("app.nav.home")}</span>
        </button>
        <button className={currentPage === "record" ? "active" : ""} onClick={() => navigateTo("record")} disabled={animating}>
          <span className="nav-icon">✏️</span>
          <span>{t("app.nav.record")}</span>
        </button>
        <button className={currentPage === "combos" ? "active" : ""} onClick={() => navigateTo("combos")} disabled={animating}>
          <span className="nav-icon">🎮</span>
          <span>{t("app.nav.combos")}</span>
        </button>
        <button className={currentPage === "analysis" ? "active" : ""} onClick={() => navigateTo("analysis")} disabled={animating}>
          <span className="nav-icon">🤖</span>
          <span>{t("app.nav.analysis")}</span>
        </button>
        <button className={currentPage === "frame-data" ? "active" : ""} onClick={() => navigateTo("frame-data")} disabled={animating}>
          <span className="nav-icon">🔢</span>
          <span>{t("app.nav.frameData")}</span>
        </button>
        <button className={currentPage === "community" ? "active" : ""} onClick={() => navigateTo("community")} disabled={animating}>
          <span className="nav-icon">🌐</span>
          <span>{t("app.nav.community")}</span>
        </button>
      </nav>
    </div>
  );
}
