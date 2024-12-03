const Role = require('../../../../../aop/permissions/domain/entities/role'); // Adjust the path as necessary

describe('Role', () => {
  let role;
  const roleId = 'test-role-id';
  const roleName = 'Test Role';
  const roleDescription = 'This is a test role.';

  beforeEach(() => {
    role = new Role(roleId, roleName, roleDescription);
  });

  it('should initialize with id, name, and description', () => {
    expect(role.id).toBe(roleId);
    expect(role.name).toBe(roleName);
    expect(role.description).toBe(roleDescription);
  });

  describe('rename', () => {
    it('should rename the role', () => {
      const newName = 'Updated Role';
      role.rename(newName);
      expect(role.name).toBe(newName);
    });
  });

  describe('updateDescription', () => {
    it('should update the role description', () => {
      const newDescription = 'This is an updated description.';
      role.updateDescription(newDescription);
      expect(role.description).toBe(newDescription);
    });
  });
});
