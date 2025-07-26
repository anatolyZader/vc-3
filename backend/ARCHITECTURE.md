# Architecture Documentation

## Application Overview

The `eventstorm.me` application is a modern Node.js application that provides a comprehensive set of features for developers and teams. The main functionalities of the application include:

1. **Authentication and Authorization**: Secure user authentication and role-based access control to ensure data privacy and security.
2. **Chat Functionality with AI Integration**: Real-time chat capabilities with the ability to leverage AI-powered language models for enhanced user experience and productivity.
3. **Git Analysis and Wiki Generation**: Integrating with Git repositories to analyze code, generate documentation, and provide a collaborative wiki platform.
4. **API Structure and Documentation**: Exposing a well-structured and documented HTTP API for external integration and consumption.
5. **Real-time Communication**: Leveraging WebSocket technology to enable real-time communication and collaboration features.

The target use cases for this application include:
- Enabling developers to collaborate on projects, discuss technical topics, and share knowledge.
- Providing teams with a centralized platform for managing project-related information, documentation, and communication.
- Empowering users to leverage AI-powered capabilities to enhance their productivity and decision-making processes.

## Architecture Patterns

The `eventstorm.me` application follows a modular and layered architecture, incorporating the following design patterns and principles:

1. **Hexagonal Architecture**: The application is structured around the Hexagonal Architecture (also known as the Ports and Adapters pattern), which separates the core business logic from the technical implementation details. This approach promotes flexibility, testability, and maintainability.

2. **Domain-Driven Design (DDD)**: The application's domain model is the central focus, with a clear separation of concerns between the domain, application, and infrastructure layers. This ensures a strong alignment between the business requirements and the technical implementation.

3. **Modular Structure**: The application is divided into multiple business modules (e.g., chat, git, wiki, AI) and cross-cutting AOP (Aspect-Oriented Programming) modules (e.g., authentication, messaging). This modular structure promotes code reuse, scalability, and independent development and deployment.

## System Structure

### Business Modules vs. AOP Modules

The `eventstorm.me` application is structured with a clear separation between business modules and AOP modules:

1. **Business Modules**: These modules encapsulate the core functionalities of the application, such as chat, git analysis, wiki generation, and AI integration. Each business module follows the Hexagonal Architecture pattern and consists of domain entities, application services, and infrastructure adapters.

2. **AOP Modules**: These modules provide cross-cutting concerns that are shared across multiple business modules, such as authentication, authorization, and messaging. The AOP modules are designed to be loosely coupled and easily integrated with the business modules.

### Layers

The application follows a layered architecture with the following main components:

1. **Domain Layer**: This layer contains the core business entities and domain logic, which are independent of any technical implementation details.

2. **Application Layer**: This layer encapsulates the application-specific use cases and orchestrates the interactions between the domain entities and the infrastructure.

3. **Infrastructure Layer**: This layer provides the technical implementations and adapters for interacting with external systems, such as databases, message brokers, and AI services.

### Ports and Adapters Pattern

The Ports and Adapters pattern (also known as the Hexagonal Architecture) is used throughout the application to decouple the core business logic from the technical implementation details. Each module defines a set of ports (interfaces) that represent the required functionality, and the corresponding adapters implement these ports to provide the actual implementation.

This approach allows the business logic to remain independent of the specific technology choices, making it easier to swap out implementations or add new ones as the application evolves.

## Key Components

### Authentication and Authorization

The authentication and authorization functionality is implemented as an AOP module, ensuring that it can be easily integrated with the various business modules. The module uses the `@fastify/jwt` and `@fastify/oauth2` plugins to handle user authentication and authorization, leveraging a PostgreSQL database for persistent storage.

### Chat Functionality with AI Integration

The chat module provides real-time communication capabilities, allowing users to engage in discussions and share information. The module integrates with an AI service (powered by Langchain) to enable features such as intelligent message summarization, topic analysis, and language translation.

The chat module uses a combination of WebSocket (for real-time communication) and a message broker (e.g., PubSub) for asynchronous communication and event-driven architecture.

### Git Analysis and Wiki Generation

The git module is responsible for integrating with Git repositories, analyzing the code, and generating a collaborative wiki. It uses the GitHub API to fetch repository data and the Langchain AI service to process the information and generate the wiki content.

The wiki module is tightly coupled with the git module, as it relies on the data and events provided by the git module to maintain the wiki content.

### API Structure and Documentation

The API module is responsible for managing the HTTP API functionality of the application. It provides endpoints for fetching and retrieving the OpenAPI specification (Swagger) for a given user and repository. The API module follows a layered architecture, with a clear separation of concerns between the API router, API service, domain entities, and infrastructure adapters.

### Real-time Communication (WebSocket)

The application leverages WebSocket technology to enable real-time communication features, such as the chat functionality. The WebSocket implementation is integrated across multiple modules, allowing for seamless real-time interactions between users.

## Technology Stack

The `eventstorm.me` application is built using the following technology stack:

- **Framework**: Fastify, a fast and low-overhead web framework for Node.js
- **Database**: PostgreSQL for persistent data storage
- **Message Broker**: PubSub for asynchronous communication and event-driven architecture
- **AI Service**: Langchain, a framework for building applications with large language models
- **Authentication**: JWT and OAuth2 for user authentication and authorization
- **Logging**: Pino for structured logging
- **Testing**: Jest for unit and integration testing

## Data Flow

The data flow within the `eventstorm.me` application follows a request-response pattern, with the addition of asynchronous event-driven communication:

1. **HTTP Requests**: Users interact with the application through HTTP requests, which are handled by the API module.
2. **Domain Logic**: The API module delegates the business logic to the appropriate application services, which interact with the domain entities and infrastructure adapters.
3. **Asynchronous Events**: Certain actions, such as fetching the HTTP API or generating the wiki, trigger domain events that are published to the message broker. Other modules subscribe to these events and perform the necessary actions.
4. **External Integrations**: The application integrates with external services, such as Git repositories, AI providers, and databases, through the infrastructure adapters.

## Integration Points

The `eventstorm.me` application integrates with the following external systems:

1. **Git Repositories**: The git module integrates with the GitHub API to fetch and analyze repository data.
2. **AI Services**: The chat, wiki, and AI modules integrate with the Langchain AI service to leverage language models for various functionalities.
3. **Databases**: The application uses a PostgreSQL database for persistent data storage, with adapters for each module.
4. **Message Broker**: The application uses a message broker (e.g., PubSub) for asynchronous communication and event-driven architecture.

## Development Practices

The `eventstorm.me` application follows these development practices:

1. **Module Organization**: The codebase is organized into business modules and AOP modules, promoting modularity, reusability, and independent development.
2. **Dependency Injection**: The application uses the `@fastify/awilix` plugin to manage dependencies and enable loose coupling between components.
3. **Testing Approach**: The application has a comprehensive test suite, including unit tests for individual components and integration tests for the overall system. The testing framework used is Jest.
4. **Continuous Integration and Deployment**: The application is set up with a CI/CD pipeline to automate the build, test, and deployment processes, ensuring consistent and reliable releases.
5. **Documentation**: This comprehensive architecture documentation, along with inline code comments and a well-defined README, provides a clear understanding of the application's structure and functionality.

## Conclusion

The `eventstorm.me` application is designed with a focus on modularity, scalability, and maintainability. By adopting architectural patterns like Hexagonal Architecture and Domain-Driven Design, the application is able to deliver a robust and flexible set of features to its users. The integration of AI capabilities, real-time communication, and comprehensive API documentation further enhances the overall user experience and value proposition of the application.

As the application evolves, this architecture documentation will serve as a valuable reference for developers, architects, and stakeholders, ensuring a shared understanding of the system's structure and guiding future development efforts.