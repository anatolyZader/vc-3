// infrastructure/persistence/permPostgresAdapter.js

const { Pool } = require('pg');
const IPermPersistPort = require('../../domain/ports/IPermPersistPort');

class PermPostgresAdapter extends IPermPersistPort {
  constructor(connectionString) {
    super();
    this.pool = new Pool({
      connectionString: connectionString, 
    });
  }

  async findRoleById(roleId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

  async findResourceById(resourceId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM resources WHERE id = $1', [resourceId]);
      return rows.length ? rows[0] : null;
    } finally {
      client.release();
    }
  }

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

  async savePermission(permission) {
    const client = await this.pool.connect();
    try {
      // Assuming you have a permissions table with columns: role_id, resource_id, actions
      const sql = 'INSERT INTO permissions (role_id, resource_id, actions) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await client.query(sql, [permission.roleId, permission.resourceId, permission.actions]);
      return rows[0];
    } finally {
      client.release();
    }
  }

  async findPolicyById(policyId) {
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM policies WHERE id = $1', [policyId]);
      if (rows.length === 0) {
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

  async findPermissionsByPolicyId(policyId) {
    // Assuming you have a table to link policies and permissions (e.g., policy_permissions)
    const client = await this.pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT p.* FROM permissions p JOIN policy_permissions pp ON p.id = pp.permission_id WHERE pp.policy_id = $1',
        [policyId]
      );
      return rows;
    } finally {
      client.release();
    }
  }


  async savePolicy(policy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN'); // Start transaction

      // Insert the policy
      const sql = 'INSERT INTO policies (id, name, description) VALUES ($1, $2, $3) RETURNING *';
      const { rows } = await client.query(sql, [policy.id, policy.name, policy.description]);
      const newPolicy = rows[0];

      // Insert associated permissions
      for (const permission of policy.permissions) {
        // Assuming you have a table to link policies and permissions (e.g., policy_permissions)
        const permissionSql = 'INSERT INTO policy_permissions (policy_id, permission_id) VALUES ($1, $2)';
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

  async findPolicyForResource(resourceId) {
    const client = await this.pool.connect();
    try {
      // Assuming you have a table to link policies and resources (e.g., policy_resources)
      const { rows } = await client.query(
        `SELECT po.* 
        FROM policies po 
        JOIN policy_resources pr ON po.id = pr.policy_id 
        WHERE pr.resource_id = $1`,
        [resourceId]
      );
      if (rows.length === 0) {
        return null;
      }
      const policy = rows[0];
      // Fetch associated permissions
      const permissions = await this.findPermissionsByPolicyId(policy.id);
      policy.permissions = permissions;
      return policy;
    } finally {
      client.release();
    }
  }
}

module.exports = PermPostgresAdapter;