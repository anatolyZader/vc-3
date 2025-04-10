const Resource = require('../../../../../aop/permissions/domain/entities/resource'); // Adjust the path as necessary

describe('Resource', () => {
  let resource;
  const resourceId = 'test-resource-id';
  const resourceName = 'Test Resource';
  const resourceType = 'file';

  beforeEach(() => {
    resource = new Resource(resourceId, resourceName, resourceType);
  });

  it('should initialize with id, name, and type', () => {
    expect(resource.id).toBe(resourceId);
    expect(resource.name).toBe(resourceName);
    expect(resource.type).toBe(resourceType);
  });

  describe('rename', () => {
    it('should rename the resource', () => {
      const newName = 'Updated Resource';
      resource.rename(newName);
      expect(resource.name).toBe(newName);
    });
  });

  describe('changeType', () => {
    it('should change the type of the resource', () => {
      const newType = 'folder';
      resource.changeType(newType);
      expect(resource.type).toBe(newType);
    });
  });
});
