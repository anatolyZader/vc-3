# Architecture Documentation

## Application Overview

The `eventstorm.me` application is a modern Node.js application that provides a comprehensive set of features for developers and teams. The main functionalities of the application include:

2. **Chat Functionality with AI Integration**: Real-time chat capabilities with AI-powered features, such as natural language processing and generation.
3. **Git Analysis and Wiki Generation**: Automated analysis of Git repositories and generation of project wikis.
4. **API Structure and Documentation**: Robust HTTP API with comprehensive OpenAPI (Swagger) documentation.
5. **Real-time Communication**: Leveraging WebSocket technology for real-time data updates and notifications.

The application is designed to serve a wide range of users, from individual developers to teams and organizations, providing them with a centralized platform for collaboration, knowledge sharing, and project management.

## Architecture Patterns

The `eventstorm.me` application follows a modular and layered architecture, incorporating the following design patterns and principles:

1. **Hexagonal Architecture**: The application is structured around the Hexagonal Architecture (also known as the Ports and Adapters pattern), which separates the core business logic from the technical implementation details. This approach promotes flexibility, testability, and maintainability.

2. **Domain-Driven Design (DDD)**: The application's domain model is the central focus, with a clear separation of concerns between the domain, application, and infrastructure layers. This ensures a strong alignment between the business requirements and the technical implementation.

3. **Modular Structure**: The application is divided into multiple modules, each responsible for a specific set of functionalities. This modular approach allows for better scalability, maintainability, and the ability to evolve the system independently.

## System Structure

The `eventstorm.me` application follows a layered architecture, with the following key components:

1. **Business Modules**: These modules encapsulate the core business logic of the application, such as chat, git analysis, wiki generation, and AI integration. Each business module follows the Hexagonal Architecture pattern, with a clear separation of concerns between the domain, application, and infrastructure layers.

2. **AOP (Aspect-Oriented Programming) Modules**: These modules handle cross-cutting concerns, such as authentication and authorization, which are applied across multiple business modules. The AOP modules follow the Ports and Adapters pattern, allowing for the easy integration of different authentication and authorization mechanisms.

3. **Domain Layer**: This layer contains the core domain entities and the business logic that drives the application. It is independent of any technical implementation details and focuses on the problem domain.

4. **Application Layer**: This layer bridges the gap between the domain layer and the infrastructure layer. It orchestrates the interactions between the domain entities and the external services or adapters.

5. **Infrastructure Layer**: This layer handles the technical implementation details, such as database interactions, external API integrations, and messaging systems. It provides the necessary adapters and ports for the application layer to interact with these external dependencies.

The Ports and Adapters pattern is used throughout the system, where the application layer defines the necessary ports (interfaces) and the infrastructure layer provides the corresponding adapters to implement these ports.

## Key Components

1. **Authentication and Authorization**:
   - The authentication and authorization functionality is implemented as an AOP module, following the Ports and Adapters pattern.
   - The module provides secure user authentication and role-based access control, ensuring that only authorized users can access specific features and data.
   - The module integrates with various authentication providers, such as OAuth2, to support a wide range of authentication mechanisms.

2. **Chat Functionality with AI Integration**:
   - The chat module is a business module that provides real-time chat capabilities, including features like message history, user presence, and typing indicators.
   - The module integrates with an AI adapter, which leverages natural language processing and generation to provide intelligent responses, language translation, and other AI-powered features.
   - The chat module uses a messaging adapter to handle the real-time communication, ensuring scalable and reliable message delivery.

3. **Git Analysis and Wiki Generation**:
   - The git analysis and wiki generation modules are business modules that work together to provide automated analysis of Git repositories and generate project wikis.
   - The git analysis module fetches and processes the repository data, while the wiki generation module uses the analyzed data to create comprehensive project documentation.
   - These modules integrate with external Git providers (e.g., GitHub) and utilize AI-powered techniques for content generation and summarization.

4. **API Structure and Documentation**:
   - The API module is responsible for managing the HTTP API functionality of the application, including endpoints for fetching and retrieving the OpenAPI specification (Swagger).
   - The module follows a layered architecture, with a clear separation of concerns between the API router, API service, domain entities, and adapters.
   - The API module publishes a `HttpApiFetchedEvent` domain event to notify other parts of the system when the API is updated, enabling features like real-time API documentation updates.

5. **Real-time Communication (WebSocket)**:
   - The application utilizes WebSocket technology for real-time communication, enabling features like live chat, real-time updates, and notifications.
   - The WebSocket functionality is integrated across various modules, such as the chat and messaging modules, to provide a seamless real-time experience for users.
   - The WebSocket implementation follows the Ports and Adapters pattern, allowing for the easy integration of different WebSocket providers or protocols.

## Technology Stack

The `eventstorm.me` application is built using the following technology stack:

- **Framework**: Fastify, a high-performance Node.js web framework
- **Database**: PostgreSQL, a powerful and scalable relational database
- **Messaging**: PubSub (e.g., Google Cloud Pub/Sub, RabbitMQ), for reliable and scalable message delivery
- **AI Integration**: Langchain, a framework for building applications with large language models
- **Authentication**: OAuth2, a widely adopted authentication and authorization protocol
- **API Documentation**: OpenAPI (Swagger), a standard for describing RESTful APIs

## Data Flow

The data flow within the `eventstorm.me` application follows the Hexagonal Architecture pattern, where the core business logic is isolated from the technical implementation details:

1. The client (e.g., a web application or a mobile app) sends a request to the API module.
2. The API module's router handles the incoming request and delegates the processing to the appropriate API service.
3. The API service interacts with the domain entities and the necessary ports (interfaces) to fulfill the request.
4. The infrastructure layer, through the appropriate adapters, handles the interactions with external services, databases, and messaging systems.
5. The response is then returned to the client, following the same flow in reverse.

This layered approach ensures a clear separation of concerns, making the application more maintainable, testable, and adaptable to changes in requirements or technology.

## Integration Points

The `eventstorm.me` application integrates with the following external services and systems:

1. **Authentication Providers**: The application integrates with various authentication providers, such as OAuth2, to support a wide range of authentication mechanisms.
2. **AI Services**: The application utilizes AI-powered services, such as Anthropic's language models, for features like natural language processing, generation, and content summarization.
3. **Databases**: The application uses PostgreSQL as the primary database for storing user data, chat history, Git repository metadata, and other application-specific data.
4. **Messaging Systems**: The application integrates with PubSub-based messaging systems, such as Google Cloud Pub/Sub or RabbitMQ, to enable reliable and scalable real-time communication and event-driven architecture.
5. **Git Providers**: The application integrates with Git providers, such as GitHub, to fetch and analyze repository data for the wiki generation and other Git-related features.

## Development Practices

The `eventstorm.me` application follows these development practices:

1. **Module Organization**: The application is organized into multiple modules, each responsible for a specific set of functionalities. This modular structure promotes code reuse, maintainability, and the ability to evolve the system independently.

2. **Dependency Injection**: The application utilizes a dependency injection framework, such as Awilix, to manage the dependencies between the various components. This approach ensures loose coupling, testability, and the ability to easily swap out implementations.

3. **Testing Approach**: The application has a comprehensive test suite, including unit tests, integration tests, and end-to-end tests. This testing strategy helps ensure the reliability and correctness of the application, as well as facilitating refactoring and future development.

4. **Continuous Integration and Deployment**: The application is integrated with a continuous integration (CI) and continuous deployment (CD) pipeline, which automatically builds, tests, and deploys the application to the production environment. This ensures a reliable and streamlined development and deployment process.

5. **Documentation**: In addition to this comprehensive architecture documentation, the application also includes detailed documentation for the API, the