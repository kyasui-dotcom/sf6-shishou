export type User = {
  id: string;
  username: string;
  email: string;
  mainCharacter: string;
  subCharacters: string[];
  plan: "free" | "premium";
};

export type Memo = {
  id: string;
  myCharacter: string;
  opponentCharacter: string;
  result: "win" | "loss";
  memo: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  lp?: number | null;
  mr?: number | null;
};

export type LpHistoryPoint = {
  createdAt: string;
  lp: number | null;
  mr: number | null;
  myCharacter: string;
  result: "win" | "loss";
};

export type CommunityMemo = Memo & {
  username: string;
  userId?: string;
  isCreatorMemo?: boolean;
  isPreview?: boolean;
  likeCount?: number;
  userLiked?: boolean;
};

export type Stats = {
  overall: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  byOpponent: {
    character: string;
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];
  lossTagStats: {
    tag: string;
    count: number;
  }[];
};

export type CharacterNote = {
  id?: string;
  myCharacter: string;
  opponentCharacter: string;
  content: string;
  updatedAt?: string;
  createdAt?: string;
};

export type ControlType = "classic" | "modern";

export type ComboMemo = {
  id: string;
  character: string;
  controlType: ControlType;
  name: string;
  command: string;
  damage?: number | null;
  memo: string;
  videoUrl?: string | null;
  isPublic?: boolean;
  sortOrder: number;
  updatedAt?: string;
  createdAt?: string;
};

export type CommunityCombo = {
  id: string;
  userId: string;
  username: string;
  character: string;
  controlType: ControlType;
  name: string;
  command: string;
  damage?: number | null;
  memo: string;
  videoUrl?: string | null;
  worksCount: number;
  doesntWorkCount: number;
  userRating: "works" | "doesnt_work" | null;
  createdAt: string;
};

export type Creator = {
  id: string;
  displayName: string;
  bio: string;
  monthlyPrice: number;
  username: string;
  mainCharacter: string;
  subscriberCount: number;
};

export type CreatorDetail = Creator & {
  isSubscribed: boolean;
  isOwner: boolean;
  memos: (CommunityMemo & { isPreview?: boolean })[];
};

export type CreatorProfile = {
  isCreator: boolean;
  onboardingComplete?: boolean;
  displayName?: string;
  bio?: string;
  monthlyPrice?: number;
  isActive?: boolean;
  subscriberCount?: number;
};

export type CreatorAnalytics = {
  subscriberCount: number;
  estimatedRevenue: number;
  publicMemoCount: number;
  subscriberGrowth: { month: string; newSubscribers: number }[];
  topMemos: {
    id: string;
    myCharacter: string;
    opponentCharacter: string;
    result: string;
    memo: string;
    likeCount: number;
    createdAt: string;
  }[];
};

export type Feedback = {
  id: string;
  content: string;
  category: string;
  username: string;
  voteCount: number;
  userVoted: boolean;
  createdAt: string;
};

// Setplay tree node
export type SetplayNode = {
  id: string;
  label: string;
  type: "action" | "branch" | "result";
  children?: SetplayNode[];
};

export type Setplay = {
  id: string;
  character: string;
  name: string;
  situation: string;
  tree: SetplayNode;
  isPublic: boolean;
  updatedAt?: string;
  createdAt?: string;
};

export type MoveCategory = "normal" | "special" | "super" | "throw" | "unique" | "target_combo" | "command_normal";

export type FrameDataMove = {
  id: string;
  character: string;
  moveName: string;
  moveNameJp: string;
  input: string;
  category: MoveCategory;
  startup: number | null;
  active: number | null;
  recovery: number | null;
  onBlock: number | null;
  onHit: number | null;
  damage: number | null;
  guard: string;
  cancelInto: string;
  notes: string;
  sortOrder: number;
};
