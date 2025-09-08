import React from 'react';
import MessageRenderer from './chat_components/MessageRenderer';

const TestInlineCode = () => {
  const testText = `
Based on the provided code and documentation, it appears that the eventstorm.me application uses a combination of dependency injection (DI) and inversion of control (IoC) principles to manage its event handling and communication mechanisms.

1. **Dependency Injection (DI):**
   - The eventDispatcher module in the backend code is a Fastify plugin that decorates the Fastify instance with an eventDispatcher object.
   - This eventDispatcher object provides methods for publishing, emitting, and subscribing to events, both for external (Pub/Sub) and internal (in-memory) events.
   - The eventDispatcher is injected into other parts of the application, such as the aiPubsubListener module, which uses the eventDispatcher to acquire the shared event bus.

2. **Manual test with backticks:**
   - Here is some \`eventDispatcher\` code
   - Another example: \`fastify\` framework
   - Test: \`aiPubsubListener\` functionality
  `;

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Testing Inline Code Styling</h2>
      <div style={{ border: '1px solid #ccc', padding: '15px', marginTop: '10px' }}>
        <MessageRenderer content={testText} isUserMessage={false} />
      </div>
    </div>
  );
};

export default TestInlineCode;
