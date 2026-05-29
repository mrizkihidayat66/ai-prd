"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Send,
  Check,
  Trash2,
  Filter,
} from "lucide-react";

interface Comment {
  id: string;
  projectId: string;
  section: string;
  content: string;
  author: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentsPanelProps {
  projectId: string;
  sections: string[]; // Available PRD section headings
  activeSection?: string; // Currently viewed section
}

export function CommentsPanel({
  projectId,
  sections,
  activeSection,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [author, setAuthor] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prd-author-name") || "";
    }
    return "";
  });
  const [selectedSection, setSelectedSection] = useState(activeSection || "");
  const [filterResolved, setFilterResolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (activeSection) {
      setSelectedSection(activeSection);
    }
  }, [activeSection]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !selectedSection) return;

    const authorName = author.trim() || "Anonymous";
    // Persist author name
    if (typeof window !== "undefined") {
      localStorage.setItem("prd-author-name", authorName);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: selectedSection,
          content: newComment.trim(),
          author: authorName,
        }),
      });

      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (error) {
      console.error("Failed to create comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    try {
      await fetch(`/api/projects/${projectId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId, resolved }),
      });
      fetchComments();
    } catch (error) {
      console.error("Failed to resolve comment:", error);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await fetch(
        `/api/projects/${projectId}/comments?commentId=${commentId}`,
        { method: "DELETE" }
      );
      fetchComments();
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const filteredComments = comments.filter((c) => {
    if (filterResolved && c.resolved) return false;
    if (selectedSection && c.section !== selectedSection) return false;
    return true;
  });

  const unresolvedCount = comments.filter((c) => !c.resolved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Loading comments...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium text-sm">Comments</span>
          {unresolvedCount > 0 && (
            <Badge variant="secondary">{unresolvedCount} open</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilterResolved(!filterResolved)}
          className={filterResolved ? "text-primary" : ""}
        >
          <Filter className="h-3 w-3 mr-1" />
          {filterResolved ? "Show all" : "Hide resolved"}
        </Button>
      </div>

      {/* Section filter */}
      <div className="p-3 border-b">
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="w-full text-sm rounded-md border border-input bg-background px-3 py-1.5"
        >
          <option value="">All sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {filteredComments.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No comments{selectedSection ? ` for "${selectedSection}"` : ""}.
              <br />
              Add one below.
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-lg border p-3 text-sm ${
                  comment.resolved
                    ? "opacity-60 bg-muted/30"
                    : "bg-background"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.author}</span>
                    <Badge variant="outline" className="text-xs">
                      {comment.section}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {comment.content}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      handleResolve(comment.id, !comment.resolved)
                    }
                  >
                    <Check className="h-3 w-3 mr-1" />
                    {comment.resolved ? "Reopen" : "Resolve"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* New comment form */}
      <div className="border-t p-3 space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Your name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-32 text-sm"
          />
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="flex-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
          >
            <option value="">Select section...</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="text-sm min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || !selectedSection || submitting}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ctrl+Enter to submit
        </p>
      </div>
    </div>
  );
}
