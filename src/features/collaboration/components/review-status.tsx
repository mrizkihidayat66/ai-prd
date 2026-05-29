"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
} from "lucide-react";

interface Review {
  id: string;
  projectId: string;
  status: "draft" | "in_review" | "changes_requested" | "approved";
  reviewer: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ReviewStatusProps {
  projectId: string;
}

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    icon: FileCheck,
    color: "bg-muted text-muted-foreground",
    description: "This PRD has not been submitted for review yet.",
  },
  in_review: {
    label: "In Review",
    icon: Clock,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "This PRD is currently being reviewed.",
  },
  changes_requested: {
    label: "Changes Requested",
    icon: AlertCircle,
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    description: "The reviewer has requested changes to this PRD.",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    color:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "This PRD has been approved and is ready for implementation.",
  },
};

export function ReviewStatus({ projectId }: ReviewStatusProps) {
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReview = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/review`);
      if (res.ok) {
        const data = await res.json();
        setReview(data);
        setReviewer(data.reviewer || "");
        setNotes(data.notes || "");
      }
    } catch (error) {
      console.error("Failed to fetch review:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const updateStatus = async (
    status: Review["status"],
    extraData?: { reviewer?: string; notes?: string }
  ) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extraData }),
      });
      if (res.ok) {
        await fetchReview();
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to update review:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Loading review status...
      </div>
    );
  }

  const status = review?.status || "draft";
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Current status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${config.color}`}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Review Status</span>
              <Badge className={config.color}>{config.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </p>
          </div>
        </div>
      </div>

      {/* Reviewer info */}
      {review?.reviewer && (
        <div className="text-sm">
          <span className="text-muted-foreground">Reviewer:</span>{" "}
          <span className="font-medium">{review.reviewer}</span>
        </div>
      )}

      {/* Review notes */}
      {review?.notes && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Reviewer Notes
          </p>
          <p className="text-sm whitespace-pre-wrap">{review.notes}</p>
        </div>
      )}

      {/* Actions based on current status */}
      {!editing && (
        <div className="flex flex-wrap gap-2">
          {status === "draft" && (
            <Button
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Send className="h-3 w-3 mr-1" />
              Submit for Review
            </Button>
          )}
          {status === "in_review" && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() =>
                  updateStatus("approved", { reviewer, notes })
                }
                disabled={submitting}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Request Changes
              </Button>
            </>
          )}
          {status === "changes_requested" && (
            <Button
              size="sm"
              onClick={() => updateStatus("in_review")}
              disabled={submitting}
            >
              <Send className="h-3 w-3 mr-1" />
              Resubmit for Review
            </Button>
          )}
          {status === "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus("draft")}
              disabled={submitting}
            >
              Reset to Draft
            </Button>
          )}
        </div>
      )}

      {/* Edit form for submitting/requesting changes */}
      {editing && (
        <div className="space-y-3 border-t pt-3">
          <Input
            placeholder="Reviewer name"
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            className="text-sm"
          />
          <Textarea
            placeholder="Add review notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm min-h-[80px]"
          />
          <div className="flex gap-2">
            {status === "draft" && (
              <Button
                size="sm"
                onClick={() =>
                  updateStatus("in_review", {
                    reviewer: reviewer || undefined,
                    notes: notes || undefined,
                  })
                }
                disabled={submitting}
              >
                Submit
              </Button>
            )}
            {status === "in_review" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateStatus("changes_requested", {
                    reviewer: reviewer || undefined,
                    notes: notes || undefined,
                  })
                }
                disabled={submitting}
              >
                Request Changes
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Last updated */}
      {review?.updatedAt && review.id && (
        <p className="text-xs text-muted-foreground">
          Last updated:{" "}
          {new Date(review.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
