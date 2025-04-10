/* eslint-disable no-unused-vars */
const Snapshot = require('../../src/domain/entities/snapshot'); // Adjust the path as necessary
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('Snapshot', () => {
  let snapshot;
  const videoId = 'test-video-id';
  const timestamp = 123456;
  const mockIOCRPort = {
    extractCode: jest.fn(),
    extractText: jest.fn(),
  };
  const mockDatabasePort = {
    saveCodeSnippet: jest.fn(),
    saveTextSnippet: jest.fn(),
  };

  beforeEach(() => {
    snapshot = new Snapshot(videoId, timestamp, mockIOCRPort, mockDatabasePort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID and provided values', () => {
    expect(snapshot.snapshotId).toBe('mocked-uuid');
    expect(snapshot.videoId).toBe(videoId);
    expect(snapshot.timestamp).toBe(timestamp);
    expect(snapshot.imageURL).toBe('stub imageURL');
    expect(snapshot.IocrPort).toBe(mockIOCRPort);
    expect(snapshot.databasePort).toBe(mockDatabasePort);
  });

  describe('extractCode', () => {
    it('should extract code from the image and save it in the database', async () => {
      const imageURL = 'test-image-url';
      const mockCodeSnippet = { code: 'const a = 10;' };
      mockIOCRPort.extractCode.mockResolvedValue(mockCodeSnippet);

      const codeSnippet = await snapshot.extractCode(imageURL, mockIOCRPort, mockDatabasePort);

      expect(mockIOCRPort.extractCode).toHaveBeenCalledWith(imageURL);
      expect(mockDatabasePort.saveCodeSnippet).toHaveBeenCalledWith(mockCodeSnippet);
      expect(codeSnippet).toEqual(mockCodeSnippet);
    });

    it('should handle errors when saving the extracted code snippet', async () => {
      const imageURL = 'test-image-url';
      const mockCodeSnippet = { code: 'const a = 10;' };
      mockIOCRPort.extractCode.mockResolvedValue(mockCodeSnippet);
      mockDatabasePort.saveCodeSnippet.mockRejectedValue(new Error('Save error'));

      const codeSnippet = await snapshot.extractCode(imageURL, mockIOCRPort, mockDatabasePort);

      expect(mockIOCRPort.extractCode).toHaveBeenCalledWith(imageURL);
      expect(mockDatabasePort.saveCodeSnippet).toHaveBeenCalledWith(mockCodeSnippet);
      expect(codeSnippet).toEqual(mockCodeSnippet);
    });
  });

  describe('captureText', () => {
    it('should extract text from the image and save it in the database', async () => {
      const imageURL = 'test-image-url';
      const mockExtractedText = { text: 'Hello, World!' };
      mockIOCRPort.extractText.mockResolvedValue(mockExtractedText);

      const extractedText = await snapshot.captureText(imageURL);

      expect(mockIOCRPort.extractText).toHaveBeenCalledWith(imageURL);
      expect(mockDatabasePort.saveTextSnippet).toHaveBeenCalledWith(mockExtractedText);
      expect(extractedText).toEqual(mockExtractedText);
    });

    it('should handle errors when saving the extracted text snippet', async () => {
      const imageURL = 'test-image-url';
      const mockExtractedText = { text: 'Hello, World!' };
      mockIOCRPort.extractText.mockResolvedValue(mockExtractedText);
      mockDatabasePort.saveTextSnippet.mockRejectedValue(new Error('Save error'));

      const extractedText = await snapshot.captureText(imageURL);

      expect(mockIOCRPort.extractText).toHaveBeenCalledWith(imageURL);
      expect(mockDatabasePort.saveTextSnippet).toHaveBeenCalledWith(mockExtractedText);
      expect(extractedText).toEqual(mockExtractedText);
    });
  });
});
