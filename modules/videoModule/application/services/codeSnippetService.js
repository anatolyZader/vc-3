
const aiAdapter = require('../../infrastructure/ai/aiAdapter'); 

async function explainCode(code) {
    console.log('Explaining code!');
    return await aiAdapter.explainCode(code);
}

module.exports = {
    explainCode
};
