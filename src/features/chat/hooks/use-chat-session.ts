'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useMemo } from 'react';
import type { UIMessage } from 'ai';

export function useChatSession(projectId: string) {
  const transport = useMemo(
    () => new DefaultChatTransport({
      api: '/api/chat',
      body: { projectId },
    }),
    [projectId]
  );

  const { messages, status, sendMessage, stop, setMessages } = useChat({ transport });

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

  return {
    messages,
    status,
    isLoading,
    sendMessage: sendTextMessage,
    sendAnswer,
    stop,
    setMessages,
    isRequirementsComplete,
  };
}
