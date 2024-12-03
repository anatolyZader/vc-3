const CodeSnippet = require('../../../../../modules/video_module/domain/entities/codeSnippet'); // Adjust the path as needed
const { v4: uuid } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('CodeSnippet', () => {
  let codeSnippet;
  const mockICodeSnippetPort = { explainCode: jest.fn() };
  const mockIDatabasePort = { saveCodeExplanation: jest.fn() };
  const sampleCode = 'const a = 10;';

  beforeEach(() => {
    codeSnippet = new CodeSnippet(sampleCode);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID and provided code', () => {
    expect(codeSnippet.codeSnippetId).toBe('mocked-uuid');
    expect(codeSnippet.code).toBe(sampleCode);
    expect(codeSnippet.ICodeSnippetPort).toBeDefined();
    expect(codeSnippet.IDatabasePort).toBeDefined();
  });

  it('should explain the code and save the explanation', async () => {
    const explanation = { summary: 'This code declares a constant variable a with a value of 10.' };
    mockICodeSnippetPort.explainCode.mockResolvedValue(explanation);

    await codeSnippet.explainCode(sampleCode, mockICodeSnippetPort, mockIDatabasePort);

    expect(mockICodeSnippetPort.explainCode).toHaveBeenCalledWith(sampleCode);
    expect(mockIDatabasePort.saveCodeExplanation).toHaveBeenCalledWith(explanation);
  });

  it('should handle errors when explaining code', async () => {
    mockICodeSnippetPort.explainCode.mockRejectedValue(new Error('Explain code error'));

    await expect(codeSnippet.explainCode(sampleCode, mockICodeSnippetPort, mockIDatabasePort)).rejects.toThrow('Explain code error');
    expect(mockIDatabasePort.saveCodeExplanation).not.toHaveBeenCalled();
  });

  it('should handle errors when saving code explanation', async () => {
    const explanation = { summary: 'This code declares a constant variable a with a value of 10.' };
    mockICodeSnippetPort.explainCode.mockResolvedValue(explanation);
    mockIDatabasePort.saveCodeExplanation.mockRejectedValue(new Error('Save explanation error'));

    await expect(codeSnippet.explainCode(sampleCode, mockICodeSnippetPort, mockIDatabasePort)).rejects.toThrow('Save explanation error');
    expect(mockIDatabasePort.saveCodeExplanation).toHaveBeenCalledWith(explanation);
  });
});
