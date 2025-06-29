/* eslint-disable no-unused-vars */
const User = require('../../../../../aop/auth/domain/entities/user'); 
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('User', () => {
  let user;
  const username = 'test-user';
  const email = 'test@example.com';
  const password = 'password123';
  const mockIAuthPersistPort = {
    createUser: jest.fn(),
    getUserInfo: jest.fn(),
    removeUser: jest.fn(),
  };

  beforeEach(() => {
    user = new User(username, email);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with a unique ID, username, and email', () => {
    expect(user.userId).toBe('mocked-uuid');
    expect(user.username).toBe(username);
    expect(user.email).toBe(email);
    expect(user.password).toBe('');
    expect(user.accounts).toEqual([]);
    expect(user.roles).toBe('');
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const mockUserDTO = { userId: 'test-user-id', username, email };
      mockIAuthPersistPort.createUser.mockResolvedValue(mockUserDTO);

      const newUserDTO = await user.register(username, email, password, mockIAuthPersistPort);

      expect(mockIAuthPersistPort.createUser).toHaveBeenCalledWith(username, email, password);
      expect(newUserDTO).toEqual(mockUserDTO);
    });

    it('should handle errors during user registration', async () => {
      mockIAuthPersistPort.createUser.mockRejectedValue(new Error('Create user error'));

      await expect(user.register(username, email, password, mockIAuthPersistPort)).rejects.toThrow('Create user error');

      expect(mockIAuthPersistPort.createUser).toHaveBeenCalledWith(username, email, password);
    });
  });

  describe('getUserInfo', () => {
    it('should read user details successfully', async () => {
      const mockUserDTO = { userId: 'test-user-id', username, email };
      mockIAuthPersistPort.getUserInfo.mockResolvedValue(mockUserDTO);

      const userDTO = await user.getUserInfo(username, mockIAuthPersistPort);

      expect(mockIAuthPersistPort.getUserInfo).toHaveBeenCalledWith(username);
      expect(userDTO).toEqual(mockUserDTO);
    });

    it('should handle errors during user reading', async () => {
      mockIAuthPersistPort.getUserInfo.mockRejectedValue(new Error('Read user error'));

      await expect(user.getUserInfo(username, mockIAuthPersistPort)).rejects.toThrow('Read user error');

      expect(mockIAuthPersistPort.getUserInfo).toHaveBeenCalledWith(username);
    });
  });

  describe('removeUser', () => {
    it('should remove a user successfully', async () => {
      mockIAuthPersistPort.removeUser.mockResolvedValue();

      await user.removeUser(username, password, mockIAuthPersistPort);

      expect(mockIAuthPersistPort.removeUser).toHaveBeenCalledWith(username, password);
    });

    it('should handle errors during user removal', async () => {
      mockIAuthPersistPort.removeUser.mockRejectedValue(new Error('Remove user error'));

      await expect(user.removeUser(username, password, mockIAuthPersistPort)).rejects.toThrow('Remove user error');

      expect(mockIAuthPersistPort.removeUser).toHaveBeenCalledWith(username, password);
    });
  });
});
