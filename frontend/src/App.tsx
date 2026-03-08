import { useState, useRef, useCallback } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { RecordPage } from "./pages/RecordPage";
import { MemosPage } from "./pages/MemosPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { CommunityPage } from "./pages/CommunityPage";
import "./styles.css";

type Page = "dashboard" | "record" | "memos" | "analysis" | "community";

export default function App() {
  const { user, loading, login, register, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [animating, setAnimating] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const navigateTo = useCallback((page: Page) => {
    if (page === currentPage) return;
    setAnimating(true);
    // Fade out
    if (mainRef.current) {
      mainRef.current.classList.add("page-exit");
    }
    setTimeout(() => {
      setCurrentPage(page);
      setAnimating(false);
      if (mainRef.current) {
        mainRef.current.classList.remove("page-exit");
        mainRef.current.classList.add("page-enter");
        // Scroll to top on page change
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
        <div className="splash-title">スト6師匠</div>
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
      case "analysis":
        return <AnalysisPage mainCharacter={user.mainCharacter} plan={user.plan || "free"} />;
      case "community":
        return <CommunityPage />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 onClick={() => navigateTo("dashboard")}>🥋 スト6師匠</h1>
        <div className="header-right">
          <span className="username">{user.username}</span>
          <button className="btn-logout" onClick={logout}>ログアウト</button>
        </div>
      </header>

      <main className="app-main" ref={mainRef}>
        {renderPage()}
      </main>

      <nav className="bottom-nav">
        <button className={currentPage === "dashboard" ? "active" : ""} onClick={() => navigateTo("dashboard")} disabled={animating}>
          <span className="nav-icon">📊</span>
          <span>ホーム</span>
        </button>
        <button className={currentPage === "record" ? "active" : ""} onClick={() => navigateTo("record")} disabled={animating}>
          <span className="nav-icon">✏️</span>
          <span>記録</span>
        </button>
        <button className={currentPage === "memos" ? "active" : ""} onClick={() => navigateTo("memos")} disabled={animating}>
          <span className="nav-icon">📝</span>
          <span>メモ</span>
        </button>
        <button className={currentPage === "analysis" ? "active" : ""} onClick={() => navigateTo("analysis")} disabled={animating}>
          <span className="nav-icon">🤖</span>
          <span>AI分析</span>
        </button>
        <button className={currentPage === "community" ? "active" : ""} onClick={() => navigateTo("community")} disabled={animating}>
          <span className="nav-icon">👥</span>
          <span>みんな</span>
        </button>
      </nav>
    </div>
  );
}
