/// <reference types="vite/client" />

import { ChatAPI, LLMConversation, LLMMessage } from './types/chat';

declare module '*.svg?react' {
  import React from 'react'
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default SVGComponent
}

declare module '*.css' {
  const css: { [key: string]: string }
  export default css
}

declare module '*.scss' {
  const scss: { [key: string]: string }
  export default scss
}

declare module '*.sass' {
  const sass: { [key: string]: string }
  export default sass
}

// Add global types to Window interface
interface Window {
  ChatAPI: ChatAPI;
  conversationStore: {
    createConversation: (id: string, title: string) => LLMConversation;
    getConversation: (id: string) => LLMConversation;
    getAllConversations: () => LLMConversation[];
    addConversation: (conversation: LLMConversation) => void;
  };
  LLMMessage: {
    system: (content: string) => LLMMessage;
    user: (content: string) => LLMMessage;
    assistant: (content: string) => LLMMessage;
  };
} 