# Transaction Config Service

A Spring Boot microservice to manage configurations (like ISIN records) using H2 database.

## Technology Stack
- Java 17
- Spring Boot 3.2.5
- Spring Data JPA
- H2 (In-memory database)
- Gradle

## Build & Run Instructions

To compile and build the JAR file:
```bash
# Build the project (if gradle is installed globally)
gradle build

# Or if you generate the Gradle wrapper
./gradlew build
```

To run the application:
```bash
gradle bootRun
```

The application runs on port `8080` by default.

## API Endpoint Reference

### Base URL: `http://localhost:8080/api/v1/config/isins`

| Method | Endpoint | Query Parameters | Description |
|--------|----------|------------------|-------------|
| **GET** | `/` | `search`, `securityType`, `page`, `size`, `sort` | Get all ISINs with pagination, sorting, search, and type filters |
| **GET** | `/{id}` | - | Get detailed information for a specific ISIN record |
| **POST** | `/` | - | Add a new ISIN record |
| **PUT** | `/{id}` | - | Edit fields for an existing ISIN record |
| **DELETE**| `/{id}` | - | Delete an ISIN record |

### Database Console
Access the in-memory H2 database console during execution at:
- **URL:** `http://localhost:8080/h2-console`
- **JDBC URL:** `jdbc:h2:mem:transaction_config_db`
- **User:** `sa`
- **Password:** `password`
