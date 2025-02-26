const { Pool } = require('pg');
const IPermPersistPort = require('../../domain/ports/IPermPersistPort');

class PermPostgresAdapter extends IPermPersistPort {
  constructor(connectionString) {
    super();
    this.pool = new Pool({
      connectionString: connectionString,
    });
  }

  // Role Methods
  async findRoleById(roleId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async saveRole(role) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await client.query(sql, [role.id, role.name, role.description]);
      return rows[0];
    } finally {
      client.release();
    }
  }

  async deleteRole(roleId) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM roles WHERE id = $1', [roleId]);
    } finally {
      client.release();
    }
  }

  async findAllRoles() {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM roles');
      return rows;
    } finally {
      client.release();
    }
  }

  // Resource Methods
  async findResourceById(resourceId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM resources WHERE id = $1', [resourceId]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async saveResource(resource) {
    const client = await this.pool.connect();
    try {
      const sql = 'INSERT INTO resources (id, name, type) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await client.query(sql, [resource.id, resource.name, resource.type]);
      return rows[0];
    } finally {
      client.release();
    }
  }

  async deleteResource(resourceId) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM resources WHERE id = $1', [resourceId]);
    } finally {
      client.release();
    }
  }

  async findAllResources() {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM resources');
      return rows;
    } finally {
      client.release();
    }
  }

  // Permission Methods
  async findPermissionByRoleAndResource(roleId, resourceId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT * FROM permissions WHERE role_id = $1 AND resource_id = $2',
        [roleId, resourceId]
      );
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async savePermission(permission) {
    const client = await this.pool.connect();
    try {
      const sql =
        'INSERT INTO permissions (role_id, resource_id, actions) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await client.query(sql, [
        permission.roleId,
        permission.resourceId,
        permission.actions,
      ]);
      return rows[0];
    } finally {
      client.release();
    }
  }

  async deletePermission(roleId, resourceId) {
    const client = await this.pool.connect();
    try {
      await client.query(
        'DELETE FROM permissions WHERE role_id = $1 AND resource_id = $2',
        [roleId, resourceId]
      );
    } finally {
      client.release();
    }
  }

  async findAllPermissions() {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM permissions');
      return rows;
    } finally {
      client.release();
    }
  }

  // Policy Methods
  async findPolicyById(policyId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM policies WHERE id = $1', [policyId]);
      if (!rows.length) {
        return null;
      }
      const policy = rows[0];

      // Fetch associated permissions
      const permissions = await this.findPermissionsByPolicyId(policyId);
      policy.permissions = permissions;
      return policy;
    } finally {
      client.release();
    }
  }

  async savePolicy(policy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN'); // Start transaction

      const sql = 'INSERT INTO policies (id, name, description) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await client.query(sql, [policy.id, policy.name, policy.description]);
      const newPolicy = rows[0];

      // Insert associated permissions
      for (const permission of policy.permissions) {
        const permissionSql =
          'INSERT INTO policy_permissions (policy_id, permission_id) VALUES ($1, $2)';
        await client.query(permissionSql, [newPolicy.id, permission.id]);
      }

      await client.query('COMMIT'); // Commit transaction
      return newPolicy;
    } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      throw error;
    } finally {
      client.release();
    }
  }

  async deletePolicy(policyId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM policy_permissions WHERE policy_id = $1', [policyId]);
      await client.query('DELETE FROM policies WHERE id = $1', [policyId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAllPolicies() {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM policies');
      return rows;
    } finally {
      client.release();
    }
  }

  async findPermissionsByPolicyId(policyId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT p.* 
        FROM permissions p 
        JOIN policy_permissions pp ON p.id = pp.permission_id 
        WHERE pp.policy_id = $1`,
        [policyId]
      );
      return rows;
    } finally {
      client.release();
    }
  }
}

module.exports = PermPostgresAdapter;
