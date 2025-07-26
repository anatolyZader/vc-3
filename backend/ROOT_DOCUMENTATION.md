# Backend Application - Root Files & Plugins Documentation

## Overview
The backend application for EventStorm.me is built using the Fastify web framework. The application's core files and plugins work together to provide a modular and extensible architecture. The main entry point is `app.js`, which initializes the Fastify server and registers various plugins. These plugins handle different aspects of the application, such as logging, environment configuration, dependency injection, and more. The `server.js` file is responsible for starting the Fastify server, while `fastify.config.js` contains the server's configuration options.

## Core Application Files

### app.js
**Description**: Main application entry point

`app.js` is the main file that initializes the Fastify application and registers various plugins. It sets up the application's core functionality, including:

- Importing and registering necessary dependencies and plugins
- Configuring the Fastify server with security-related headers using the `@fastify/helmet` plugin
- Registering the CORS plugin to handle cross-origin requests
- Setting up the Swagger documentation for the API using the `@fastify/swagger` plugin
- Registering various custom plugins, such as logging, environment configuration, dependency injection, WebSocket, event dispatcher, and pub/sub functionality

The file also includes some commented-out code related to authentication schemas and a "bad schemas detector" plugin, which can be uncommented if needed.

### server.js
**Description**: Fastify server configuration and startup

The `server.js` file is responsible for starting the Fastify server. It simply exports the `appModule` from the `app.js` file, which allows the Fastify server to be started and configured.

### fastify.config.js
**Description**: Fastify server configuration

The `fastify.config.js` file contains the configuration options for the Fastify server, such as the port, host, and other options. This file is automatically loaded by the Fastify CLI when the application is started.

## Plugins Architecture

### Plugin System Overview
The EventStorm.me backend application utilizes a plugin-based architecture, where various functionalities are encapsulated in separate plugin modules. This allows for a modular and extensible design, making it easier to maintain, test, and scale the application.

The application uses the `fastify-plugin` module to register and manage these plugins. Each plugin is responsible for a specific aspect of the application, such as logging, environment configuration, dependency injection, and more.

### Individual Plugins

#### corsPlugin.js
**Purpose**: Configures the CORS (Cross-Origin Resource Sharing) settings for the application.
**Key Features**:
- Registers the `@fastify/cors` plugin with Fastify.
- Allows cross-origin requests from specific origins, including local development servers and the production domain.
- Enables the `credentials` option to allow sending and receiving cookies across origins.

**Configuration**:
- The allowed origin URLs are defined in the `origin` option.

**Integration**:
- The `corsPlugin` is registered in the `app.js` file, ensuring that all routes in the application are subject to the CORS configuration.

#### diPlugin.js
**Purpose**: Handles the dependency injection (DI) setup for the application.
**Key Features**:
- Registers the `@fastify/awilix` plugin, which provides a DI container for the application.
- Configures the DI container to use the `PROXY` injection mode, allowing for easier property injection and circular dependency support.
- Registers various application-specific dependencies, such as services, adapters, and infrastructure-level components.

**Configuration**:
- The DI container is configured to dispose of resources when the Fastify server is closed or when a response is sent.
- The `infraConfig.json` file is used to define the structure of the application's modules and their dependencies.

**Integration**:
- The `diPlugin` is registered in the `app.js` file, ensuring that the DI container is available throughout the application.

#### envPlugin.js
**Purpose**: Handles the loading and validation of environment variables for the application.
**Key Features**:
- Registers the `@fastify/env` plugin, which allows for the validation of environment variables against a defined schema.
- Loads the environment variables from the `.env` file and attaches them to the Fastify instance under the `secrets` property.

**Configuration**:
- The environment variable schema is defined in a separate file and loaded using the `fastify.getSchema('schema:dotenv')` method.

**Integration**:
- The `envPlugin` is registered in the `app.js` file, ensuring that the environment variables are available throughout the application.

#### errorPlugin.js
**Purpose**: Provides a custom error handling mechanism for the application.
**Key Features**:
- Registers a custom error handler function that sets the appropriate HTTP status code based on the error.
- Logs errors with the correct log level (error for 500+ status codes, warn for 400-499 status codes).
- Sends a standardized error response to the client.

**Configuration**:
- No specific configuration is required for this plugin.

**Integration**:
- The `errorPlugin` is registered in the `app.js` file, ensuring that all errors in the application are handled by the custom error handler.

## Application Lifecycle
The application's lifecycle can be summarized as follows:

1. The `server.js` file is executed, which imports and exports the `appModule` from the `app.js` file.
2. The `app.js` file is executed, which initializes the Fastify application and registers various plugins.
3. The plugins are loaded and configured, setting up the application's core functionality, such as logging, environment variables, dependency injection, and more.
4. The Fastify server is started, and the application begins handling incoming requests.
5. During runtime, the registered plugins and their dependencies are utilized to process requests, handle errors, and manage the application's overall functionality.

## Development Notes
- Ensure that all necessary environment variables are defined in the `.env` file, and that the schema for these variables is correctly defined in the `envPlugin.js` file.
- When adding new plugins or modifying existing ones, make sure to update the documentation accordingly to maintain a clear understanding of the application's architecture.
- Follow the existing plugin structure and conventions when developing new plugins to maintain consistency and ease of maintenance.
- Consider the application's lifecycle and how new plugins or changes might impact the startup and runtime behavior of the system.