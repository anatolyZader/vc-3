'strict'
// TextSnippetService.js
class TextSnippetService {
    constructor({textSnippet, aiAdapter, 
          postgresAdapter}) {
        this.textSnippet = textSnippet;
        this.aiAdapter = aiAdapter;
        this.postgresAdapter = postgresAdapter;   
    }

    async explainText(text) {
        console.log('Explaining text!');
        const textExplanation = await this.textSnippet.explainCode(text, this.aiAdapter, this.postgresAdapter);
        await this.postgresAdapter.saveTextExplanation(textExplanation);
    }
}
    // async translateText(text) {
    //     console.log('Translating text!');
    //     return await textSnippet.translateText(  this.aiAdapter, this.postgresAdapter);
    // }


module.exports = TextSnippetService;