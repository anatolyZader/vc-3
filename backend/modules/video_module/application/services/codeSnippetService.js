'strict';
// CodeSnippetService.js
class CodeSnippetService {
    constructor({codeSnippet, aiAdapter, postgresAdapter}) {
        this.codeSnippet = codeSnippet;
        this.aiAdapter = aiAdapter;
        this.postgresAdapter = postgresAdapter;
    }

    async explainCode(code) {
        console.log('Explaining code!');
        const codeExplanation = await this.codeSnippet.explainCode(code, this.aiAdapter, this.postgresAdapter);
        await this.postgresAdapter.saveCodeExplanation(codeExplanation);
    }
}


module.exports = CodeSnippetService;
