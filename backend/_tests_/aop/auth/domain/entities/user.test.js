/* eslint-disable no-unused-vars */
const User = require('../../../../../aop/auth/domain/entities/user'); 
const { v4: uuidv4 } = require('uuid');

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mocked-uuid') }));

describe('User', () => {
  let user;
  const username = 'test-user';
  const email = 'test@example.com';
  const password = 'password123';
  const mockIAuthPersistencePort = {
    createUser: jest.fn(),
    readUser: jest.fn(),
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
      mockIAuthPersistencePort.createUser.mockResolvedValue(mockUserDTO);

      const newUserDTO = await user.register(username, email, password, mockIAuthPersistencePort);

      expect(mockIAuthPersistencePort.createUser).toHaveBeenCalledWith(username, email, password);
      expect(newUserDTO).toEqual(mockUserDTO);
    });

    it('should handle errors during user registration', async () => {
      mockIAuthPersistencePort.createUser.mockRejectedValue(new Error('Create user error'));

      await expect(user.register(username, email, password, mockIAuthPersistencePort)).rejects.toThrow('Create user error');

      expect(mockIAuthPersistencePort.createUser).toHaveBeenCalledWith(username, email, password);
    });
  });

  describe('readUser', () => {
    it('should read user details successfully', async () => {
      const mockUserDTO = { userId: 'test-user-id', username, email };
      mockIAuthPersistencePort.readUser.mockResolvedValue(mockUserDTO);

      const userDTO = await user.readUser(username, mockIAuthPersistencePort);

      expect(mockIAuthPersistencePort.readUser).toHaveBeenCalledWith(username);
      expect(userDTO).toEqual(mockUserDTO);
    });

    it('should handle errors during user reading', async () => {
      mockIAuthPersistencePort.readUser.mockRejectedValue(new Error('Read user error'));

      await expect(user.readUser(username, mockIAuthPersistencePort)).rejects.toThrow('Read user error');

      expect(mockIAuthPersistencePort.readUser).toHaveBeenCalledWith(username);
    });
  });

  describe('removeUser', () => {
    it('should remove a user successfully', async () => {
      mockIAuthPersistencePort.removeUser.mockResolvedValue();

      await user.removeUser(username, password, mockIAuthPersistencePort);

      expect(mockIAuthPersistencePort.removeUser).toHaveBeenCalledWith(username, password);
    });

    it('should handle errors during user removal', async () => {
      mockIAuthPersistencePort.removeUser.mockRejectedValue(new Error('Remove user error'));

      await expect(user.removeUser(username, password, mockIAuthPersistencePort)).rejects.toThrow('Remove user error');

      expect(mockIAuthPersistencePort.removeUser).toHaveBeenCalledWith(username, password);
    });
  });
});
