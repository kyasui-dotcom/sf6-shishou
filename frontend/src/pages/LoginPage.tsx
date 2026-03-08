import { useState } from "react";
import { CHARACTERS } from "../lib/constants";

type Props = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string, mainCharacter: string, subCharacters: string[]) => Promise<void>;
};

export function LoginPage({ onLogin, onRegister }: Props) {
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
        <h1>🥋 スト6師匠</h1>
        <p className="subtitle">対戦メモ × AI分析</p>

        <div className="tab-switch">
          <button className={!isRegister ? "active" : ""} onClick={() => setIsRegister(false)}>
            ログイン
          </button>
          <button className={isRegister ? "active" : ""} onClick={() => setIsRegister(true)}>
            新規登録
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>
                ユーザー名
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </label>
              <label>
                メインキャラ
                <select value={mainCharacter} onChange={(e) => setMainCharacter(e.target.value)}>
                  <option value="">選択してください</option>
                  {CHARACTERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="sub-char-section">
                <p className="sub-char-label">サブキャラ（複数選択可）</p>
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
            メールアドレス
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            パスワード
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "処理中..." : isRegister ? "登録する" : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
