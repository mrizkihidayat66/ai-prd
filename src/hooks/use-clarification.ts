'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatMessage, ParsedAIResponse, ClarifyQuestion } from '@/types';
import { PLAN_SECTION_LABELS } from '@/types';
import { patchProject } from '@/services/project-service';

const ALL_PLAN_KEYS = Object.keys(PLAN_SECTION_LABELS);

const AUTOPILOT_FALLBACKS = [
  'A modern, responsive web UI with dark mode support',
  'PostgreSQL with Prisma ORM for type-safe queries',
  'JWT-based authentication with role-based access control',
  'Docker containers deployed via CI/CD pipeline',
  'RESTful API with OpenAPI documentation',
  'Real-time updates via WebSocket integration',
  'Comprehensive test coverage with Jest and Cypress',
  'Redis caching layer for frequently accessed data',
];

// ─── Parsing helpers ──────────────────────────────────────────────────────────

export function tryParseAI(content: string): ParsedAIResponse | null {
  if (!content) return null;
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim()) as ParsedAIResponse;
    const firstCurly = content.indexOf('{');
    const lastCurly = content.lastIndexOf('}');
    if (firstCurly !== -1 && lastCurly !== -1) {
      return JSON.parse(content.substring(firstCurly, lastCurly + 1).trim()) as ParsedAIResponse;
    }
    return null;
  } catch {
    return null;
  }
}

export function getCleanText(content: string): string {
  let clean = content.replace(/```(?:json)?[\s\S]*?(```|$)/g, '').trim();
  clean = clean.replace(/\{[\s\S]*\}\s*$/g, '').trim();
  return clean;
}

export function normalizeQuestions(questions: ClarifyQuestion[] | undefined): ClarifyQuestion[] {
  if (!questions || questions.length === 0) return [];
  return questions.map((q, idx) => {
    const normalizedOptions = Array.from(
      new Set([...(q.options || []).filter(Boolean), 'Other'])
    );
    return {
      id: q.id || `q_${idx + 1}`,
      dimension: q.dimension || 'general',
      question: q.question || 'Could you provide more detail?',
      recommendation: q.recommendation || 'Choose the closest option or provide a custom answer.',
      options:
        normalizedOptions.length > 1 ? normalizedOptions : ['Option A', 'Option B', 'Other'],
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClarificationSession(
  projectId: string | null,
  autopilotEnabled: boolean
) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState('New Project');
  const [coveredDimensions, setCoveredDimensions] = useState<string[]>([]);
  const [requirementsComplete, setRequirementsComplete] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planProgress, setPlanProgress] = useState<string[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});

  const autopilotInit = useRef(false);
  const autopilotNoParseCount = useRef(0);

  // ─── Restore session from history ──────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data: { project?: { name: string; conversations: { role: string; content: string }[] } }) => {
        if (!data.project) return;
        setProjectName(data.project.name);
        const msgs: ChatMessage[] = data.project.conversations.map((c) => ({
          role: c.role as 'USER' | 'ASSISTANT',
          content: c.content,
        }));
        setMessages(msgs);

        // Reconstruct radar state from message history
        const allCovered = new Set<string>();
        let isComplete = false;
        for (const m of msgs) {
          if (m.role === 'ASSISTANT') {
            const p = tryParseAI(m.content);
            if (p?.covered) p.covered.forEach((c) => allCovered.add(c));
            if (p?.status === 'requirements_complete') isComplete = true;
          }
        }
        if (allCovered.size > 0) setCoveredDimensions(Array.from(allCovered));
        if (isComplete) setRequirementsComplete(true);
      })
      .catch(console.error);
  }, [projectId]);

  // ─── Send a single message ─────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !projectId || loading) return;

      setMessages((prev) => [...prev, { role: 'USER', content: text }]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, message: text }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        setMessages((prev) => [...prev, { role: 'ASSISTANT', content: '' }]);

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            const snapshot = fullText;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'ASSISTANT', content: snapshot };
              return updated;
            });
          }
        }

        // Parse and apply state from the final AI response
        const parsedRaw = tryParseAI(fullText);
        const parsed = parsedRaw
          ? { ...parsedRaw, questions: normalizeQuestions(parsedRaw.questions) }
          : null;

        if (parsed?.covered && parsed.covered.length > 0) {
          setCoveredDimensions((prev) => Array.from(new Set([...prev, ...(parsed.covered ?? [])])));
        }

        if (parsed?.status === 'requirements_complete') {
          setRequirementsComplete(true);
          const patch: Record<string, string> = { status: 'REQUIREMENTS_LOCKED' };
          if (
            parsed.summary &&
            typeof parsed.summary === 'object' &&
            'projectName' in parsed.summary
          ) {
            const newName = parsed.summary.projectName as string;
            setProjectName(newName);
            patch.name = newName;
          }
          void patchProject(projectId, patch);
        }
      } catch (error) {
        console.error('Chat error:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'ASSISTANT',
            content: '❌ Error communicating with AI. Please check your API settings.',
          },
        ]);
      }

      setLoading(false);
    },
    [projectId, loading]
  );

  // ─── Generate plan ─────────────────────────────────────────────────────────

  const generatePlan = useCallback(async () => {
    if (!projectId) return;
    setGeneratingPlan(true);
    setPlanProgress([]);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = (await res.json()) as {
          project?: { plan?: Record<string, string | null> };
        };
        if (data.project?.plan) {
          const completed = ALL_PLAN_KEYS.filter(
            (k) => data.project!.plan![k] && !String(data.project!.plan![k]).startsWith('> ⚠️')
          );
          setPlanProgress(completed);
        }
      } catch { /* ignore poll errors */ }
    }, 3000);

    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, { method: 'POST' });
      clearInterval(pollInterval);

      if (!res.ok) {
        const err = (await res.json()) as { error?: string; details?: string };
        throw new Error(err.error || err.details || 'Failed to generate plan');
      }

      setPlanProgress(ALL_PLAN_KEYS);
      await new Promise<void>((r) => setTimeout(r, 1000));

      router.push(autopilotEnabled ? `/project/${projectId}?autopilot=true` : `/project/${projectId}`);
    } catch (error) {
      clearInterval(pollInterval);
      console.error('Plan generation error:', error);
      if (autopilotEnabled) {
        router.push(`/project/${projectId}?autopilot=true`);
      } else {
        alert('Some sections may have failed. Check the project detail page.');
        router.push(`/project/${projectId}`);
      }
    }
  }, [projectId, autopilotEnabled, router]);

  // ─── Submit batch answers ──────────────────────────────────────────────────

  const submitBatchAnswers = useCallback(() => {
    const lines = Object.entries(pendingAnswers).map(([qid, answer]) => {
      if (answer === 'Other') {
        return `- ${qid}: ${customInputs[qid] || 'Not specified'}`;
      }
      return `- ${qid}: ${answer}`;
    });
    if (lines.length === 0) return;
    setPendingAnswers({});
    setCustomInputs({});
    void sendMessage(`My answers to your questions:\n${lines.join('\n')}`);
  }, [pendingAnswers, customInputs, sendMessage]);

  // ─── Autopilot ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!autopilotEnabled || loading || generatingPlan) return;

    const lastMsg = messages[messages.length - 1];
    const userTurns = messages.filter((m) => m.role === 'USER').length;

    // Initial trigger
    if (!lastMsg && !autopilotInit.current) {
      autopilotInit.current = true;
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('testMode');
      window.history.replaceState({}, '', newUrl.toString());
      setTimeout(() => {
        void sendMessage(
          'I want to build a modern task management application. Please ask me any required questions to define the project scope. Use deep iterative adaptive probing.'
        );
      }, 1000);
      return;
    }

    // Auto-generate plan once complete
    if (requirementsComplete && !generatingPlan) {
      setTimeout(() => void generatePlan(), 2000);
      return;
    }

    // React to assistant messages
    if (lastMsg?.role === 'ASSISTANT') {
      const parsedRaw = tryParseAI(lastMsg.content);
      const parsed = parsedRaw
        ? { ...parsedRaw, questions: normalizeQuestions(parsedRaw.questions) }
        : null;

      if (!parsed) {
        autopilotNoParseCount.current += 1;
        if (autopilotNoParseCount.current >= 2) {
          setTimeout(() => {
            void sendMessage(
              'Please return a clarification JSON block with 1-2 questions and selectable options so I can continue.'
            );
          }, 2500);
          autopilotNoParseCount.current = 0;
        } else if (userTurns >= 6) {
          setTimeout(() => {
            void sendMessage(
              'All requirements are clear. Please provide your finalization check so we can proceed to plan generation.'
            );
          }, 3000);
        }
        return;
      }

      autopilotNoParseCount.current = 0;

      if (parsed.status === 'needs_clarification') {
        const isFinalCheck = parsed.questions?.some(
          (q) => q.id === 'final_check' || q.dimension === 'confirmation'
        );

        if (isFinalCheck) {
          setTimeout(() => void sendMessage('Looks good, generate plan'), 3000);
        } else if (parsed.questions && parsed.questions.length > 0) {
          setTimeout(() => {
            const answers: Record<string, string> = {};
            (parsed.questions ?? []).forEach((q, idx) => {
              const opts = Array.from(new Set([...(q.options || []), 'Other'])).filter(Boolean);
              answers[q.id] = opts.length > 0
                ? opts[idx % opts.length]
                : AUTOPILOT_FALLBACKS[idx % AUTOPILOT_FALLBACKS.length];
            });
            const formatted = Object.entries(answers)
              .map(([id, ans]) => `- ${id}: ${ans}`)
              .join('\n');
            void sendMessage(`Autopilot Answers:\n${formatted}`);
          }, 4000);
        } else if (parsed.missing?.length === 0) {
          setTimeout(
            () => void sendMessage('All requirements appear complete. Please proceed with the finalization check.'),
            3000
          );
        } else {
          setTimeout(
            () => void sendMessage(
              `Please ask focused clarification questions for: ${(parsed.missing ?? []).join(', ')} and include selectable options.`
            ),
            2500
          );
        }
      }
    }
  }, [autopilotEnabled, loading, generatingPlan, messages, sendMessage, requirementsComplete, generatePlan]);

  return {
    messages,
    input,
    setInput,
    loading,
    projectName,
    coveredDimensions,
    requirementsComplete,
    generatingPlan,
    planProgress,
    pendingAnswers,
    customInputs,
    setPendingAnswers,
    setCustomInputs,
    sendMessage,
    generatePlan,
    submitBatchAnswers,
  };
}
