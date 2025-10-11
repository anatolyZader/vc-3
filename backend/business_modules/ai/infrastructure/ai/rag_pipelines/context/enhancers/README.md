# EventStorm.me Knowledge Catalogs

This directory contains the refactored knowledge management system for the EventStorm.me platform, split from the original monolithic `ubiqLangDict.json` into focused, maintainable catalogs.

## 📚 Catalog Files

### 1. `ubiq-language.json` - Ubiquitous Language Dictionary
**Focus**: Pure business terminology and domain concepts
- Business modules and bounded contexts
- Domain entities, value objects, and aggregates
- Domain events and business behaviors
- Business terminology and glossary
- **Free from**: Technical implementation details

### 2. `arch-catalog.json` - Architecture Catalog  
**Focus**: Architectural patterns and design principles
- Design patterns (DDD, Hexagonal Architecture, CQRS)
- Architectural layers (domain, application, infrastructure)
- Ports and adapters definitions
- SOLID principles and modularity concepts
- **Free from**: Infrastructure specifics

### 3. `infra-catalog.json` - Infrastructure Catalog
**Focus**: Technical infrastructure and dependencies
- Google Cloud Platform services configuration
- Database systems (PostgreSQL, Redis, Pinecone)
- External APIs and integrations
- Security, monitoring, and deployment
- **Free from**: Business logic concepts

### 4. `workflows.json` - Workflows Catalog
**Focus**: Business processes and integration patterns
- High-level business workflows (chat, repository analysis)
- Cross-cutting workflows (authentication, error handling)
- Integration patterns (event-driven, request-response)
- System behavior documentation
- **Free from**: Technical implementation details

## 🎯 Benefits of Separation

1. **Reduced PR Noise**: Infrastructure changes don't affect domain language
2. **Clear Ownership**: Different teams can maintain their respective catalogs
3. **Better Searchability**: Developers find relevant information faster
4. **Modular Evolution**: Each catalog evolves based on different change drivers
5. **Focused Maintenance**: Updates are scoped to specific concerns

## 🔧 Usage

The `UbiquitousLanguageEnhancer` class automatically loads all catalogs and provides:

```javascript
const enhancer = new UbiquitousLanguageEnhancer();

// Legacy compatibility
const dict = await enhancer.getDictionary();

// New catalog access
const catalogs = await enhancer.getCatalogs();
const archCatalog = await enhancer.getArchitectureCatalog();
const infraCatalog = await enhancer.getInfrastructureCatalog();
const workflowsCatalog = await enhancer.getWorkflowsCatalog();
```

## 🔄 Migration Notes

- **Legacy method `getDictionary()`** still works for backward compatibility
- **New method `getCatalogs()`** provides access to all four catalogs
- **Graceful fallbacks** when individual catalog files are missing
- **Automatic normalization** for consistent data access patterns

## 📋 Maintenance

Each catalog should be updated by the appropriate domain experts:
- **Domain experts**: `ubiq-language.json`
- **Architecture team**: `arch-catalog.json` 
- **DevOps/Platform team**: `infra-catalog.json`
- **Business analysts**: `workflows.json`