export type Citation = {
  id: string;
  label: string;
  sourceType: "chat" | "upload_doc" | "upload_audio" | "voice_memo";
  createdAt: string;
  contentSummary: string;
  content: string;
};

export type CitedMessage = {
  id: string;
  role: "member" | "clone";
  content: string;
  createdAt: string;
  citations: Citation[];
};
