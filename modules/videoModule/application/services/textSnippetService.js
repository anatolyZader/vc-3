
const aiAdapter = require('../../infrastructure/ai/aiAdapter'); 

async function explainText(text) {
    console.log('Explaining text!');
    return await aiAdapter.explainText(text);
}

async function translateText(text) {
    console.log('Translating text!');
    return await aiAdapter.translateText(text);
}

module.exports = {
    explainText,
    translateText
};
