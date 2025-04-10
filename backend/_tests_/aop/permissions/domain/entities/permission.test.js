const Permission = require('../../../../../aop/permissions/domain/entities/permission'); // Adjust the path as necessary

describe('Permission', () => {
  let permission;
  const roleId = 'test-role-id';
  const resourceId = 'test-resource-id';
  const initialActions = ['read', 'write'];

  beforeEach(() => {
    permission = new Permission(roleId, resourceId, [...initialActions]);
  });

  it('should initialize with roleId, resourceId, and actions', () => {
    expect(permission.roleId).toBe(roleId);
    expect(permission.resourceId).toBe(resourceId);
    expect(permission.actions).toEqual(initialActions);
  });

  describe('isAllowed', () => {
    it('should return true if the action is allowed', () => {
      expect(permission.isAllowed('read')).toBe(true);
      expect(permission.isAllowed('write')).toBe(true);
    });

    it('should return false if the action is not allowed', () => {
      expect(permission.isAllowed('delete')).toBe(false);
    });
  });

  describe('addAction', () => {
    it('should add a new action to the permission', () => {
      permission.addAction('delete');
      expect(permission.actions).toContain('delete');
    });

    it('should not add an action that already exists', () => {
      permission.addAction('read');
      expect(permission.actions).toEqual(initialActions);
    });
  });

  describe('removeAction', () => {
    it('should remove an action from the permission', () => {
      permission.removeAction('read');
      expect(permission.actions).not.toContain('read');
    });

    it('should do nothing if the action does not exist', () => {
      permission.removeAction('delete');
      expect(permission.actions).toEqual(initialActions);
    });
  });
});
