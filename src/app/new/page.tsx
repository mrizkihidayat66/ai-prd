'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatPage } from '@/features/chat/components/chat-page';
import { useChatSession } from '@/features/chat/hooks/use-chat-session';

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [generatingPrd, setGeneratingPrd] = useState(false);

  const {
    messages,
    isLoading,
    isRequirementsComplete,
    sendMessage,
    sendAnswer,
  } = useChatSession(projectId ?? '');

  function handleFileImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      sendMessage(
        `Here is my project document:\n\n${content}\n\nPlease analyze this and identify what requirements are covered and what needs clarification.`
      );
    };
    reader.readAsText(file);
  }

  async function handleGeneratePrd() {
    if (!projectId) return;
    setGeneratingPrd(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, { method: 'POST' });
      if (res.ok) {
        router.push(`/project/${projectId}`);
      }
    } catch (e) {
      console.error('PRD generation failed:', e);
    }
    setGeneratingPrd(false);
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        No project ID provided.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="border-b border-border/40 backdrop-blur-xl bg-background/80 px-6 py-3 flex items-center gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="font-semibold">New Project</h1>
        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
          {isRequirementsComplete ? 'Ready to Generate' : 'Clarifying'}
        </Badge>
      </header>

      <ChatPage
        messages={messages}
        isLoading={isLoading}
        isRequirementsComplete={isRequirementsComplete}
        onSendMessage={sendMessage}
        onSendAnswer={sendAnswer}
        onGeneratePrd={handleGeneratePrd}
        onFileImport={handleFileImport}
        generatingPrd={generatingPrd}
      />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen text-muted-foreground">
          Loading...
        </div>
      }
    >
      <NewProjectContent />
    </Suspense>
  );
}
