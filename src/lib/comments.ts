export type CommentStatus = "pending" | "approved";

export type Comment = {
  id: string;
  listingId: string;
  author: string;
  content: string;
  createdAt: string;
  status: CommentStatus;
  replies?: Comment[];
};

export type CommentDraft = Omit<Comment, "id" | "createdAt" | "status" | "replies">;

export function createComment(draft: CommentDraft): Comment {
  return {
    ...draft,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
    replies: []
  };
}
