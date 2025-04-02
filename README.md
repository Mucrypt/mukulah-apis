### [README.md](file:///c%3A/Users/romeo/OneDrive/Desktop/mukulah-shop/README.md)

Create a `README.md` file to document the project and provide instructions for testing all routes.

````markdown
# Mukulah Shop Backend

This is the backend for the Mukulah Shop e-commerce platform. It provides APIs for managing products, attributes, categories, collections, users, tags, and more.

## Table of Contents

- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Routes](#available-routes)
  - [User Routes](#user-routes)
  - [Product Routes](#product-routes)
  - [Attribute Routes](#attribute-routes)
  - [Other Routes](#other-routes)
  - [Product Variation Routes](#product-variation-routes)
  - [Tag Routes](#tag-routes)
  - [Collection Routes](#collection-routes)
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

| Variable      | Description                   | Default Value  |
| ------------- | ----------------------------- | -------------- |
| `PORT`        | Port for the server           | `3000`         |
| `DB_HOST`     | Database host                 | `localhost`    |
| `DB_USER`     | Database username             | `root`         |
| `DB_PASSWORD` | Database password             | `password`     |
| `DB_NAME`     | Database name                 | `mukulah_shop` |
| `JWT_SECRET`  | Secret for JWT authentication | `secret`       |

---

## Available Routes

### User Routes

| Method | Endpoint            | Description              | Authentication |
| ------ | ------------------- | ------------------------ | -------------- |
| `POST` | `/api/users/login`  | Login a user             | No             |
| `POST` | `/api/users/signup` | Register a new user      | No             |
| `GET`  | `/api/users/me`     | Get current user profile | Yes            |

---

### Product Routes

| Method   | Endpoint                       | Description             | Authentication |
| -------- | ------------------------------ | ----------------------- | -------------- |
| `GET`    | `/api/products`                | Get all products        | No             |
| `GET`    | `/api/products/:id`            | Get a single product    | No             |
| `POST`   | `/api/products`                | Create a new product    | Admin          |
| `PATCH`  | `/api/products/:id`            | Update a product        | Admin          |
| `DELETE` | `/api/products/:id`            | Delete a product        | Admin          |
| `GET`    | `/api/products/:id/related`    | Get related products    | No             |
| `GET`    | `/api/products/:id/cross-sell` | Get cross-sell products | No             |
| `GET`    | `/api/products/:id/up-sell`    | Get up-sell products    | No             |
| `PATCH`  | `/api/products/:id/views`      | Increment product views | No             |

---

### Attribute Routes

| Method   | Endpoint                     | Description               | Authentication |
| -------- | ---------------------------- | ------------------------- | -------------- |
| `GET`    | `/api/attributes`            | Get all attributes        | No             |
| `GET`    | `/api/attributes/:id`        | Get a single attribute    | No             |
| `POST`   | `/api/attributes`            | Create a new attribute    | Admin          |
| `PATCH`  | `/api/attributes/:id`        | Update an attribute       | Admin          |
| `DELETE` | `/api/attributes/:id`        | Delete an attribute       | Admin          |
| `GET`    | `/api/attributes/:id/values` | Get attribute values      | No             |
| `POST`   | `/api/attributes/:id/values` | Add a new attribute value | Admin          |

---

### Other Routes

| Method | Endpoint           | Description         | Authentication |
| ------ | ------------------ | ------------------- | -------------- |
| `GET`  | `/api/brands`      | Get all brands      | No             |
| `GET`  | `/api/categories`  | Get all categories  | No             |
| `GET`  | `/api/collections` | Get all collections | No             |
| `GET`  | `/api/reviews`     | Get all reviews     | No             |

---

## Product Variation Routes

| Method   | Endpoint                                              | Description                                       | Authentication |
| -------- | ----------------------------------------------------- | ------------------------------------------------- | -------------- |
| `POST`   | `/api/product-variations/:productId`                  | Create a new product variation                    | Admin          |
| `GET`    | `/api/product-variations/:productId`                  | Get all variations for a product                  | No             |
| `GET`    | `/api/product-variations/:productId/details`          | Get all variations with attributes for a product  | No             |
| `GET`    | `/api/product-variations/:variationId`                | Get details of a single variation                 | No             |
| `PATCH`  | `/api/product-variations/:variationId`                | Update a specific variation                       | Admin          |
| `PATCH`  | `/api/product-variations/:variationId/stock`          | Update stock quantity for a variation             | Admin          |
| `PATCH`  | `/api/product-variations/:variationId/default`        | Set a variation as default                        | Admin          |
| `DELETE` | `/api/product-variations/:variationId`                | Delete a specific variation                       | Admin          |
| `PATCH`  | `/api/product-variations/bulk-stock`                  | Bulk update stock quantities for variations       | Admin          |
| `POST`   | `/api/product-variations/:productId/bulk`             | Bulk create variations for a product              | Admin          |
| `POST`   | `/api/product-variations/:productId/generate-skus`    | Generate SKUs based on product attributes         | Admin          |
| `GET`    | `/api/product-variations/:productId/combinations`     | Generate all attribute combinations for a product | No             |
| `PATCH`  | `/api/product-variations/:variationId/image`          | Add an image to a variation                       | Admin          |
| `DELETE` | `/api/product-variations/:variationId/image/:imageId` | Remove an image from a variation                  | Admin          |
| `PATCH`  | `/api/product-variations/:variationId/status`         | Update the status of a variation                  | Admin          |

---

### Tag Routes

| Method   | Endpoint                              | Description                        | Authentication |
| -------- | ------------------------------------- | ---------------------------------- | -------------- |
| `GET`    | `/api/tags`                           | Get all tags                       | No             |
| `GET`    | `/api/tags/:id`                       | Get a tag by ID or slug            | No             |
| `GET`    | `/api/tags/:id/products`              | Get products associated with a tag | No             |
| `POST`   | `/api/tags`                           | Create a new tag                   | Admin          |
| `POST`   | `/api/tags/:tagId/product/:productId` | Add a tag to a product             | Admin          |
| `DELETE` | `/api/tags/:tagId/product/:productId` | Remove a tag from a product        | Admin          |
| `PATCH`  | `/api/tags/:id`                       | Update a tag                       | Admin          |
| `DELETE` | `/api/tags/:id`                       | Delete a tag                       | Admin          |

---

### Collection Routes

| Method   | Endpoint                                  | Description                              | Authentication |
| -------- | ----------------------------------------- | ---------------------------------------- | -------------- |
| `GET`    | `/api/collections`                        | Get all collections                      | No             |
| `GET`    | `/api/collections/category/:categoryId`   | Get collections by category              | No             |
| `GET`    | `/api/collections/:id`                    | Get a single collection                  | No             |
| `GET`    | `/api/collections/:id/products`           | Get products in a collection             | No             |
| `POST`   | `/api/collections`                        | Create a new collection                  | Admin          |
| `POST`   | `/api/collections/bulk`                   | Bulk create collections                  | Admin          |
| `PATCH`  | `/api/collections/:id`                    | Update a collection                      | Admin          |
| `PATCH`  | `/api/collections/bulk`                   | Bulk update collections                  | Admin          |
| `DELETE` | `/api/collections/:id`                    | Delete a collection                      | Admin          |
| `PATCH`  | `/api/collections/:id/feature`            | Toggle featured status of a collection   | Admin          |
| `PATCH`  | `/api/collections/:id/status`             | Update collection status                 | Admin          |
| `POST`   | `/api/collections/:id/add-products`       | Add products to a collection             | Admin          |
| `DELETE` | `/api/collections/:id/products/batch`     | Remove products from a collection        | Admin          |
| `PUT`    | `/api/collections/:id/products`           | Replace all products in a collection     | Admin          |
| `PATCH`  | `/api/collections/:id/products/positions` | Update product positions in a collection | Admin          |
| `GET`    | `/api/collections/:id/analytics`          | Get analytics for a collection           | No             |
| `GET`    | `/api/collections/analytics/top`          | Get top collections                      | No             |

---

### Example Requests for Product Variations

#### 1. Create a Product Variation

- **Method**: `POST`
- **URL**: `/api/product-variations/:productId`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "sku": "unique-sku",
    "price": 100.0,
    "discountPrice": 90.0,
    "stockQuantity": 50,
    "imageId": 1,
    "isDefault": true,
    "attributes": [
      { "attributeId": 1, "valueId": "value1" },
      { "attributeId": 2, "valueId": "value2" }
    ]
  }
  ```

#### 2. Get All Variations for a Product

- **Method**: `GET`
- **URL**: `/api/product-variations/:productId`

#### 3. Get All Variations with Attributes

- **Method**: `GET`
- **URL**: `/api/product-variations/:productId/details`

#### 4. Get a Single Variation by ID

- **Method**: `GET`
- **URL**: `/api/product-variations/:variationId`

#### 5. Update a Product Variation

- **Method**: `PATCH`
- **URL**: `/api/product-variations/:variationId`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "price": 120.0,
    "stockQuantity": 60,
    "isDefault": false
  }
  ```

#### 6. Update Variation Stock

- **Method**: `PATCH`
- **URL**: `/api/product-variations/:variationId/stock`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "quantity": 100
  }
  ```

#### 7. Set a Variation as Default

- **Method**: `PATCH`
- **URL**: `/api/product-variations/:variationId/default`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 8. Delete a Product Variation

- **Method**: `DELETE`
- **URL**: `/api/product-variations/:variationId`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 9. Bulk Update Stock

- **Method**: `PATCH`
- **URL**: `/api/product-variations/bulk-stock`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "updates": [
      { "variationId": 1, "quantity": 50 },
      { "variationId": 2, "quantity": 30 }
    ]
  }
  ```

#### 10. Bulk Create Variations

- **Method**: `POST`
- **URL**: `/api/product-variations/:productId/bulk`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "variations": [
      {
        "sku": "unique-sku-1",
        "price": 100.0,
        "stockQuantity": 50,
        "attributes": [{ "attributeId": 1, "valueId": "value1" }]
      },
      {
        "sku": "unique-sku-2",
        "price": 120.0,
        "stockQuantity": 30,
        "attributes": [{ "attributeId": 2, "valueId": "value2" }]
      }
    ]
  }
  ```

#### 11. Generate SKUs

- **Method**: `POST`
- **URL**: `/api/product-variations/:productId/generate-skus`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "baseSku": "base-sku",
    "attributes": [
      { "attributeId": 1, "values": ["value1", "value2"] },
      { "attributeId": 2, "values": ["value3", "value4"] }
    ]
  }
  ```

#### 12. Generate Attribute Combinations

- **Method**: `GET`
- **URL**: `/api/product-variations/:productId/combinations`

#### 13. Add Image to Variation

- **Method**: `PATCH`
- **URL**: `/api/product-variations/:variationId/image`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "imageId": 1
  }
  ```

#### 14. Remove Image from Variation

- **Method**: `DELETE`
- **URL**: `/api/product-variations/:variationId/image/:imageId`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 15. Update Variation Status

- **Method**: `PATCH`
- **URL**: `/api/product-variations/:variationId/status`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "status": "in_stock"
  }
  ```

---

### Example Requests for Tag Routes

#### 1. Get All Tags

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/tags`

#### 2. Get a Tag by ID or Slug

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/tags/:id`

#### 3. Get Products Associated with a Tag

- **Method**: `GET`
- **URL**: `http://localhost:3000/api/tags/:id/products`

#### 4. Create a New Tag

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/tags`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "New Tag",
    "slug": "new-tag"
  }
  ```

#### 5. Add a Tag to a Product

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/tags/:tagId/product/:productId`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 6. Remove a Tag from a Product

- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/tags/:tagId/product/:productId`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 7. Update a Tag

- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/tags/:id`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "Updated Tag",
    "slug": "updated-tag"
  }
  ```

#### 8. Delete a Tag

- **Method**: `DELETE`
- **URL**: `http://localhost:3000/api/tags/:id`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

---

### Example Requests for Collection Routes

#### 1. Get All Collections

- **Method**: `GET`
- **URL**: `/api/collections`
- **Description**: Retrieves all collections. Use the query parameter `?active=true` to filter active collections.

#### 2. Get Collections by Category

- **Method**: `GET`
- **URL**: `/api/collections/category/:categoryId`
- **Description**: Retrieves collections for a specific category. Use the query parameter `?active=true` to filter active collections.

#### 3. Get a Single Collection

- **Method**: `GET`
- **URL**: `/api/collections/:id`
- **Description**: Retrieves details of a specific collection. Use the query parameter `?withProducts=true` to include products.

#### 4. Get Products in a Collection

- **Method**: `GET`
- **URL**: `/api/collections/:id/products`
- **Description**: Retrieves all products in a specific collection.

#### 5. Create a New Collection

- **Method**: `POST`
- **URL**: `/api/collections`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "New Collection",
    "slug": "new-collection",
    "description": "Description of the collection",
    "imageUrl": "http://example.com/image.jpg",
    "categoryId": 1,
    "startDate": "2023-01-01",
    "endDate": "2023-12-31"
  }
  ```

#### 6. Bulk Create Collections

- **Method**: `POST`
- **URL**: `/api/collections/bulk`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  [
    {
      "name": "Collection 1",
      "slug": "collection-1",
      "categoryId": 1
    },
    {
      "name": "Collection 2",
      "slug": "collection-2",
      "categoryId": 2
    }
  ]
  ```

#### 7. Update a Collection

- **Method**: `PATCH`
- **URL**: `/api/collections/:id`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "Updated Collection Name",
    "description": "Updated description"
  }
  ```

#### 8. Bulk Update Collections

- **Method**: `PATCH`
- **URL**: `/api/collections/bulk`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  [
    {
      "id": 1,
      "name": "Updated Collection 1"
    },
    {
      "id": 2,
      "name": "Updated Collection 2"
    }
  ]
  ```

#### 9. Delete a Collection

- **Method**: `DELETE`
- **URL**: `/api/collections/:id`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 10. Toggle Featured Status

- **Method**: `PATCH`
- **URL**: `/api/collections/:id/feature`
- **Headers**:
  - `Authorization`: `Bearer <your_token>`

#### 11. Update Collection Status

- **Method**: `PATCH`
- **URL**: `/api/collections/:id/status`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "status": "active"
  }
  ```

#### 12. Add Products to a Collection

- **Method**: `POST`
- **URL**: `/api/collections/:id/add-products`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "productIds": [1, 2, 3]
  }
  ```

#### 13. Remove Products from a Collection

- **Method**: `DELETE`
- **URL**: `/api/collections/:id/products/batch`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "productIds": [1, 2]
  }
  ```

#### 14. Replace All Products in a Collection

- **Method**: `PUT`
- **URL**: `/api/collections/:id/products`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "productIds": [4, 5, 6]
  }
  ```

#### 15. Update Product Positions in a Collection

- **Method**: `PATCH`
- **URL**: `/api/collections/:id/products/positions`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "positions": [
      { "productId": 1, "position": 1 },
      { "productId": 2, "position": 2 }
    ]
  }
  ```

#### 16. Get Collection Analytics

- **Method**: `GET`
- **URL**: `/api/collections/:id/analytics`

#### 17. Get Top Collections

- **Method**: `GET`
- **URL**: `/api/collections/analytics/top`
- **Description**: Use the query parameter `?limit=5` to limit the number of results.

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

### 5. Test Tag Routes

#### Create a Tag

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/tags`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "Test Tag",
    "slug": "test-tag"
  }
  ```

### 6. Test Collection Routes

#### Create a Collection

- **Method**: `POST`
- **URL**: `http://localhost:3000/api/collections`
- **Headers**:
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <your_token>`
- **Body**:
  ```json
  {
    "name": "Test Collection",
    "slug": "test-collection",
    "description": "Test description",
    "categoryId": 1
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
