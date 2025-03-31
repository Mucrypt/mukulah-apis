### [README.md](file:///c%3A/Users/romeo/OneDrive/Desktop/mukulah-shop/README.md)

Create a `README.md` file to document the project and provide instructions for testing all routes.

````markdown
# Mukulah Shop Backend

This is the backend for the Mukulah Shop e-commerce platform. It provides APIs for managing products, attributes, categories, collections, users, and more.

## Table of Contents
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Routes](#available-routes)
  - [User Routes](#user-routes)
  - [Product Routes](#product-routes)
  - [Attribute Routes](#attribute-routes)
  - [Other Routes](#other-routes)
- [Testing with Postman](#testing-with-postman)

---

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Postman (for API testing)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/mukulah-shop.git
   cd mukulah-shop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - Create a MySQL database.
   - Run the SQL migrations to set up the schema.

4. Configure environment variables:
   - Create a `.env` file in the root directory.
   - Add the following variables:
     ```
     PORT=3000
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=yourpassword
     DB_NAME=mukulah_shop
     JWT_SECRET=your_jwt_secret
     ```

5. Start the server:
   ```bash
   npm start
   ```

---

## Environment Variables

| Variable       | Description                     | Default Value |
|-----------------|---------------------------------|---------------|
| `PORT`         | Port for the server             | `3000`        |
| `DB_HOST`      | Database host                   | `localhost`   |
| `DB_USER`      | Database username               | `root`        |
| `DB_PASSWORD`  | Database password               | `password`    |
| `DB_NAME`      | Database name                   | `mukulah_shop`|
| `JWT_SECRET`   | Secret for JWT authentication   | `secret`      |

---

## Available Routes

### User Routes
| Method | Endpoint           | Description                  | Authentication |
|--------|---------------------|------------------------------|----------------|
| `POST` | `/api/users/login` | Login a user                 | No             |
| `POST` | `/api/users/signup`| Register a new user          | No             |
| `GET`  | `/api/users/me`    | Get current user profile     | Yes            |

---

### Product Routes
| Method   | Endpoint                     | Description                        | Authentication |
|----------|-------------------------------|------------------------------------|----------------|
| `GET`    | `/api/products`              | Get all products                   | No             |
| `GET`    | `/api/products/:id`          | Get a single product               | No             |
| `POST`   | `/api/products`              | Create a new product               | Admin          |
| `PATCH`  | `/api/products/:id`          | Update a product                   | Admin          |
| `DELETE` | `/api/products/:id`          | Delete a product                   | Admin          |
| `GET`    | `/api/products/:id/related`  | Get related products               | No             |
| `GET`    | `/api/products/:id/cross-sell`| Get cross-sell products            | No             |
| `GET`    | `/api/products/:id/up-sell`  | Get up-sell products               | No             |
| `PATCH`  | `/api/products/:id/views`    | Increment product views            | No             |

---

### Attribute Routes
| Method   | Endpoint                     | Description                        | Authentication |
|----------|-------------------------------|------------------------------------|----------------|
| `GET`    | `/api/attributes`            | Get all attributes                 | No             |
| `GET`    | `/api/attributes/:id`        | Get a single attribute             | No             |
| `POST`   | `/api/attributes`            | Create a new attribute             | Admin          |
| `PATCH`  | `/api/attributes/:id`        | Update an attribute                | Admin          |
| `DELETE` | `/api/attributes/:id`        | Delete an attribute                | Admin          |
| `GET`    | `/api/attributes/:id/values` | Get attribute values               | No             |
| `POST`   | `/api/attributes/:id/values` | Add a new attribute value          | Admin          |

---

### Other Routes
| Method   | Endpoint                     | Description                        | Authentication |
|----------|-------------------------------|------------------------------------|----------------|
| `GET`    | `/api/brands`                | Get all brands                     | No             |
| `GET`    | `/api/categories`            | Get all categories                 | No             |
| `GET`    | `/api/collections`           | Get all collections                | No             |
| `GET`    | `/api/reviews`               | Get all reviews                    | No             |

---

## Testing with Postman

### 1. Import Postman Collection
- Create a new collection in Postman.
- Add requests for all the routes listed above.

### 2. Test Public Routes
- Test routes that do not require authentication, such as:
  - `GET /api/products`
  - `GET /api/attributes`

### 3. Test Protected Routes
- Obtain a JWT token by logging in via `POST /api/users/login`.
- Add the token to the `Authorization` header as `Bearer <your_token>` for protected routes.

### 4. Test Admin Routes
- Use an admin account to log in and obtain a token.
- Test routes like:
  - `POST /api/products`
  - `PATCH /api/attributes/:id`

### Example Request
#### Create a Product
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/products`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "Test Product",
    "slug": "test-product",
    "description": "This is a test product.",
    "price": 100.0,
    "sku": "TEST123",
    "categories": [1, 2],
    "collections": [1],
    "attributes": [
      {
        "attributeId": 1,
        "values": [1, 2]
      }
    ]
  }
  ```

---

## Debugging
- Use Postman's console (`View > Show Postman Console`) to debug requests and responses.
- Check server logs for errors.

---

## License
This project is licensed under the MIT License.
````

This `README.md` file provides clear instructions for setting up the project, testing routes, and debugging issues. Let me know if you need further assistance!