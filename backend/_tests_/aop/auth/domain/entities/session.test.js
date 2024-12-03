const Session = require('../../../../../aop/auth/domain/entities/session'); // Adjust the path as necessary
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('Session', () => {
  let session;
  const userId = 'test-user-id';
  const mockIAuthPersistencePort = {
    saveSession: jest.fn(),
    fetchSession: jest.fn(),
  };

  beforeEach(() => {
    session = new Session(userId, mockIAuthPersistencePort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID, userId, and creation date', () => {
    expect(session.sessionId).toBe('mocked-uuid');
    expect(session.userId).toBe(userId);
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.databasePort).toBe(mockIAuthPersistencePort);
  });

  describe('createSession', () => {
    it('should save the session using IAuthPersistencePort', async () => {
      await session.createSession();

      expect(mockIAuthPersistencePort.saveSession).toHaveBeenCalledWith(session);
    });

    it('should handle errors when creating a session', async () => {
      mockIAuthPersistencePort.saveSession.mockRejectedValue(new Error('Save session error'));

      await expect(session.createSession()).rejects.toThrow('Save session error');

      expect(mockIAuthPersistencePort.saveSession).toHaveBeenCalledWith(session);
    });
  });

  describe('validateSession', () => {
    it('should validate the session if it exists and is less than 1 hour old', async () => {
      const mockSessionData = {
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };
      mockIAuthPersistencePort.fetchSession.mockResolvedValue(mockSessionData);

      const isValid = await session.validateSession();

      expect(mockIAuthPersistencePort.fetchSession).toHaveBeenCalledWith(session.sessionId);
      expect(isValid).toBe(true);
    });

    it('should invalidate the session if it does not exist', async () => {
      mockIAuthPersistencePort.fetchSession.mockResolvedValue(null);

      const isValid = await session.validateSession();

      expect(mockIAuthPersistencePort.fetchSession).toHaveBeenCalledWith(session.sessionId);
      expect(isValid).toBe(false);
    });

    it('should invalidate the session if it is older than 1 hour', async () => {
      const mockSessionData = {
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      mockIAuthPersistencePort.fetchSession.mockResolvedValue(mockSessionData);

      const isValid = await session.validateSession();

      expect(mockIAuthPersistencePort.fetchSession).toHaveBeenCalledWith(session.sessionId);
      expect(isValid).toBe(false);
    });

    it('should handle errors when validating a session', async () => {
      mockIAuthPersistencePort.fetchSession.mockRejectedValue(new Error('Fetch session error'));

      await expect(session.validateSession()).rejects.toThrow('Fetch session error');

      expect(mockIAuthPersistencePort.fetchSession).toHaveBeenCalledWith(session.sessionId);
    });
  });

  describe('login', () => {
    it('should log in a user', async () => {
      // Implementation missing in the provided code. Test case to be updated when login logic is added.
      console.log('Login functionality is not yet implemented.');
    });

    it('should handle errors during login', async () => {
      // Implementation missing in the provided code. Test case to be updated when login logic is added.
      console.log('Login functionality is not yet implemented.');
    });
  });

  describe('logout', () => {
    it('should log out a user', async () => {
      // Implementation missing in the provided code. Test case to be updated when logout logic is added.
      console.log('Logout functionality is not yet implemented.');
    });

    it('should handle errors during logout', async () => {
      // Implementation missing in the provided code. Test case to be updated when logout logic is added.
      console.log('Logout functionality is not yet implemented.');
    });
  });
});
