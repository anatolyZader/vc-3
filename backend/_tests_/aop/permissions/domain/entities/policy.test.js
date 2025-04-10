const Policy = require('../../../../../aop/permissions/domain/entities/policy'); // Adjust the path as necessary
const Permission = require('../../../../../aop/permissions/domain/entities/permission'); // Adjust the path as necessary

describe('Policy', () => {
  let policy;
  const policyId = 'test-policy-id';
  const policyName = 'Test Policy';
  const policyDescription = 'This is a test policy.';
  let permission1, permission2;

  beforeEach(() => {
    permission1 = new Permission('role-1', 'resource-1', ['read', 'write']);
    permission2 = new Permission('role-2', 'resource-2', ['read']);
    policy = new Policy(policyId, policyName, policyDescription, [permission1]);
  });

  it('should initialize with id, name, description, and permissions', () => {
    expect(policy.id).toBe(policyId);
    expect(policy.name).toBe(policyName);
    expect(policy.description).toBe(policyDescription);
    expect(policy.permissions).toEqual([permission1]);
  });

  describe('addPermission', () => {
    it('should add a new permission to the policy', () => {
      policy.addPermission(permission2);
      expect(policy.permissions).toContain(permission2);
    });
  });

  describe('removePermission', () => {
    it('should remove an existing permission from the policy', () => {
      policy.removePermission(permission1);
      expect(policy.permissions).not.toContain(permission1);
    });

    it('should not affect permissions if the specified permission does not exist', () => {
      policy.removePermission(permission2); // Not added to the policy
      expect(policy.permissions).toEqual([permission1]);
    });
  });

  describe('isAllowed', () => {
    it('should return true if the role is allowed to perform the action on the resource', () => {
      expect(policy.isAllowed('role-1', 'resource-1', 'read')).toBe(true);
      expect(policy.isAllowed('role-1', 'resource-1', 'write')).toBe(true);
    });

    it('should return false if the role is not allowed to perform the action on the resource', () => {
      expect(policy.isAllowed('role-1', 'resource-1', 'delete')).toBe(false);
    });

    it('should return false if the role or resource does not exist in the policy', () => {
      expect(policy.isAllowed('role-2', 'resource-1', 'read')).toBe(false);
      expect(policy.isAllowed('role-1', 'resource-2', 'read')).toBe(false);
    });
  });
});
