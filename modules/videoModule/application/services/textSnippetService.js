
async function explainText(textSnippet, videoYoutubeId, textSnippetId, aiAdapter, postgresAdapter) {
    console.log('Explaining text!');
    return await textSnippet.explainText( textSnippetId, aiAdapter, postgresAdapter);
}

async function translateText(textSnippet, videoYoutubeId, textSnippetId, aiAdapter, postgresAdapter) {
    console.log('Translating text!');
    return await aiAdapter.translateText(videoYoutubeId, textSnippetId, aiAdapter, postgresAdapter);
}

module.exports = {
    explainText,
    translateText
};
