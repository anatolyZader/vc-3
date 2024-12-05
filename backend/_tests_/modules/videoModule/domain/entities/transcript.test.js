/* eslint-disable no-unused-vars */
const Transcript = require('../../../../../modules/video_module/domain/entities/transcript'); 
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('Transcript', () => {
  let transcript;
  const videoYoutubeId = 'test-video-id';
  const mockIAIPort = {
    translateTranscript: jest.fn(),
  };
  const mockIDatabasePort = {};

  beforeEach(() => {
    transcript = new Transcript(videoYoutubeId);
    transcript.aiPort = mockIAIPort; // Injecting mock port
    transcript.databasePort = mockIDatabasePort; // Injecting mock port
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID and provided videoYoutubeId', () => {
    expect(transcript.transcriptId).toBe('mocked-uuid');
    expect(transcript.videoYoutubeId).toBe(videoYoutubeId);
    expect(transcript.text).toBe('');
  });

  describe('translateTranscript', () => {
    it('should translate the transcript text using the AI port', async () => {
      const mockTranslation = { translation: 'Translated transcript content' };
      mockIAIPort.translateTranscript.mockResolvedValue(mockTranslation);

      const translation = await transcript.translateTranscript();

      expect(mockIAIPort.translateTranscript).toHaveBeenCalledWith('stub transcript');
      expect(translation).toEqual(mockTranslation);
    });

    it('should handle errors during translation', async () => {
      mockIAIPort.translateTranscript.mockRejectedValue(new Error('Translation error'));

      await expect(transcript.translateTranscript()).rejects.toThrow('Translation error');

      expect(mockIAIPort.translateTranscript).toHaveBeenCalledWith('stub transcript');
    });
  });
});
