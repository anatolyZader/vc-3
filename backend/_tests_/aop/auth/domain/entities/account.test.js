/* eslint-disable no-unused-vars */
const Account = require('../../../../../aop/auth/domain/entities/account'); 
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('Account', () => {
  let account;
  const userId = 'test-user-id';
  const userName = 'test-user';
  const mockIAuthPersistencePort = {
    fetchAccountDetails: jest.fn(),
  };
  const mockDatabasePort = {
    addVideoToAccount: jest.fn(),
    removeVideo: jest.fn(),
  };

  beforeEach(() => {
    account = new Account(userId, userName, mockIAuthPersistencePort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID, userId, and creation date', () => {
    expect(account.accountId).toBe('mocked-uuid');
    expect(account.userId).toBe(userId);
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.videos).toEqual([]);
    expect(account.IAuthPersistencePort).toBe(mockIAuthPersistencePort);
  });

  describe('fetchAccountDetails', () => {
    it('should fetch account details and update the instance properties', async () => {
      const mockAccountData = {
        accountType: 'premium',
        createdAt: new Date('2022-01-01T00:00:00.000Z'),
      };
      mockIAuthPersistencePort.fetchAccountDetails.mockResolvedValue(mockAccountData);

      const accountDetails = await account.fetchAccountDetails(
        'test-account-id',
        mockIAuthPersistencePort
      );

      expect(mockIAuthPersistencePort.fetchAccountDetails).toHaveBeenCalledWith('test-account-id');
      expect(accountDetails).toEqual(mockAccountData);
      expect(account.accountType).toBe(mockAccountData.accountType);
      expect(account.createdAt).toEqual(mockAccountData.createdAt);
    });

    it('should handle errors when fetching account details', async () => {
      mockIAuthPersistencePort.fetchAccountDetails.mockRejectedValue(
        new Error('Fetch account error')
      );

      await expect(
        account.fetchAccountDetails('test-account-id', mockIAuthPersistencePort)
      ).rejects.toThrow('Fetch account error');
    });

    it('should return null if account data is not found', async () => {
      mockIAuthPersistencePort.fetchAccountDetails.mockResolvedValue(null);

      const accountDetails = await account.fetchAccountDetails(
        'test-account-id',
        mockIAuthPersistencePort
      );

      expect(mockIAuthPersistencePort.fetchAccountDetails).toHaveBeenCalledWith('test-account-id');
      expect(accountDetails).toBeNull();
    });
  });

  describe('addVideo', () => {
    it('should add a video to the account', async () => {
      const videoYoutubeId = 'test-video-id';
      const accountId = 'test-account-id';

      await account.addVideo(videoYoutubeId, accountId, mockDatabasePort);

      expect(mockDatabasePort.addVideoToAccount).toHaveBeenCalledWith(accountId, videoYoutubeId);
    });

    it('should handle errors when adding a video to the account', async () => {
      const videoYoutubeId = 'test-video-id';
      const accountId = 'test-account-id';
      mockDatabasePort.addVideoToAccount.mockRejectedValue(new Error('Add video error'));

      await expect(account.addVideo(videoYoutubeId, accountId, mockDatabasePort)).rejects.toThrow(
        'Add video error'
      );

      expect(mockDatabasePort.addVideoToAccount).toHaveBeenCalledWith(accountId, videoYoutubeId);
    });
  });

  describe('removeVideo', () => {
    it('should remove a video from the account', async () => {
      const videoYoutubeId = 'test-video-id';
      const accountId = 'test-account-id';

      await account.removeVideo(videoYoutubeId, accountId, mockDatabasePort);

      expect(mockDatabasePort.removeVideo).toHaveBeenCalledWith(accountId, videoYoutubeId);
    });

    it('should handle errors when removing a video from the account', async () => {
      const videoYoutubeId = 'test-video-id';
      const accountId = 'test-account-id';
      mockDatabasePort.removeVideo.mockRejectedValue(new Error('Remove video error'));

      await expect(account.removeVideo(videoYoutubeId, accountId, mockDatabasePort)).rejects.toThrow(
        'Remove video error'
      );

      expect(mockDatabasePort.removeVideo).toHaveBeenCalledWith(accountId, videoYoutubeId);
    });
  });
});
