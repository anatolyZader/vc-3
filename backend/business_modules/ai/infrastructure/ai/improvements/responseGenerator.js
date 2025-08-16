// Response Generation and Post-processing for Production RAG
'use strict';

class ResponseGenerator {
  constructor({ llm, embeddings }) {
    this.llm = llm;
    this.embeddings = embeddings;
  }

  // 1. Generate response with advanced prompting strategies
  async generateResponse(processedQuery, optimizedContext, conversationHistory = [], options = {}) {
    const {
      temperature = 0.1,
      maxTokens = 2000,
      useChainOfThought = true,
      includeSourceCitations = true,
      responseStyle = 'comprehensive' // concise, comprehensive, tutorial
    } = options;

    console.log(`🤖 RESPONSE GENERATION: Generating ${responseStyle} response for ${processedQuery.classification.primary_category} query`);

    // Build advanced prompt with multiple strategies
    const prompt = await this.buildAdvancedPrompt(
      processedQuery, 
      optimizedContext, 
      conversationHistory,
      { useChainOfThought, includeSourceCitations, responseStyle }
    );

    // Generate response with retry logic and fallback strategies
    let response;
    try {
      response = await this.generateWithFallback(prompt, { temperature, maxTokens });
    } catch (error) {
      console.error('Response generation failed:', error.message);
      return this.generateFallbackResponse(processedQuery, error);
    }

    // Post-process the response
    const processedResponse = await this.postProcessResponse(
      response, 
      processedQuery, 
      optimizedContext,
      { includeSourceCitations }
    );

    return processedResponse;
  }

  // Build sophisticated prompt with multiple techniques
  async buildAdvancedPrompt(processedQuery, optimizedContext, conversationHistory, options) {
    const { useChainOfThought, includeSourceCitations, responseStyle } = options;
    const classification = processedQuery.classification;

    // 1. Build system prompt with role specification and guidelines
    const systemPrompt = this.buildSystemPrompt(classification, responseStyle, options);

    // 2. Build conversation context
    const conversationContext = this.buildConversationContext(conversationHistory);

    // 3. Build task-specific instructions
    const taskInstructions = this.buildTaskInstructions(classification, responseStyle);

    // 4. Build context introduction
    const contextIntro = this.buildContextIntroduction(optimizedContext);

    // 5. Build chain of thought prompt if enabled
    const chainOfThoughtPrompt = useChainOfThought ? 
      this.buildChainOfThoughtPrompt(classification) : '';

    // 6. Build source citation instructions
    const citationInstructions = includeSourceCitations ? 
      this.buildCitationInstructions() : '';

    // 7. Assemble the complete prompt
    const userPrompt = `
${conversationContext}

${taskInstructions}

${contextIntro}

${optimizedContext.fullContext}

${chainOfThoughtPrompt}

${citationInstructions}

User Question: "${processedQuery.originalQuery}"

Please provide a comprehensive response following the guidelines above.
    `.trim();

    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
  }

  // Build comprehensive system prompt
  buildSystemPrompt(classification, responseStyle, options) {
    const basePrompt = `You are an expert software development assistant with deep knowledge of modern development practices, frameworks, and tools.`;

    const categorySpecificPrompts = {
      'CODE_IMPLEMENTATION': `You excel at providing practical code solutions with clear explanations, best practices, and working examples.`,
      'API_USAGE': `You specialize in API documentation, endpoint usage, parameter handling, and integration patterns.`,
      'ARCHITECTURE': `You focus on system design, architectural patterns, scalability considerations, and structural best practices.`,
      'DEBUGGING': `You are skilled at troubleshooting issues, identifying root causes, and providing step-by-step debugging guidance.`,
      'DOCUMENTATION': `You excel at explaining complex concepts clearly, providing comprehensive overviews, and creating helpful documentation.`,
      'CONFIGURATION': `You specialize in setup procedures, environment configuration, and deployment best practices.`
    };

    const stylePrompts = {
      'concise': `Provide concise, focused answers that directly address the question without unnecessary elaboration.`,
      'comprehensive': `Provide detailed, thorough responses that cover all relevant aspects of the topic with examples and context.`,
      'tutorial': `Structure your response as a step-by-step tutorial with clear instructions, examples, and explanations.`
    };

    const guidelines = `
Core Guidelines:
1. Always prioritize accuracy and provide working solutions
2. Explain your reasoning and the 'why' behind recommendations  
3. Use the provided context documentation as your primary knowledge source
4. When context doesn't fully answer the question, clearly state what you're inferring
5. Provide practical examples whenever possible
6. Consider security, performance, and maintainability in your recommendations
7. If multiple approaches exist, explain the trade-offs
8. Use proper formatting with code blocks, headings, and lists for clarity
    `;

    return `${basePrompt}

${categorySpecificPrompts[classification.primary_category] || categorySpecificPrompts['DOCUMENTATION']}

${stylePrompts[responseStyle] || stylePrompts['comprehensive']}

${guidelines}`;
  }

  // Build conversation context from history
  buildConversationContext(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return "This is the beginning of our conversation.";
    }

    const contextSummary = conversationHistory
      .slice(-3) // Last 3 exchanges
      .map((exchange, index) => 
        `Previous Exchange ${index + 1}:\nQ: ${exchange.prompt}\nA: ${exchange.response.substring(0, 200)}...`
      )
      .join('\n\n');

    return `Conversation Context:\n${contextSummary}\n\nCurrent Question (building on the above context):`;
  }

  // Build task-specific instructions
  buildTaskInstructions(classification, responseStyle) {
    const instructions = {
      'CODE_IMPLEMENTATION': `
For code implementation questions:
- Provide complete, working code examples
- Include necessary imports and dependencies
- Explain key parts of the implementation
- Mention potential gotchas or common mistakes
- Suggest testing approaches
      `,
      'API_USAGE': `
For API usage questions:
- Show complete request/response examples
- Explain required parameters and optional ones
- Include error handling examples
- Mention rate limiting or authentication requirements
- Provide multiple usage scenarios if relevant
      `,
      'ARCHITECTURE': `
For architecture questions:
- Explain the overall structure and relationships
- Discuss design patterns and principles involved
- Consider scalability and maintainability implications
- Mention alternative approaches and trade-offs
- Include diagrams or visual explanations where helpful
      `,
      'DEBUGGING': `
For debugging questions:
- Provide systematic troubleshooting steps
- Explain how to reproduce and isolate the issue
- Suggest debugging tools and techniques
- Include common causes and solutions
- Mention prevention strategies
      `,
      'DOCUMENTATION': `
For documentation questions:
- Provide comprehensive explanations
- Use clear structure with headings and sections
- Include practical examples and use cases
- Explain concepts from basic to advanced
- Cross-reference related topics
      `,
      'CONFIGURATION': `
For configuration questions:
- Provide step-by-step setup instructions
- Include all necessary configuration files
- Explain environment-specific considerations
- Mention common configuration issues
- Include verification steps
      `
    };

    return instructions[classification.primary_category] || instructions['DOCUMENTATION'];
  }

  // Build context introduction
  buildContextIntroduction(optimizedContext) {
    return `
I have access to your application's documentation and codebase. Here's the relevant information:

${optimizedContext.summary}

Detailed Context:
    `;
  }

  // Build chain of thought prompting
  buildChainOfThoughtPrompt(classification) {
    return `
Before providing your final answer, please think through this step-by-step:

1. **Understanding**: What exactly is being asked?
2. **Context Analysis**: What relevant information do I have from the documentation?
3. **Solution Approach**: What's the best way to address this question?
4. **Implementation Details**: What specific steps or code are needed?
5. **Considerations**: What edge cases, best practices, or alternatives should I mention?

Please include this reasoning in your response to show your thought process.
    `;
  }

  // Build citation instructions
  buildCitationInstructions() {
    return `
Important: When referencing information from the provided context, please cite your sources by mentioning the specific file or section (e.g., "According to the API specification..." or "As shown in the user authentication module...").

This helps users understand where the information comes from and allows them to verify or explore further.
    `;
  }

  // Generate response with fallback strategies
  async generateWithFallback(messages, options) {
    const strategies = [
      // Strategy 1: Full context with original parameters
      () => this.llm.invoke(messages, options),
      
      // Strategy 2: Reduced temperature for more deterministic output
      () => this.llm.invoke(messages, { ...options, temperature: 0.05 }),
      
      // Strategy 3: Shorter context if token limit exceeded
      () => {
        const truncatedMessages = messages.map(msg => ({
          ...msg,
          content: msg.content.length > 8000 ? 
            msg.content.substring(0, 8000) + '\n\n[Content truncated due to length limits...]' : 
            msg.content
        }));
        return this.llm.invoke(truncatedMessages, options);
      }
    ];

    let lastError;
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🤖 RESPONSE GENERATION: Attempting strategy ${i + 1}/${strategies.length}`);
        const result = await strategies[i]();
        console.log(`🤖 RESPONSE GENERATION: Strategy ${i + 1} succeeded`);
        return result.content;
      } catch (error) {
        console.warn(`🤖 RESPONSE GENERATION: Strategy ${i + 1} failed:`, error.message);
        lastError = error;
        
        // Wait before trying next strategy
        if (i < strategies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  // Generate fallback response when main generation fails
  generateFallbackResponse(processedQuery, error) {
    const classification = processedQuery.classification;
    
    let fallbackMessage = `I encountered an issue generating a response for your ${classification.primary_category.toLowerCase().replace('_', ' ')} question: "${processedQuery.originalQuery}".\n\n`;

    // Provide category-specific guidance
    switch (classification.primary_category) {
      case 'CODE_IMPLEMENTATION':
        fallbackMessage += `For code implementation questions, I recommend:
1. Checking the relevant module documentation
2. Looking for similar implementations in the codebase
3. Consulting the API specification for related endpoints
4. Reviewing any existing tests for examples`;
        break;
        
      case 'API_USAGE':
        fallbackMessage += `For API questions, please refer to:
1. The API specification document
2. The authentication module documentation  
3. Existing API usage examples in the codebase
4. The endpoint testing files`;
        break;
        
      default:
        fallbackMessage += `Please try:
1. Rephrasing your question with more specific details
2. Breaking down complex questions into smaller parts
3. Checking the relevant documentation sections
4. Trying again in a few moments`;
    }

    return {
      success: false,
      response: fallbackMessage,
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }

  // 2. Post-process the generated response
  async postProcessResponse(response, processedQuery, optimizedContext, options) {
    console.log(`🔧 POST-PROCESSING: Enhancing response for better user experience`);

    // Step 1: Extract and format code blocks
    const processedResponse = this.formatCodeBlocks(response);

    // Step 2: Add source citations if requested
    let citedResponse = processedResponse;
    if (options.includeSourceCitations) {
      citedResponse = await this.addSourceCitations(processedResponse, optimizedContext);
    }

    // Step 3: Structure the response with proper formatting
    const structuredResponse = this.structureResponse(citedResponse, processedQuery);

    // Step 4: Add helpful metadata and suggestions
    const enhancedResponse = await this.addResponseEnhancements(
      structuredResponse, 
      processedQuery, 
      optimizedContext
    );

    // Step 5: Validate response quality
    const qualityCheck = this.validateResponseQuality(enhancedResponse, processedQuery);

    return {
      success: true,
      response: enhancedResponse,
      conversationId: processedQuery.conversationId,
      timestamp: new Date().toISOString(),
      ragEnabled: true,
      contextUsed: optimizedContext.contextMetadata,
      responseMetadata: {
        category: processedQuery.classification.primary_category,
        technicalLevel: processedQuery.classification.technical_level,
        sourcesReferenced: optimizedContext.selectedDocuments.length,
        qualityScore: qualityCheck.score,
        qualityIssues: qualityCheck.issues,
        processingSteps: ['code_formatting', 'citation_addition', 'structure_enhancement', 'metadata_addition']
      }
    };
  }

  // Format code blocks with proper syntax highlighting hints
  formatCodeBlocks(response) {
    // Enhance code block detection and formatting
    return response.replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      (match, language, code) => {
        const detectedLanguage = language || this.detectCodeLanguage(code);
        const cleanedCode = code.trim();
        return `\`\`\`${detectedLanguage}\n${cleanedCode}\n\`\`\``;
      }
    );
  }

  // Detect programming language from code content
  detectCodeLanguage(code) {
    const patterns = {
      javascript: /\b(function|const|let|var|=>|require|module\.exports)\b/,
      typescript: /\b(interface|type|enum|as\s+\w+|import.*from)\b/,
      json: /^\s*[\{\[]/,
      bash: /^\s*(npm|yarn|cd|ls|mkdir|git)\s/m,
      sql: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b/i
    };

    for (const [language, pattern] of Object.entries(patterns)) {
      if (pattern.test(code)) {
        return language;
      }
    }

    return 'text';
  }

  // Add source citations to the response
  async addSourceCitations(response, optimizedContext) {
    const sources = optimizedContext.selectedDocuments;
    if (!sources || sources.length === 0) return response;

    // Find references to sources in the response and add citations
    let citedResponse = response;
    const citations = new Set();

    sources.forEach((doc, index) => {
      const source = doc.metadata?.source || 'Unknown';
      const citation = `[${index + 1}]`;
      
      // Look for implicit references to this source
      if (this.responseReferencesSource(response, doc)) {
        citations.add(`${citation} ${source}`);
      }
    });

    // Add citations section if any were found
    if (citations.size > 0) {
      citedResponse += '\n\n---\n\n**Sources:**\n' + 
        Array.from(citations).map(citation => `- ${citation}`).join('\n');
    }

    return citedResponse;
  }

  // Check if response references a particular source
  responseReferencesSource(response, doc) {
    const source = doc.metadata?.source || '';
    const content = doc.pageContent;
    
    // Check for direct file mentions
    if (response.includes(source)) return true;
    
    // Check for content-based references (key terms from the document)
    const keyTerms = this.extractKeyTerms(content);
    const responseTerms = response.toLowerCase();
    
    let matches = 0;
    for (const term of keyTerms) {
      if (responseTerms.includes(term.toLowerCase())) {
        matches++;
      }
    }
    
    // If multiple key terms from the document appear in the response, it's likely referenced
    return matches >= 2;
  }

  // Extract key terms from document content
  extractKeyTerms(content) {
    // Extract function names, class names, API endpoints, etc.
    const terms = new Set();
    
    // Function names
    const functionMatches = content.match(/function\s+(\w+)|const\s+(\w+)\s*=/g);
    if (functionMatches) {
      functionMatches.forEach(match => {
        const name = match.match(/(\w+)/g)?.[1];
        if (name && name.length > 3) terms.add(name);
      });
    }
    
    // API endpoints
    const endpointMatches = content.match(/['"`]\/[\w\/-]+['"`]/g);
    if (endpointMatches) {
      endpointMatches.forEach(match => {
        terms.add(match.replace(/['"`]/g, ''));
      });
    }
    
    // Technical terms (capitalized words that might be important)
    const technicalTerms = content.match(/\b[A-Z][a-zA-Z]{3,}\b/g);
    if (technicalTerms) {
      technicalTerms.slice(0, 10).forEach(term => terms.add(term));
    }
    
    return Array.from(terms).slice(0, 15); // Limit to most relevant terms
  }

  // Structure response with proper headings and sections
  structureResponse(response, processedQuery) {
    const classification = processedQuery.classification;
    
    // If response doesn't have clear structure, add it
    if (!response.includes('#') && !response.includes('**') && response.length > 300) {
      // Try to identify natural sections and add structure
      const sections = response.split('\n\n');
      if (sections.length > 2) {
        let structured = '';
        sections.forEach((section, index) => {
          if (index === 0) {
            structured += section + '\n\n';
          } else if (section.includes('```')) {
            structured += '## Code Example\n\n' + section + '\n\n';
          } else if (section.toLowerCase().includes('step') || section.match(/^\d+\./)) {
            structured += '## Implementation Steps\n\n' + section + '\n\n';
          } else {
            structured += section + '\n\n';
          }
        });
        return structured;
      }
    }
    
    return response;
  }

  // Add helpful enhancements to the response
  async addResponseEnhancements(response, processedQuery, optimizedContext) {
    let enhanced = response;
    const classification = processedQuery.classification;

    // Add category-specific enhancements
    switch (classification.primary_category) {
      case 'CODE_IMPLEMENTATION':
        enhanced += this.addCodeEnhancements(response, optimizedContext);
        break;
        
      case 'API_USAGE':
        enhanced += this.addApiEnhancements(response, optimizedContext);
        break;
        
      case 'DEBUGGING':
        enhanced += this.addDebuggingEnhancements(response, optimizedContext);
        break;
    }

    // Add general helpful information
    enhanced += this.addGeneralEnhancements(processedQuery, optimizedContext);

    return enhanced;
  }

  // Add code-specific enhancements
  addCodeEnhancements(response, optimizedContext) {
    let enhancements = '';
    
    // Check if response includes code but lacks testing information
    if (response.includes('```') && !response.toLowerCase().includes('test')) {
      enhancements += '\n\n## Testing Suggestions\n\n';
      enhancements += 'Consider adding tests for this implementation. ';
      enhancements += 'Check the `_tests_` directory for similar test patterns you can follow.\n';
    }
    
    // Add security considerations for certain patterns
    if (response.includes('password') || response.includes('token') || response.includes('auth')) {
      enhancements += '\n\n## Security Note\n\n';
      enhancements += '⚠️ Remember to handle sensitive information securely and never expose credentials in code.\n';
    }
    
    return enhancements;
  }

  // Add API-specific enhancements
  addApiEnhancements(response, optimizedContext) {
    let enhancements = '';
    
    // Add rate limiting information if API endpoints are mentioned
    if (response.includes('/api/') || response.includes('endpoint')) {
      enhancements += '\n\n## Additional Considerations\n\n';
      enhancements += '- **Rate Limiting**: Check if the endpoint has rate limiting rules\n';
      enhancements += '- **Authentication**: Ensure proper authentication headers are included\n';
      enhancements += '- **Error Handling**: Implement proper error handling for API responses\n';
    }
    
    return enhancements;
  }

  // Add debugging-specific enhancements
  addDebuggingEnhancements(response, optimizedContext) {
    let enhancements = '';
    
    enhancements += '\n\n## Debugging Tools\n\n';
    enhancements += 'Useful debugging approaches for this issue:\n';
    enhancements += '- Check browser developer tools console for errors\n';
    enhancements += '- Review server logs for backend issues\n';
    enhancements += '- Use `console.log()` or debugger statements strategically\n';
    enhancements += '- Test with simplified inputs to isolate the problem\n';
    
    return enhancements;
  }

  // Add general helpful enhancements
  addGeneralEnhancements(processedQuery, optimizedContext) {
    let enhancements = '';
    
    // Add related resources if available
    const relatedModules = optimizedContext.selectedDocuments
      .filter(doc => doc.metadata?.module)
      .map(doc => doc.metadata.module)
      .filter((module, index, array) => array.indexOf(module) === index)
      .slice(0, 3);
      
    if (relatedModules.length > 0) {
      enhancements += '\n\n## Related Modules\n\n';
      enhancements += `You might also find these modules helpful: ${relatedModules.join(', ')}\n`;
    }
    
    // Add follow-up suggestions
    enhancements += '\n\n## Need More Help?\n\n';
    enhancements += 'If you need clarification or have follow-up questions, feel free to ask about:\n';
    enhancements += '- Specific implementation details\n';
    enhancements += '- Error handling strategies\n';
    enhancements += '- Performance optimizations\n';
    enhancements += '- Alternative approaches\n';
    
    return enhancements;
  }

  // Validate response quality
  validateResponseQuality(response, processedQuery) {
    const issues = [];
    let score = 1.0;
    
    // Check response length
    if (response.length < 100) {
      issues.push('Response may be too short');
      score -= 0.3;
    }
    
    // Check if code questions have code examples
    if (processedQuery.classification.requires_code_examples && !response.includes('```')) {
      issues.push('Code examples missing for implementation question');
      score -= 0.2;
    }
    
    // Check for proper structure
    if (response.length > 500 && !response.includes('#') && !response.includes('**')) {
      issues.push('Response lacks clear structure');
      score -= 0.1;
    }
    
    // Check for helpful elements
    if (!response.includes('example') && !response.includes('Example')) {
      score -= 0.05;
    }
    
    score = Math.max(score, 0.0);
    
    return {
      score: parseFloat(score.toFixed(2)),
      issues: issues,
      recommendations: issues.length > 0 ? 
        'Consider regenerating with more specific prompts' : 
        'Response quality looks good'
    };
  }
}

module.exports = ResponseGenerator;
