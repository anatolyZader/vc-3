# Wiki Module

## Overview

The `wiki` module is responsible for managing the core functionality of a wiki-based application. It provides the necessary entities and operations to create, update, and retrieve wiki-related data.

## Architecture

The module is structured around two main entities:

1. **Wiki**: Represents the overall wiki, containing a collection of wiki pages.
2. **WikiPage**: Represents a single page within the wiki, with properties such as title, content, and metadata.

The module utilizes these entities to perform various operations on the wiki data.

## Key Functionalities

The `wiki` module offers the following key functionalities:

1. **Wiki Management**:
   - Creating a new wiki
   - Retrieving an existing wiki
   - Updating the properties of a wiki

2. **WikiPage Management**:
   - Creating a new wiki page
   - Retrieving an existing wiki page
   - Updating the content and metadata of a wiki page
   - Deleting a wiki page

3. **Wiki Navigation**:
   - Retrieving a list of all wiki pages
   - Searching for wiki pages based on specific criteria (e.g., title, content)

4. **Wiki Versioning**:
   - Maintaining a history of changes made to wiki pages
   - Allowing users to view and revert to previous versions of a wiki page

5. **Access Control**:
   - Implementing user-based permissions for viewing, editing, and managing wiki content
   - Enforcing access restrictions based on user roles and privileges

The `wiki` module serves as the core component for managing the wiki-related data and functionality within the application.

# Wiki CLI Documentation

The Wiki CLI provides command-line access to the wiki documentation generation functionality, allowing you to manually trigger the comprehensive documentation generation that normally happens through the web API.

## Overview

The CLI tool generates three types of documentation:

1. **Module Documentation** - Individual `.md` files for each business module (ai.md, chat.md, git.md, etc.)
2. **Root Documentation** - `ROOT_DOCUMENTATION.md` covering backend plugins and core files  
3. **Architecture Documentation** - `ARCHITECTURE.md` with overall system architecture overview

## Usage

### From Backend Root Directory

```bash
# Generate documentation with default settings
npm run wiki:generate

# Generate documentation with specific user ID
npm run wiki:generate -- --user-id admin-123

# Show help
npm run wiki:help

# Or run directly
node wiki-cli.js
node wiki-cli.js --user-id your-user-id
```

### From Wiki Module Directory

```bash
cd backend/business_modules/wiki/input
node wikiCli.js [options]
```

## Command Line Options

- `--user-id <userId>` - Specify a user ID for the operation (default: 'cli-user')
- `--help, -h` - Show help information

## Environment Requirements

The following environment variables must be set:

### Required
- `PINECONE_API_KEY` - For vector storage and similarity search