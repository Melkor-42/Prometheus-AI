import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
  userIdentity: { displayName: string } | null;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, userIdentity }) => {
  return (
    <div 
      className={`${
        message.type === 'system'
          ? 'mx-auto text-gray-600 dark:text-gray-400 text-center max-w-[90%] text-sm italic'
          : message.isMe 
            ? 'flex flex-col items-end'
            : 'flex flex-col items-start'
      }`}
    >
      <div className={`flex items-start gap-3 max-w-3xl ${
        message.isMe ? 'flex-row-reverse' : 'flex-row'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          message.isMe 
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {message.isMe ? 'U' : 'AI'}
        </div>
        <div className={`flex-1 ${
          message.isMe 
            ? 'bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4'
            : 'bg-white dark:bg-gray-800 rounded-lg p-4'
        }`}>
          {message.type !== 'system' && (
            <div className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
              {message.isMe ? userIdentity?.displayName || 'You' : message.sender.displayName}
            </div>
          )}
          {message.isMe ? (
            <div className="text-gray-800 dark:text-gray-200">{message.content}</div>
          ) : (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-4 text-gray-800 dark:text-gray-200">{children}</p>,
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-4 text-gray-800 dark:text-gray-200">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-4 text-gray-800 dark:text-gray-200">{children}</ol>,
                  li: ({ children }) => <li className="mb-1 text-gray-800 dark:text-gray-200">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg overflow-x-auto mb-4 text-gray-800 dark:text-gray-200">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic mb-4 text-gray-700 dark:text-gray-300">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
      {message.type !== 'system' && (
        <div className="text-xs opacity-50 mt-1 text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 