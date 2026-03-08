const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "エラーが発生しました");
  }
  return data;
}

// Auth
export async function register(username: string, email: string, password: string, mainCharacter: string, subCharacters: string[] = []) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password, mainCharacter, subCharacters }),
  });
  localStorage.setItem("token", data.token);
  return data.user;
}

export async function login(email: string, password: string) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("token", data.token);
  return data.user;
}

export async function getMe() {
  return request("/auth/me");
}

export function logout() {
  localStorage.removeItem("token");
}

export function isLoggedIn() {
  return !!getToken();
}

// Image parsing
export async function parseMatchImage(imageBase64: string) {
  return request("/memos/parse-image", {
    method: "POST",
    body: JSON.stringify({ image: imageBase64 }),
  });
}

// Memos
export async function createMemo(memo: {
  myCharacter: string;
  opponentCharacter: string;
  result: "win" | "loss";
  memo: string;
  tags: string[];
  isPublic: boolean;
}) {
  return request("/memos", { method: "POST", body: JSON.stringify(memo) });
}

export async function getMemos(filters?: {
  opponent?: string;
  myCharacter?: string;
  result?: string;
  tag?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.opponent) params.set("opponent", filters.opponent);
  if (filters?.myCharacter) params.set("myCharacter", filters.myCharacter);
  if (filters?.result) params.set("result", filters.result);
  if (filters?.tag) params.set("tag", filters.tag);
  const qs = params.toString();
  return request(`/memos${qs ? `?${qs}` : ""}`);
}

export async function deleteMemo(id: string) {
  return request(`/memos/${id}`, { method: "DELETE" });
}

// Stats
export async function getStats() {
  return request("/stats");
}

// Analysis
export async function analyzeMatches(myCharacter?: string, opponentCharacter?: string) {
  return request("/analysis", {
    method: "POST",
    body: JSON.stringify({ myCharacter, opponentCharacter }),
  });
}

// Community
export async function getCommunityMemos(filters?: {
  myCharacter?: string;
  opponent?: string;
  result?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.myCharacter) params.set("myCharacter", filters.myCharacter);
  if (filters?.opponent) params.set("opponent", filters.opponent);
  if (filters?.result) params.set("result", filters.result);
  const qs = params.toString();
  return request(`/community/memos${qs ? `?${qs}` : ""}`);
}

// Counter-strategy
export async function getCounterAdvice(myCharacter: string, opponentCharacter: string, annoyingMove: string) {
  return request("/counter", {
    method: "POST",
    body: JSON.stringify({ myCharacter, opponentCharacter, annoyingMove }),
  });
}

// Feedback
export async function submitFeedback(content: string, category: string) {
  return request("/feedback", {
    method: "POST",
    body: JSON.stringify({ content, category }),
  });
}

export async function getFeedbackList(category?: string) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  const qs = params.toString();
  return request(`/feedback${qs ? `?${qs}` : ""}`);
}

export async function voteFeedback(id: string) {
  return request(`/feedback/${id}/vote`, { method: "POST" });
}
