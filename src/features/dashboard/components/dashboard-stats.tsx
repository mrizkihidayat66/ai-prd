"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  MessageSquare,
  FileCheck,
  TrendingUp,
} from "lucide-react";

interface Analytics {
  projects: {
    total: number;
    withPlans: number;
    recentWeek: number;
    byStatus: Record<string, number>;
  };
  collaboration: {
    totalComments: number;
    unresolvedComments: number;
    reviews: Record<string, number>;
  };
}

export function DashboardStats() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 animate-pulse"
          >
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-7 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const stats = [
    {
      label: "Total Projects",
      value: analytics.projects.total,
      icon: FolderOpen,
      color: "text-blue-500",
      sub: `${analytics.projects.withPlans} with PRDs`,
    },
    {
      label: "This Week",
      value: analytics.projects.recentWeek,
      icon: TrendingUp,
      color: "text-green-500",
      sub: "new projects",
    },
    {
      label: "Comments",
      value: analytics.collaboration.totalComments,
      icon: MessageSquare,
      color: "text-orange-500",
      sub: `${analytics.collaboration.unresolvedComments} unresolved`,
    },
    {
      label: "Approved",
      value: analytics.collaboration.reviews["approved"] || 0,
      icon: FileCheck,
      color: "text-emerald-500",
      sub: `of ${Object.values(analytics.collaboration.reviews).reduce((a, b) => a + b, 0)} reviews`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <div className="text-2xl font-bold">{stat.value}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}
