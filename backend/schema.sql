-- Shared Auth and product schema. Existing data is preserved on initialization.
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(username) BETWEEN 1 AND 80),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(email) BETWEEN 3 AND 254),
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Shared across workers; no plaintext emails/passwords stored here.
CREATE TABLE IF NOT EXISTS login_limits (
    bucket TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    slug TEXT NOT NULL UNIQUE CHECK(length(trim(slug)) > 0 AND slug = lower(slug))
);
CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(trim(name)) > 0)
);
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    price INTEGER NOT NULL CHECK(typeof(price) = 'integer' AND price > 0),
    original_price INTEGER CHECK(original_price IS NULL OR (typeof(original_price) = 'integer' AND original_price >= price)),
    image TEXT NOT NULL CHECK(length(trim(image)) > 0),
    stock INTEGER NOT NULL CHECK(typeof(stock) = 'integer' AND stock >= 0),
    specs_json TEXT NOT NULL CHECK(json_valid(specs_json) AND json_type(specs_json) = 'array'),
    screen_size REAL CHECK(screen_size IS NULL OR (typeof(screen_size) IN ('integer', 'real') AND screen_size > 0)),
    refresh_rate INTEGER CHECK(refresh_rate IS NULL OR (typeof(refresh_rate) = 'integer' AND refresh_rate > 0)),
    badge TEXT
);
CREATE TABLE IF NOT EXISTS product_connections (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    connection TEXT NOT NULL CHECK(connection IN ('Có dây', 'USB', 'USB-C', '2.4GHz', 'Bluetooth', 'XLR')),
    PRIMARY KEY(product_id, connection)
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_brand_idx ON products(brand_id);
CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS connections_value_idx ON product_connections(connection, product_id);

CREATE TABLE IF NOT EXISTS cart_items (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK(typeof(quantity) = 'integer' AND quantity > 0),
    PRIMARY KEY(user_id, product_id)
);
CREATE TABLE IF NOT EXISTS pickup_stores (
    id TEXT NOT NULL PRIMARY KEY CHECK(length(trim(id)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    address TEXT NOT NULL CHECK(length(trim(address)) > 0),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1))
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE CHECK(length(trim(reference)) > 0),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL CHECK(length(trim(full_name)) BETWEEN 1 AND 100),
    email TEXT NOT NULL CHECK(length(trim(email)) BETWEEN 3 AND 254),
    phone TEXT NOT NULL CHECK(length(trim(phone)) BETWEEN 7 AND 20),
    delivery_method TEXT NOT NULL CHECK(delivery_method IN ('ship', 'pickup')),
    province_code TEXT,
    province_name TEXT,
    ward_code TEXT,
    ward_name TEXT,
    street_address TEXT,
    pickup_store_id TEXT REFERENCES pickup_stores(id) ON DELETE RESTRICT,
    pickup_name TEXT,
    pickup_address TEXT,
    shipping_method TEXT,
    subtotal INTEGER NOT NULL CHECK(typeof(subtotal) = 'integer' AND subtotal >= 0),
    shipping_fee INTEGER NOT NULL CHECK(typeof(shipping_fee) = 'integer' AND shipping_fee >= 0),
    total INTEGER NOT NULL CHECK(typeof(total) = 'integer' AND total = subtotal + shipping_fee),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status = 'pending'),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (
        (delivery_method = 'ship'
         AND length(trim(coalesce(province_code, ''))) > 0
         AND length(trim(coalesce(province_name, ''))) > 0
         AND length(trim(coalesce(ward_code, ''))) > 0
         AND length(trim(coalesce(ward_name, ''))) > 0
         AND length(trim(coalesce(street_address, ''))) BETWEEN 1 AND 300
         AND shipping_method IS NOT NULL AND shipping_method IN ('standard', 'express', 'overnight')
         AND pickup_store_id IS NULL AND pickup_name IS NULL AND pickup_address IS NULL)
        OR
        (delivery_method = 'pickup'
         AND pickup_store_id IS NOT NULL
         AND length(trim(coalesce(pickup_name, ''))) > 0
         AND length(trim(coalesce(pickup_address, ''))) > 0
         AND province_code IS NULL AND province_name IS NULL
         AND ward_code IS NULL AND ward_name IS NULL AND street_address IS NULL
         AND shipping_method IS NULL AND shipping_fee = 0)
    )
);
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL CHECK(length(trim(product_name)) > 0),
    product_image TEXT NOT NULL CHECK(length(trim(product_image)) > 0),
    unit_price INTEGER NOT NULL CHECK(typeof(unit_price) = 'integer' AND unit_price > 0),
    quantity INTEGER NOT NULL CHECK(typeof(quantity) = 'integer' AND quantity > 0),
    UNIQUE(order_id, product_id)
);
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    method TEXT NOT NULL CHECK(method IN ('card', 'banking', 'cash')),
    amount INTEGER NOT NULL CHECK(typeof(amount) = 'integer' AND amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid')),
    transaction_reference TEXT UNIQUE CHECK(transaction_reference IS NULL OR length(trim(transaction_reference)) > 0),
    paid_at TEXT,
    CHECK((status = 'pending' AND paid_at IS NULL)
       OR (status = 'paid' AND length(trim(coalesce(paid_at, ''))) > 0))
);
-- Cross-table totals, stock checks and payment verification belong to checkout's transaction.
CREATE INDEX IF NOT EXISTS cart_product_idx ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, id);
CREATE INDEX IF NOT EXISTS orders_pickup_idx ON orders(pickup_store_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items(product_id);
