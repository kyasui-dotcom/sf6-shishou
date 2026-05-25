import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CHARACTERS } from "../lib/constants";
import { CharacterSelect } from "../components/CharacterSelect";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string, mainCharacter: string, subCharacters: string[]) => Promise<void>;
};

export function LoginPage({ onLogin, onRegister }: Props) {
  const { t } = useTranslation();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mainCharacter, setMainCharacter] = useState("");
  const [subCharacters, setSubCharacters] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await onRegister(username, email, password, mainCharacter, subCharacters);
      } else {
        await onLogin(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-lang-switcher">
          <LanguageSwitcher />
        </div>
        <h1>🥋 {t("app.title")}</h1>
        <p className="subtitle">{t("app.subtitle")}</p>

        <div className="tab-switch">
          <button className={!isRegister ? "active" : ""} onClick={() => setIsRegister(false)}>
            {t("login.login")}
          </button>
          <button className={isRegister ? "active" : ""} onClick={() => setIsRegister(true)}>
            {t("login.register")}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>
                {t("login.username")}
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label>
                {t("login.mainCharacter")}
                <CharacterSelect value={mainCharacter} onChange={setMainCharacter} showAll allLabel={t("common.selectPlaceholder")} />
              </label>
              <div className="sub-char-section">
                <p className="sub-char-label">{t("login.subCharacters")}</p>
                <div className="sub-char-buttons">
                  {CHARACTERS.filter((c) => c !== mainCharacter).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`tag-btn ${subCharacters.includes(c) ? "selected" : ""}`}
                      onClick={() =>
                        setSubCharacters((prev) =>
                          prev.includes(c) ? prev.filter((s) => s !== c) : [...prev, c]
                        )
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <label>
            {t("login.email")}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {t("login.password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("common.processing") : isRegister ? t("login.registerButton") : t("login.login")}
          </button>
        </form>
      </div>
    </div>
  );
}
