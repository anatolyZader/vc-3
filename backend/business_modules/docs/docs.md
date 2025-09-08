# Docs Module

## Overview

The `docs` module is responsible for managing the core functionality of a docs-based application. It provides the necessary entities and operations to create, update, and retrieve docs-related data.

## Architecture

The module is structured around two main entities:

1. **Docs**: Represents the overall docs, containing a collection of docs pages.
2. **DocsPage**: Represents a single page within the docs, with properties such as title, content, and metadata.

The module utilizes these entities to perform various operations on the docs data.

## Key Functionalities

The `docs` module offers the following key functionalities:

1. **Docs Management**:
   - Creating a new docs
   - Retrieving an existing docs
   - Updating the properties of a docs

2. **DocsPage Management**:
   - Creating a new docs page
   - Retrieving an existing docs page
   - Updating the content and metadata of a docs page
   - Deleting a docs page

3. **Docs Navigation**:
   - Retrieving a list of all docs pages
   - Searching for docs pages based on specific criteria (e.g., title, content)

4. **Docs Versioning**:
   - Maintaining a history of changes made to docs pages
   - Allowing users to view and revert to previous versions of a docs page

5. **Access Control**:
   - Implementing user-based permissions for viewing, editing, and managing docs content
   - Enforcing access restrictions based on user roles and privileges

The `docs` module serves as the core component for managing the docs-related data and functionality within the application.

# Docs CLI Documentation

The Docs CLI provides command-line access to the docs documentation generation functionality, allowing you to manually trigger the comprehensive documentation generation that normally happens through the web API.

## Overview

The CLI tool generates two types of documentation:

1. **Module Documentation** - Individual `.md` files for each business module (ai.md, chat.md, git.md, etc.)
2. **Root Documentation** - `ROOT_DOCUMENTATION.md` covering backend plugins and core files  

**Note**: `ARCHITECTURE.md` is manually maintained and automatically indexed for RAG queries.

## Usage

### From Backend Root Directory

```bash
# Generate documentation with default settings
npm run docs:generate

# Generate documentation with specific user ID
npm run docs:generate -- --user-id admin-123

# Show help
npm run docs:help

# Or run directly
node docs-cli.js
node docs-cli.js --user-id your-user-id
```

### From Docs Module Directory

```bash
cd backend/business_modules/docs/input
node docsCli.js [options]
```

## Command Line Options

- `--user-id <userId>` - Specify a user ID for the operation (default: 'cli-user')
- `--help, -h` - Show help information

## Environment Requirements

The following environment variables must be set:

### Required
- `PINECONE_API_KEY` - For vector storage and similarity search