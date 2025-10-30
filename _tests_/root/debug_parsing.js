// Test file to debug the hybrid renderer
const testContent = `Here's some text before code.

\`\`\`javascript
console.log('Hello world');
const x = 42;
\`\`\`

And here's more text after the code block.`;

// Test the parsing function
const parseContentSegments = (content) => {
  const segments = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  console.log('Input content:', content);
  console.log('Regex:', codeBlockRegex);

  while ((match = codeBlockRegex.exec(content)) !== null) {
    console.log('Found match:', match);
    
    // Add text before the code block
    if (match.index > lastIndex) {
      const textSegment = content.slice(lastIndex, match.index);
      if (textSegment.trim()) {
        segments.push({
          type: 'text',
          content: textSegment.trim(),
          startIndex: lastIndex,
          endIndex: match.index
        });
      }
    }

    // Add the code block
    segments.push({
      type: 'codeblock',
      content: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last code block
  if (lastIndex < content.length) {
    const textSegment = content.slice(lastIndex);
    if (textSegment.trim()) {
      segments.push({
        type: 'text',
        content: textSegment.trim(),
        startIndex: lastIndex,
        endIndex: content.length
      });
    }
  }

  // If no code blocks found, return the entire content as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: content,
      startIndex: 0,
      endIndex: content.length
    });
  }

  return segments;
};

console.log('Parsed segments:', parseContentSegments(testContent));