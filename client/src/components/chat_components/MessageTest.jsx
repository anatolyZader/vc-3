// MessageTest.jsx - Component to test our markdown rendering
import React, { useState } from 'react';
import MessageRenderer from './MessageRenderer';
import SimpleMessageRenderer from './SimpleMessageRenderer';
import './messageRenderer.css';

const MessageTest = () => {
  const [testMessage, setTestMessage] = useState(`Modularity: By decoupling the \`ai\` module from the specific implementation of the \`eventDispatcher\` service, the module becomes more modular and easier to maintain.

Testability: DI makes it easier to test the \`ai\` module in isolation, as dependencies can be easily mocked or stubbed.

Flexibility: The use of DI allows the application to easily swap out the implementation of the \`eventDispatcher\` service if needed, without having to modify the \`ai\` module.

Here's a code example:

\`\`\`javascript
const eventDispatcher = {
  emit: (event, data) => {
    console.log('Event emitted:', event, data);
  }
};
\`\`\``);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Message Renderer Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Input Message:</h3>
        <textarea
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          style={{
            width: '100%',
            height: '200px',
            fontFamily: 'monospace',
            fontSize: '14px',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Complex MessageRenderer (React Markdown):</h3>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f9fafb'
        }}>
          <MessageRenderer content={testMessage} isUserMessage={false} />
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Simple MessageRenderer (Regex-based):</h3>
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#f9fafb'
        }}>
          <SimpleMessageRenderer content={testMessage} isUserMessage={false} />
        </div>
      </div>
      
      <div>
        <h3>User Message Rendering (Simple):</h3>
        <div style={{
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#1e40af',
          color: 'white'
        }}>
          <SimpleMessageRenderer content={testMessage} isUserMessage={true} />
        </div>
      </div>
    </div>
  );
};

export default MessageTest;
