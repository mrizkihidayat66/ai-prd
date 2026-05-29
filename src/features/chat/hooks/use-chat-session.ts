'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useMemo, useEffect } from 'react';
import type { UIMessage } from 'ai';

type UseChatSessionOptions = {
  projectId: string;
  initialMessages?: UIMessage[];
};

export function useChatSession({ projectId, initialMessages }: UseChatSessionOptions) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: { projectId },
    }),
    [projectId]
  );

  const { messages, status, sendMessage, stop, setMessages } = useChat({ transport });

  // Hydrate initial messages from DB
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      // Only set if messages are empty or if initialMessages changed
      if (messages.length === 0) {
        setMessages(initialMessages);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages, setMessages]);

  const sendTextMessage = useCallback(
    (text: string) => {
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text }],
      });
    },
    [sendMessage]
  );

  const sendAnswer = useCallback(
    (_questionId: string, answer: string) => {
      sendTextMessage(answer);
    },
    [sendTextMessage]
  );

  const isRequirementsComplete = messages.some((m: UIMessage) =>
    m.parts?.some(
      (p) => p.type === 'tool-mark_requirements_complete'
    )
  );

  const isLoading = status === 'streaming' || status === 'submitted';

  // Retry: the last user message got no AI response. 
  // Delete the orphaned user msg from DB, then re-trigger via sendMessage.
  const retryLastMessage = useCallback(async () => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const lastUserText = lastMsg.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('') || '';

    if (!lastUserText) return;

    try {
      // Delete the orphaned user message from DB so it won't duplicate
      await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      // Remove the user message from local state
      setMessages((prev) => prev.slice(0, -1));

      // Small delay to let React commit the state update,
      // then re-send the message which triggers a fresh API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: lastUserText }],
      });
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [messages, projectId, setMessages, sendMessage]);

  return {
    messages,
    status,
    isLoading,
    sendMessage: sendTextMessage,
    sendAnswer,
    stop,
    setMessages,
    retryLastMessage,
    isRequirementsComplete,
  };
}
