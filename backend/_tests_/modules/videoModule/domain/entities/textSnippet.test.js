const TextSnippet = require('../../../../../modules/video_module/domain/entities/textSnippet'); // Adjust the path as necessary
const { v4: uuid } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('TextSnippet', () => {
  let textSnippet;
  const sampleText = 'Hello, World!';
  const videoYoutubeId = 'test-video-id';
  const textSnippetId = 'test-text-snippet-id';
  const mockIAIPort = {
    explainText: jest.fn(),
    translateText: jest.fn(),
  };
  const mockIDatabasePort = {
    findText: jest.fn(),
    saveTextExplanation: jest.fn(),
    saveTextTranslation: jest.fn(),
  };

  beforeEach(() => {
    textSnippet = new TextSnippet(sampleText, mockIAIPort, mockIDatabasePort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID and provided text', () => {
    expect(textSnippet.textSnippetId).toBe('mocked-uuid');
    expect(textSnippet.text).toBe(sampleText);
    expect(textSnippet.IAIPort).toBe(mockIAIPort);
    expect(textSnippet.IDatabasePort).toBe(mockIDatabasePort);
  });

  describe('explainText', () => {
    it('should explain text and save the explanation', async () => {
      const mockTextExplanation = { explanation: 'This is a greeting.' };
      mockIDatabasePort.findText.mockResolvedValue(sampleText);
      mock
