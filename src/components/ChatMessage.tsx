import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types/chat';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  message: Message;
  userIdentity: { displayName: string } | null;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, userIdentity }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
      {message.type === 'system' ? (
        <div className="text-center">{message.content}</div>
      ) : message.isMe ? (
        <div className={`flex items-start gap-3 max-w-3xl flex-row-reverse`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
            U
          </div>
          <div className="flex-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <div className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
              {userIdentity?.displayName || 'You'}
            </div>
            <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{message.content}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full">
          <div className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">
            {message.sender.displayName}
          </div>
          <div className="prose prose-sm sm:prose dark:prose-invert prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-white prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm prose-pre:p-0 prose-pre:bg-transparent max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-4 text-gray-800 dark:text-gray-200">{children}</p>,
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white border-b pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 text-gray-900 dark:text-white border-b pb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">{children}</h3>,
                h4: ({ children }) => <h4 className="text-md font-bold mb-2 text-gray-900 dark:text-white">{children}</h4>,
                h5: ({ children }) => <h5 className="text-base font-bold mb-2 text-gray-900 dark:text-white">{children}</h5>,
                h6: ({ children }) => <h6 className="text-sm font-bold mb-2 text-gray-900 dark:text-white">{children}</h6>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-4 text-gray-800 dark:text-gray-200">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-4 text-gray-800 dark:text-gray-200">{children}</ol>,
                li: ({ children }) => <li className="mb-1 text-gray-800 dark:text-gray-200">{children}</li>,
                code: ({ className, children }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');
                  
                  return !className ? (
                    <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
                      {children}
                    </code>
                  ) : (
                    <div className="rounded-md overflow-hidden my-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between bg-gray-200 dark:bg-gray-800 px-4 py-2 text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{language || 'code'}</span>
                        <button 
                          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => handleCopyCode(codeString)}
                        >
                          {copiedCode === codeString ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                              <span className="text-green-500">Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        customStyle={{ margin: 0, borderRadius: 0 }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                },
                pre: ({ children }) => <>{children}</>,
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
                img: ({ src, alt }) => (
                  <img src={src} alt={alt} className="max-w-full h-auto rounded-lg mb-4" />
                ),
                strong: ({ children }) => (
                  <strong className="font-bold">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic">{children}</em>
                ),
                del: ({ children }) => (
                  <del className="line-through">{children}</del>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => (
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
      {message.type !== 'system' && (
        <div className="text-xs opacity-50 mt-1 text-gray-500 dark:text-gray-400">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 