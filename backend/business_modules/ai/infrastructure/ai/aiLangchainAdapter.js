'use strict';

const IAIAIPort = require('../../domain/ports/IAIAIPort');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, Annotation } = require('@langchain/langgraph');
const { pull } = require('langchain/hub');
const fs = require('fs').promises;
const wsPlugin = require('../../../../aop_modules/ws/wsPlugin');

class AILangchainAdapter extends IAIAIPort {
  constructor() {
    super();
    this.embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-large' });
    this.vectorStore = new MemoryVectorStore(this.embeddings);
    this.llm = new ChatOpenAI({ modelName: 'gpt-4', temperature: 0 });

    // Initialize the WebSocket server and register the AI message handler.
    wsPlugin.createWSServer(8080);
    wsPlugin.registerHandler(async (message, ws) => {
      try {
        const { userId, conversationId, prompt, repoFilePath, wikiFilePath } = JSON.parse(message);
        const response = await this.respondToPrompt(userId, conversationId, prompt, repoFilePath, wikiFilePath);
        ws.send(JSON.stringify({ conversationId, response }));
      } catch (error) {
        console.error('WebSocket error:', error);
        ws.send(JSON.stringify({ error: 'Failed to process message' }));
      }
    });
  }

  async respondToPrompt(userId, conversationId, prompt, preFetchedRepo, preFetchedWiki) {
    try {
      const [gitRepoContent, wikiContent] = await Promise.all([
        fs.readFile(preFetchedRepo, 'utf-8'),
        fs.readFile(preFetchedWiki, 'utf-8'),
      ]);

      const docs = [
        { pageContent: gitRepoContent, metadata: { source: 'GitHub Repo' } },
        { pageContent: wikiContent, metadata: { source: 'Git Wiki' } },
      ];

      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
      const splits = await splitter.splitDocuments(docs);

      await this.vectorStore.addDocuments(splits);
      console.log('Indexed GitHub and Wiki data');

      const retrievedDocs = await this.vectorStore.similaritySearch(prompt, 3);
      const docsContent = retrievedDocs.map(doc => doc.pageContent).join('\n');

      const StateAnnotation = Annotation.Root({
        question: Annotation.string(),
        context: Annotation.array(),
        answer: Annotation.string(),
      });

      const retrieve = async () => ({ context: retrievedDocs });

      const generate = async (state) => {
        const promptTemplate = await pull('rlm/rag-prompt');
        const messages = await promptTemplate.invoke({ question: state.question, context: docsContent });
        const response = await this.llm.invoke(messages);
        return { answer: response.content };
      };

      const graph = new StateGraph(StateAnnotation)
        .addNode('retrieve', retrieve)
        .addNode('generate', generate)
        .addEdge('__start__', 'retrieve')
        .addEdge('retrieve', 'generate')
        .addEdge('generate', '__end__')
        .compile();

      const result = await graph.invoke({ question: prompt });
      console.log(`Generated AI response: ${result.answer}`);

      return result.answer;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }
}

module.exports = AILangchainAdapter;
