# Code Processing Pipeline Report

**File:** `./test_user_service.js`
**Extension:** `.js`
**Processed:** 2025-10-11T12:35:19.644Z

## 📊 Processing Statistics

| Stage | Size (chars) | Change |
|-------|--------------|--------|
| Original | 2,287 | - |
| After Preprocessing | 1,995 | -12.8% |
| After Enhancement | 1,995 | 0.0% |
| **Total Chunks Generated** | **4** | **Final** |

## 🧩 Chunk Analysis

- **Total Chunks:** 4
- **Average Size:** 457 characters
- **Size Range:** 189 - 1,007 characters

### Chunk Breakdown

| Chunk | Size (chars) | Type | Functions | Classes | Complexity |
|-------|--------------|------|-----------|---------|------------|
| 1 | 201 | function | 1, validateUser, if | none | 4 |
| 2 | 189 | function | 2, formatUserName, if | none | 2 |
| 3 | 1,007 | class | constructor, fetchUser, catch | UserService | 4 |
| 4 | 431 | class | promises, constructor, loadUsers | UserManager | 0 |

## 🔄 Pipeline Processing Steps

### Step 0: Original Content

```js
// Test file with multiple functions and classes to ensure chunking
"use strict";

/**
 * User management utilities
 */

// Simple function 1
function validateUser(user) {
  if (!user) {
    throw new Error('User is required');
  }
  
  if (!user.email) {
    throw new Error('Email is required');
  }
  
  return true;
}

// Simple function 2  
function formatUserName(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  return user.email || 'Unknown User';
}

// Class definition
class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = new Map();
  }
  
  async fetchUser(userId) {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }
    
    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}`);
      const userData = await response.json();
      
      // Cache the result
      this.cache.set(userId, userData);
      
      return userData;
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      throw error;
    }
  }
  
  async createUser(userData) {
    validateUser(userData);
    
    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      const newUser = await response.json();
      
      // Add to cache
      this.cache.set(newUser.id, newUser);
      
      return newUser;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }
  
  clearCache() {
    this.cache.clear();
  }
}

// Another class
class UserManager {
  constructor(userService) {
    this.userService = userService;
    this.users = [];
  }
  
  async loadUsers(userIds) {
    const promises = userIds.map(id => this.userService.fetchUser(id));
    this.users = await Promise.all(promises);
    return this.users;
  }
  
  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }
  
  getUserCount() {
    return this.users.length;
  }
}

// Export functions and classes
module.exports = {
  validateUser,
  formatUserName,
  UserService,
  UserManager
};
```

### Step 1: Code Preprocessing Result

**Changes Applied:**
- ✅ Remove import statements for cleaner chunking
- ✅ Preserve documentation comments
- ✅ Remove log statements (preserve errors)
- ✅ Normalize whitespace

```js
"use strict";

/**
 User management utilities
 */

// Simple function 1
function validateUser(user) {
  if (!user) {
    throw new Error('User is required');
  }

  if (!user.email) {
    throw new Error('Email is required');
  }

  return true;
}

// Simple function 2
function formatUserName(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.email || 'Unknown User';
}

// Class definition
class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = new Map();
  }

  async fetchUser(userId) {
// Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}`);
      const userData = await response.json();

// Cache the result
      this.cache.set(userId, userData);

      return userData;
    } catch (error) {

      throw error;
    }
  }

  async createUser(userData) {
    validateUser(userData);

    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const newUser = await response.json();

      this.cache.set(newUser.id, newUser);

      return newUser;
    } catch (error) {

      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

class UserManager {
  constructor(userService) {
    this.userService = userService;
    this.users = [];
  }

  async loadUsers(userIds) {
    const promises = userIds.map(id => this.userService.fetchUser(id));
    this.users = await Promise.all(promises);
    return this.users;
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  getUserCount() {
    return this.users.length;
  }
}

// Export functions and classes
module.exports = {
  validateUser,
  formatUserName,
  UserService,
  UserManager
};
```

### Step 2: Ubiquitous Language Enhancement Result

**Domain Context Added:**
- 📚 Business domain terminology enrichment
- 🏗️ Architectural pattern context
- 🔧 Technical implementation context
- 📋 Metadata enhancement for better retrieval

```js
"use strict";

/**
 User management utilities
 */

// Simple function 1
function validateUser(user) {
  if (!user) {
    throw new Error('User is required');
  }

  if (!user.email) {
    throw new Error('Email is required');
  }

  return true;
}

// Simple function 2
function formatUserName(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.email || 'Unknown User';
}

// Class definition
class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = new Map();
  }

  async fetchUser(userId) {
// Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}`);
      const userData = await response.json();

// Cache the result
      this.cache.set(userId, userData);

      return userData;
    } catch (error) {

      throw error;
    }
  }

  async createUser(userData) {
    validateUser(userData);

    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const newUser = await response.json();

      this.cache.set(newUser.id, newUser);

      return newUser;
    } catch (error) {

      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

class UserManager {
  constructor(userService) {
    this.userService = userService;
    this.users = [];
  }

  async loadUsers(userIds) {
    const promises = userIds.map(id => this.userService.fetchUser(id));
    this.users = await Promise.all(promises);
    return this.users;
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  getUserCount() {
    return this.users.length;
  }
}

// Export functions and classes
module.exports = {
  validateUser,
  formatUserName,
  UserService,
  UserManager
};
```

### Step 3: AST Code Splitting Results

#### Chunk 1

**Metadata:**
- **Type:** function
- **Size:** 201 characters
- **Functions:** 1, validateUser, if
- **Classes:** none
- **Complexity Score:** 4
- **Has Imports:** No
- **Enhanced with Imports:** No
- **AST Node Type:** FunctionDeclaration

**Content:**

```js
 */

// Simple function 1
function validateUser(user) {
  if (!user) {
    throw new Error('User is required');
  }

  if (!user.email) {
    throw new Error('Email is required');
  }

  return true;
}
```

#### Chunk 2

**Metadata:**
- **Type:** function
- **Size:** 189 characters
- **Functions:** 2, formatUserName, if
- **Classes:** none
- **Complexity Score:** 2
- **Has Imports:** No
- **Enhanced with Imports:** No
- **AST Node Type:** FunctionDeclaration

**Content:**

```js

// Simple function 2
function formatUserName(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.email || 'Unknown User';
}
```

#### Chunk 3

**Metadata:**
- **Type:** class
- **Size:** 1007 characters
- **Functions:** constructor, fetchUser, catch, createUser, clearCache
- **Classes:** UserService
- **Complexity Score:** 4
- **Has Imports:** No
- **Enhanced with Imports:** No
- **AST Node Type:** ClassDeclaration

**Content:**

```js

// Class definition
class UserService {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.cache = new Map();
  }

  async fetchUser(userId) {
// Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId);
    }

    try {
      const response = await fetch(`${this.apiUrl}/users/${userId}`);
      const userData = await response.json();

// Cache the result
      this.cache.set(userId, userData);

      return userData;
    } catch (error) {

      throw error;
    }
  }

  async createUser(userData) {
    validateUser(userData);

    try {
      const response = await fetch(`${this.apiUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      const newUser = await response.json();

      this.cache.set(newUser.id, newUser);

      return newUser;
    } catch (error) {

      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}
```

#### Chunk 4

**Metadata:**
- **Type:** class
- **Size:** 431 characters
- **Functions:** promises, constructor, loadUsers, findUserByEmail, getUserCount
- **Classes:** UserManager
- **Complexity Score:** 0
- **Has Imports:** No
- **Enhanced with Imports:** No
- **AST Node Type:** ClassDeclaration

**Content:**

```js

class UserManager {
  constructor(userService) {
    this.userService = userService;
    this.users = [];
  }

  async loadUsers(userIds) {
    const promises = userIds.map(id => this.userService.fetchUser(id));
    this.users = await Promise.all(promises);
    return this.users;
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  getUserCount() {
    return this.users.length;
  }
}
```

## 📋 Summary

The code processing pipeline successfully processed `./test_user_service.js` through three stages:

1. **Code Preprocessing**: Cleaned and normalized the code, removing noise like imports and log statements
2. **Ubiquitous Language Enhancement**: Added domain-specific context and metadata for better semantic understanding
3. **AST Code Splitting**: Intelligently split the code into 4 semantic chunks using AST analysis

The resulting chunks are optimized for RAG (Retrieval-Augmented Generation) applications, with semantic coherence and appropriate size for embedding models.

---
*Report generated on 2025-10-11T12:35:19.666Z*