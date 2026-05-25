const API_BASE = import.meta.env.PROD
  ? "https://sf6-shishou-api.yasuikunihiro.workers.dev/api"
  : "/api";

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
    throw new Error(data.error || "Error");
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
  lp?: number | null;
  mr?: number | null;
}) {
  return request("/memos", { method: "POST", body: JSON.stringify(memo) });
}

export async function getMemos(filters?: {
  opponent?: string;
  myCharacter?: string;
  result?: string;
  tag?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.opponent) params.set("opponent", filters.opponent);
  if (filters?.myCharacter) params.set("myCharacter", filters.myCharacter);
  if (filters?.result) params.set("result", filters.result);
  if (filters?.tag) params.set("tag", filters.tag);
  if (filters?.search) params.set("search", filters.search);
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

export async function getLpHistory(filters?: { myCharacter?: string; period?: string }) {
  const params = new URLSearchParams();
  if (filters?.myCharacter) params.set("myCharacter", filters.myCharacter);
  if (filters?.period) params.set("period", filters.period);
  const qs = params.toString();
  return request(`/stats/lp-history${qs ? `?${qs}` : ""}`);
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
  search?: string;
  sort?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.myCharacter) params.set("myCharacter", filters.myCharacter);
  if (filters?.opponent) params.set("opponent", filters.opponent);
  if (filters?.result) params.set("result", filters.result);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sort) params.set("sort", filters.sort);
  const qs = params.toString();
  return request(`/community/memos${qs ? `?${qs}` : ""}`);
}

export async function toggleMemoLike(memoId: string) {
  return request(`/community/memos/${memoId}/like`, { method: "POST" });
}

// Translation
export async function translateMemo(memoId: string, targetLang: string) {
  return request("/translate", {
    method: "POST",
    body: JSON.stringify({ memoId, targetLang }),
  });
}

// Creators
export async function registerCreator() {
  return request("/creators/register", { method: "POST" });
}

export async function getMyCreatorProfile() {
  return request("/creators/me");
}

export async function getCreatorAnalytics() {
  return request("/creators/me/analytics");
}

export async function updateCreatorProfile(data: {
  displayName?: string;
  bio?: string;
  monthlyPrice?: number;
  isActive?: boolean;
}) {
  return request("/creators/me", { method: "PUT", body: JSON.stringify(data) });
}

export async function getCreators() {
  return request("/creators");
}

export async function getCreatorDetail(id: string) {
  return request(`/creators/${id}`);
}

export async function subscribeToCreator(id: string) {
  return request(`/creators/${id}/subscribe`, { method: "POST" });
}

export async function getMySubscriptions() {
  return request("/creators/subscriptions/list");
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

// Character Notes
export async function getCharacterNotes(myCharacter?: string) {
  const params = new URLSearchParams();
  if (myCharacter) params.set("myCharacter", myCharacter);
  const qs = params.toString();
  return request(`/notes${qs ? `?${qs}` : ""}`);
}

export async function getCharacterNote(myChar: string, oppChar: string) {
  return request(`/notes/${encodeURIComponent(myChar)}/${encodeURIComponent(oppChar)}`);
}

export async function saveCharacterNote(myChar: string, oppChar: string, content: string) {
  return request(`/notes/${encodeURIComponent(myChar)}/${encodeURIComponent(oppChar)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

export async function deleteCharacterNote(myChar: string, oppChar: string) {
  return request(`/notes/${encodeURIComponent(myChar)}/${encodeURIComponent(oppChar)}`, {
    method: "DELETE",
  });
}

// Combos
export async function getCombos(character?: string, controlType?: string) {
  const params = new URLSearchParams();
  if (character) params.set("character", character);
  if (controlType) params.set("controlType", controlType);
  const qs = params.toString();
  return request(`/combos${qs ? `?${qs}` : ""}`);
}

export async function createCombo(combo: {
  character: string;
  controlType?: string;
  name: string;
  command: string;
  damage?: number;
  memo?: string;
  videoUrl?: string;
  isPublic?: boolean;
}) {
  return request("/combos", { method: "POST", body: JSON.stringify(combo) });
}

export async function updateCombo(id: string, combo: {
  name?: string;
  command?: string;
  damage?: number | null;
  memo?: string;
  videoUrl?: string | null;
  isPublic?: boolean;
  controlType?: string;
}) {
  return request(`/combos/${id}`, { method: "PUT", body: JSON.stringify(combo) });
}

// Community Combos
export async function getCommunityCombos(filters?: {
  character?: string;
  controlType?: string;
  search?: string;
  sort?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.character) params.set("character", filters.character);
  if (filters?.controlType) params.set("controlType", filters.controlType);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sort) params.set("sort", filters.sort);
  const qs = params.toString();
  return request(`/community/combos${qs ? `?${qs}` : ""}`);
}

export async function rateCombo(comboId: string, rating: "works" | "doesnt_work") {
  return request(`/community/combos/${comboId}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}

export async function deleteCombo(id: string) {
  return request(`/combos/${id}`, { method: "DELETE" });
}

// Import
export async function importMatches(matches: Array<{
  myCharacter: string;
  opponentCharacter: string;
  result: "win" | "loss";
  replayId: string;
  playedAt?: string;
  lp?: number;
  mr?: number;
}>) {
  return request("/import", { method: "POST", body: JSON.stringify({ matches }) });
}

export function getApiBase() {
  return API_BASE;
}

// Push Notifications
export async function getVapidKey() {
  return request("/notifications/vapid-key");
}

export async function subscribePush(subscription: any) {
  return request("/notifications/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribePush(endpoint: string) {
  return request("/notifications/subscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

// Stripe
export async function createCheckoutSession() {
  return request("/stripe/checkout", { method: "POST" });
}

export async function createPortalSession() {
  return request("/stripe/portal", { method: "POST" });
}

// Frame Data (public)
export async function getFrameData(character: string, category?: string, search?: string) {
  const params = new URLSearchParams({ character });
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  return request(`/frame-data?${params.toString()}`);
}

export async function getFrameDataCharacters(): Promise<string[]> {
  return request("/frame-data/characters");
}

// Frame Data (admin)
export async function createFrameDataMove(move: Record<string, any>) {
  return request("/frame-data", { method: "POST", body: JSON.stringify(move) });
}

export async function updateFrameDataMove(id: string, move: Record<string, any>) {
  return request(`/frame-data/${id}`, { method: "PUT", body: JSON.stringify(move) });
}

export async function deleteFrameDataMove(id: string) {
  return request(`/frame-data/${id}`, { method: "DELETE" });
}

export async function bulkImportFrameData(character: string, moves: Record<string, any>[]) {
  return request("/frame-data/bulk", { method: "POST", body: JSON.stringify({ character, moves }) });
}

// Setplays
export async function getSetplays(character?: string) {
  const params = new URLSearchParams();
  if (character) params.set("character", character);
  const qs = params.toString();
  return request(`/setplays${qs ? `?${qs}` : ""}`);
}

export async function getSetplay(id: string) {
  return request(`/setplays/${id}`);
}

export async function createSetplay(data: { character: string; name: string; situation?: string; tree: any; isPublic?: boolean }) {
  return request("/setplays", { method: "POST", body: JSON.stringify(data) });
}

export async function updateSetplay(id: string, data: { name?: string; situation?: string; tree?: any; isPublic?: boolean }) {
  return request(`/setplays/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteSetplay(id: string) {
  return request(`/setplays/${id}`, { method: "DELETE" });
}
