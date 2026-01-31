"use client";

import { useCallback, useEffect, useState } from "react";

import type { Comment, CommentDraft } from "@/lib/comments";
import { createComment } from "@/lib/comments";

const STORAGE_KEY = "ags.comments.v1";

function normalizeComment(input: unknown): Comment | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;

  if (
    typeof obj.id !== "string" ||
    typeof obj.listingId !== "string" ||
    typeof obj.author !== "string" ||
    typeof obj.content !== "string" ||
    typeof obj.createdAt !== "string" ||
    typeof obj.status !== "string" ||
    !["pending", "approved"].includes(obj.status)
  ) {
    return null;
  }

  const comment: Comment = {
    id: obj.id,
    listingId: obj.listingId,
    author: obj.author,
    content: obj.content,
    createdAt: obj.createdAt,
    status: obj.status as Comment["status"],
    replies: []
  };

  if (Array.isArray(obj.replies)) {
    const replies: Comment[] = [];
    for (const replyRaw of obj.replies) {
      const reply = normalizeComment(replyRaw);
      if (reply) replies.push(reply);
    }
    comment.replies = replies;
  }

  return comment;
}

function readFromStorage(): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized: Comment[] = [];
    for (const item of parsed) {
      const comment = normalizeComment(item);
      if (comment) normalized.push(comment);
    }
    return normalized;
  } catch {
    return [];
  }
}

function writeToStorage(comments: Comment[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {
    return;
  }
}

export function useComments() {
  const [comments, setComments] = useState<Comment[]>(() => []);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setComments(readFromStorage());
    setIsReady(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setComments(readFromStorage());
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addComment = useCallback(
    (draft: CommentDraft) => {
      const comment = createComment(draft);
      setComments((current) => {
        const next = [...current, comment];
        writeToStorage(next);
        return next;
      });
      return comment;
    },
    []
  );

  const approveComment = useCallback((id: string) => {
    setComments((current) => {
      const next = current.map((c) => {
        if (c.id === id) return { ...c, status: "approved" as const };
        if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) => (r.id === id ? { ...r, status: "approved" as const } : r))
          };
        }
        return c;
      });
      writeToStorage(next);
      return next;
    });
  }, []);

  const rejectComment = useCallback((id: string) => {
    setComments((current) => {
      const next = current
        .map((c) => {
          if (c.id === id) return null;
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.filter((r) => r.id !== id)
            };
          }
          return c;
        })
        .filter((c): c is Comment => c !== null);
      writeToStorage(next);
      return next;
    });
  }, []);

  const getCommentsByListing = useCallback(
    (listingId: string, status?: Comment["status"]) => {
      return comments.filter((c) => {
        if (c.listingId !== listingId) return false;
        if (status !== undefined && c.status !== status) return false;
        return true;
      });
    },
    [comments]
  );

  const getPendingCount = useCallback(() => {
    return comments.filter((c) => c.status === "pending").length;
  }, [comments]);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setComments([]);
  }, []);

  return {
    comments,
    isReady,
    addComment,
    approveComment,
    rejectComment,
    getCommentsByListing,
    getPendingCount,
    reset
  };
}

export { STORAGE_KEY as COMMENTS_STORAGE_KEY };
