const Video = require('../../../../../modules/video_module/domain/aggregatess/video');
const Snapshot = require('../../../../../modules/video_module/domain/entities/snapshot'); 
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));
const mockISnapshotPort = { takeSnapshot: jest.fn() };
const mockIAIPort = {};
const mockIDatabasePort = { saveSnapshot: jest.fn(), saveTranscript: jest.fn() };
const mockIYoutubeDataPort = { downloadTranscript: jest.fn() };
const mockIOCRPort = {};
const mockVideoConstructService = {
  fetchVideoData: jest.fn(() => Promise.resolve({
    title: 'Test Video Title',
    author: 'Test Author',
    duration: 300,
    description: 'Test Description',
  })),
};
jest.mock('../../../../../modules/video_module/application/services/videoConstructService', () => {
  return jest.fn().mockImplementation(() => mockVideoConstructService);
});

describe('Video', () => {
  let video;
  const youtubeAPIKey = 'test-api-key';
  const videoYoutubeId = 'test-youtube-id';

  beforeEach(() => {
    video = new Video(
      videoYoutubeId,
      mockISnapshotPort,
      mockIAIPort,
      mockIDatabasePort,
      mockIYoutubeDataPort,
      mockIOCRPort,
      youtubeAPIKey
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default values and fetch video details', async () => {
    expect(video.videoId).toBe('mocked-uuid');
    expect(video.videoYoutubeId).toBe(videoYoutubeId);
    expect(video.title).toBe('default title');

    await video.init();

    expect(mockVideoConstructService.fetchVideoData).toHaveBeenCalledWith(videoYoutubeId);
    expect(video.title).toBe('Test Video Title');
    expect(video.author).toBe('Test Author');
    expect(video.duration).toBe(300);
    expect(video.description).toBe('Test Description');
  });

  it('should take a snapshot and save it in the database', async () => {
    const mockSnapshotDto = { videoYoutubeId, timestamp: 123456 };
    mockISnapshotPort.takeSnapshot.mockResolvedValue(mockSnapshotDto);

    const snapshot = await video.takeSnapshot(videoYoutubeId, mockISnapshotPort, mockIDatabasePort);

    expect(mockISnapshotPort.takeSnapshot).toHaveBeenCalledWith(videoYoutubeId, mockIDatabasePort);
    expect(mockIDatabasePort.saveSnapshot).toHaveBeenCalledWith(videoYoutubeId, expect.any(Snapshot));
    expect(snapshot).toEqual(mockSnapshotDto);
  });

  it('should download a transcript and save it in the database', async () => {
    const mockTranscript = { videoYoutubeId, content: 'Test Transcript' };
    mockIYoutubeDataPort.downloadTranscript.mockResolvedValue(mockTranscript);

    const transcript = await video.downloadTranscript(videoYoutubeId, youtubeAPIKey, mockIYoutubeDataPort, mockIDatabasePort);

    expect(mockIYoutubeDataPort.downloadTranscript).toHaveBeenCalledWith(videoYoutubeId, youtubeAPIKey);
    expect(mockIDatabasePort.saveTranscript).toHaveBeenCalledWith(mockTranscript, videoYoutubeId);
    expect(transcript).toEqual(mockTranscript);
  });

  it('should handle errors in init() gracefully', async () => {
    mockVideoConstructService.fetchVideoData.mockRejectedValue(new Error('Fetch Error'));

    await expect(video.init()).rejects.toThrow('Fetch Error');
  });

  it('should handle errors in takeSnapshot() gracefully', async () => {
    mockISnapshotPort.takeSnapshot.mockRejectedValue(new Error('Snapshot Error'));

    await expect(video.takeSnapshot(videoYoutubeId, mockISnapshotPort, mockIDatabasePort)).rejects.toThrow('Snapshot Error');
    expect(mockIDatabasePort.saveSnapshot).not.toHaveBeenCalled();
  });

  it('should handle errors in downloadTranscript() gracefully', async () => {
    mockIYoutubeDataPort.downloadTranscript.mockRejectedValue(new Error('Transcript Error'));

    await expect(video.downloadTranscript(videoYoutubeId, youtubeAPIKey, mockIYoutubeDataPort, mockIDatabasePort)).rejects.toThrow('Transcript Error');
    expect(mockIDatabasePort.saveTranscript).not.toHaveBeenCalled();
  });
});
