-- Database Schema Export
-- Generated: 2026-01-14 09:52:03
-- Database: banda_ecommerce


-- Table: alembic_version
CREATE TABLE alembic_version (
  version_num VARCHAR(32) NOT NULL
);

ALTER TABLE alembic_version ADD PRIMARY KEY (version_num);


-- Table: attribute_segments
CREATE TABLE attribute_segments (
  id UUID NOT NULL,
  category_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER NOT NULL,
  is_collapsible BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE attribute_segments ADD PRIMARY KEY (id);

ALTER TABLE attribute_segments ADD CONSTRAINT attribute_segments_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE;

CREATE INDEX ix_attribute_segments_category_id ON attribute_segments (category_id);

CREATE INDEX ix_attribute_segments_display_order ON attribute_segments (display_order);


-- Table: cart_items
CREATE TABLE cart_items (
  id UUID NOT NULL,
  cart_id UUID NOT NULL,
  product_id UUID NOT NULL,
  sell_unit_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

ALTER TABLE cart_items ADD PRIMARY KEY (id);

ALTER TABLE cart_items ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES carts (id) ON DELETE CASCADE;

ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

ALTER TABLE cart_items ADD CONSTRAINT cart_items_sell_unit_id_fkey FOREIGN KEY (sell_unit_id) REFERENCES sell_units (id) ON DELETE CASCADE;

CREATE INDEX ix_cart_items_cart_id ON cart_items (cart_id);

CREATE INDEX ix_cart_items_product_id ON cart_items (product_id);

CREATE INDEX ix_cart_items_sell_unit_id ON cart_items (sell_unit_id);


-- Table: carts
CREATE TABLE carts (
  id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  coupon_id UUID,
  discount_amount NUMERIC(10, 2) NOT NULL
);

ALTER TABLE carts ADD PRIMARY KEY (id);

ALTER TABLE carts ADD CONSTRAINT carts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE carts ADD CONSTRAINT fk_carts_coupon FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE SET NULL;

CREATE INDEX ix_carts_coupon_id ON carts (coupon_id);


-- Table: categories
CREATE TABLE categories (
  id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  parent_id UUID,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE categories ADD PRIMARY KEY (id);

ALTER TABLE categories ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL;

CREATE INDEX ix_categories_parent_id ON categories (parent_id);


-- Table: category_attributes
CREATE TABLE category_attributes (
  id UUID NOT NULL,
  category_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  attribute_type VARCHAR(12) NOT NULL,
  options JSON,
  unit VARCHAR(20),
  is_required BOOLEAN NOT NULL,
  is_inherited BOOLEAN NOT NULL,
  is_filterable BOOLEAN NOT NULL,
  is_searchable BOOLEAN NOT NULL,
  display_order INTEGER NOT NULL,
  show_in_listing BOOLEAN NOT NULL,
  show_in_details BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  segment_id UUID
);

ALTER TABLE category_attributes ADD PRIMARY KEY (id);

ALTER TABLE category_attributes ADD CONSTRAINT category_attributes_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE;

ALTER TABLE category_attributes ADD CONSTRAINT fk_category_attributes_segment_id FOREIGN KEY (segment_id) REFERENCES attribute_segments (id) ON DELETE SET NULL;

CREATE INDEX ix_category_attributes_category_id ON category_attributes (category_id);

CREATE INDEX ix_category_attributes_segment_id ON category_attributes (segment_id);

CREATE INDEX ix_category_attributes_slug ON category_attributes (slug);


-- Table: coupon_usages
CREATE TABLE coupon_usages (
  id UUID NOT NULL,
  coupon_id UUID NOT NULL,
  user_id UUID,
  order_id UUID NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

ALTER TABLE coupon_usages ADD PRIMARY KEY (id);

ALTER TABLE coupon_usages ADD CONSTRAINT coupon_usages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons (id) ON DELETE CASCADE;

ALTER TABLE coupon_usages ADD CONSTRAINT coupon_usages_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE coupon_usages ADD CONSTRAINT coupon_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX ix_coupon_usages_coupon_id ON coupon_usages (coupon_id);

CREATE INDEX ix_coupon_usages_order_id ON coupon_usages (order_id);

CREATE INDEX ix_coupon_usages_user_id ON coupon_usages (user_id);


-- Table: coupons
CREATE TABLE coupons (
  id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  min_order_amount NUMERIC(10, 2) NOT NULL,
  max_discount NUMERIC(10, 2),
  expiry_date TIMESTAMP,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE coupons ADD PRIMARY KEY (id);

CREATE INDEX ix_coupons_is_active ON coupons (is_active);


-- Table: delivery_addresses
CREATE TABLE delivery_addresses (
  id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  label VARCHAR(50) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(15) NOT NULL,
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  landmark VARCHAR(255),
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  is_default BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE delivery_addresses ADD PRIMARY KEY (id);

ALTER TABLE delivery_addresses ADD CONSTRAINT delivery_addresses_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX ix_delivery_addresses_buyer_id ON delivery_addresses (buyer_id);


-- Table: delivery_history
CREATE TABLE delivery_history (
  id UUID NOT NULL,
  order_id UUID NOT NULL,
  delivery_partner_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  is_cod BOOLEAN NOT NULL,
  cod_amount NUMERIC(10, 2),
  cod_collected BOOLEAN,
  cod_collected_at TIMESTAMP,
  failure_reason VARCHAR(50),
  failure_notes TEXT,
  assigned_at TIMESTAMP NOT NULL,
  attempted_at TIMESTAMP,
  completed_at TIMESTAMP,
  delivery_time_minutes INTEGER,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE delivery_history ADD PRIMARY KEY (id);

ALTER TABLE delivery_history ADD CONSTRAINT delivery_history_delivery_partner_id_fkey FOREIGN KEY (delivery_partner_id) REFERENCES delivery_partners (id) ON DELETE CASCADE;

ALTER TABLE delivery_history ADD CONSTRAINT delivery_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

CREATE INDEX ix_delivery_history_delivery_partner_id ON delivery_history (delivery_partner_id);

CREATE INDEX ix_delivery_history_order_id ON delivery_history (order_id);


-- Table: delivery_partners
CREATE TABLE delivery_partners (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  vehicle_type VARCHAR(50),
  vehicle_number VARCHAR(20),
  is_active BOOLEAN NOT NULL,
  is_available BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE delivery_partners ADD PRIMARY KEY (id);

ALTER TABLE delivery_partners ADD CONSTRAINT delivery_partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;


-- Table: inventory
CREATE TABLE inventory (
  id UUID NOT NULL,
  product_id UUID NOT NULL,
  available_quantity NUMERIC(10, 3) NOT NULL,
  reserved_quantity NUMERIC(10, 3) NOT NULL,
  low_stock_threshold NUMERIC(10, 3) NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

ALTER TABLE inventory ADD PRIMARY KEY (id);

ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;


-- Table: notifications
CREATE TABLE notifications (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  action_label VARCHAR(50),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  extra_data TEXT,
  is_read BOOLEAN NOT NULL,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL
);

ALTER TABLE notifications ADD PRIMARY KEY (id);

ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX ix_notifications_created_at ON notifications (created_at);

CREATE INDEX ix_notifications_is_read ON notifications (is_read);

CREATE INDEX ix_notifications_related_entity_id ON notifications (related_entity_id);

CREATE INDEX ix_notifications_type ON notifications (type);

CREATE INDEX ix_notifications_user_id ON notifications (user_id);


-- Table: order_items
CREATE TABLE order_items (
  id UUID NOT NULL,
  order_id UUID NOT NULL,
  product_id UUID,
  sell_unit_id UUID,
  product_name VARCHAR(255) NOT NULL,
  sell_unit_label VARCHAR(50) NOT NULL,
  unit_value NUMERIC(10, 3) NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit NUMERIC(10, 2) NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  return_eligible BOOLEAN NOT NULL,
  return_window_days INTEGER,
  return_deadline TIMESTAMP
);

ALTER TABLE order_items ADD PRIMARY KEY (id);

ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL;

ALTER TABLE order_items ADD CONSTRAINT order_items_sell_unit_id_fkey FOREIGN KEY (sell_unit_id) REFERENCES sell_units (id) ON DELETE SET NULL;

CREATE INDEX ix_order_items_order_id ON order_items (order_id);


-- Table: orders
CREATE TABLE orders (
  id UUID NOT NULL,
  order_number VARCHAR(20) NOT NULL,
  buyer_id UUID,
  vendor_id UUID,
  delivery_address_id UUID,
  delivery_address_snapshot TEXT,
  delivery_latitude NUMERIC(10, 8),
  delivery_longitude NUMERIC(11, 8),
  delivery_distance_km NUMERIC(5, 2),
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_mode VARCHAR(20) NOT NULL,
  payment_status VARCHAR(20) NOT NULL,
  order_status VARCHAR(50) NOT NULL,
  notes TEXT,
  cancellation_reason TEXT,
  placed_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  processing_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  picked_at TIMESTAMP,
  packed_at TIMESTAMP,
  out_for_delivery_at TIMESTAMP,
  delivery_partner_id UUID,
  delivery_otp VARCHAR(6)
);

ALTER TABLE orders ADD PRIMARY KEY (id);

ALTER TABLE orders ADD CONSTRAINT fk_orders_delivery_partner_id FOREIGN KEY (delivery_partner_id) REFERENCES delivery_partners (id) ON DELETE SET NULL;

ALTER TABLE orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE orders ADD CONSTRAINT orders_delivery_address_id_fkey FOREIGN KEY (delivery_address_id) REFERENCES delivery_addresses (id) ON DELETE SET NULL;

ALTER TABLE orders ADD CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE SET NULL;

CREATE INDEX ix_orders_buyer_id ON orders (buyer_id);

CREATE INDEX ix_orders_delivery_otp ON orders (delivery_otp);

CREATE INDEX ix_orders_delivery_partner_id ON orders (delivery_partner_id);

CREATE INDEX ix_orders_order_status ON orders (order_status);

CREATE INDEX ix_orders_vendor_id ON orders (vendor_id);


-- Table: payment_logs
CREATE TABLE payment_logs (
  id UUID NOT NULL,
  payment_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL
);

ALTER TABLE payment_logs ADD PRIMARY KEY (id);

ALTER TABLE payment_logs ADD CONSTRAINT payment_logs_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE;

CREATE INDEX ix_payment_logs_event_type ON payment_logs (event_type);

CREATE INDEX ix_payment_logs_payment_id ON payment_logs (payment_id);


-- Table: payments
CREATE TABLE payments (
  id UUID NOT NULL,
  order_id UUID NOT NULL,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(10) NOT NULL,
  method VARCHAR(50),
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE payments ADD PRIMARY KEY (id);

ALTER TABLE payments ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

CREATE INDEX ix_payments_order_id ON payments (order_id);

CREATE INDEX ix_payments_razorpay_order_id ON payments (razorpay_order_id);

CREATE INDEX ix_payments_razorpay_payment_id ON payments (razorpay_payment_id);

CREATE INDEX ix_payments_status ON payments (status);


-- Table: product_attribute_values
CREATE TABLE product_attribute_values (
  id UUID NOT NULL,
  product_id UUID NOT NULL,
  attribute_id UUID NOT NULL,
  value TEXT NOT NULL,
  value_json JSON,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE product_attribute_values ADD PRIMARY KEY (id);

ALTER TABLE product_attribute_values ADD CONSTRAINT product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES category_attributes (id) ON DELETE CASCADE;

ALTER TABLE product_attribute_values ADD CONSTRAINT product_attribute_values_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

CREATE INDEX ix_product_attribute_values_attribute_id ON product_attribute_values (attribute_id);

CREATE INDEX ix_product_attribute_values_product_id ON product_attribute_values (product_id);


-- Table: product_images
CREATE TABLE product_images (
  id UUID NOT NULL,
  product_id UUID NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL
);

ALTER TABLE product_images ADD PRIMARY KEY (id);

ALTER TABLE product_images ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

CREATE INDEX ix_product_images_product_id ON product_images (product_id);


-- Table: products
CREATE TABLE products (
  id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  category_id UUID,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  stock_unit VARCHAR(5) NOT NULL,
  is_active BOOLEAN NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  return_eligible BOOLEAN NOT NULL,
  return_window_days INTEGER,
  return_conditions TEXT
);

ALTER TABLE products ADD PRIMARY KEY (id);

ALTER TABLE products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL;

ALTER TABLE products ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE;

CREATE INDEX ix_products_category_id ON products (category_id);

CREATE INDEX ix_products_slug ON products (slug);

CREATE INDEX ix_products_vendor_id ON products (vendor_id);


-- Table: refresh_tokens
CREATE TABLE refresh_tokens (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL
);

ALTER TABLE refresh_tokens ADD PRIMARY KEY (id);

ALTER TABLE refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);


-- Table: refunds
CREATE TABLE refunds (
  id UUID NOT NULL,
  order_id UUID NOT NULL,
  payment_id UUID,
  return_request_id UUID,
  amount NUMERIC(10, 2) NOT NULL,
  razorpay_refund_id VARCHAR(100),
  status VARCHAR(50) NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP
);

ALTER TABLE refunds ADD PRIMARY KEY (id);

ALTER TABLE refunds ADD CONSTRAINT refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE refunds ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE SET NULL;

ALTER TABLE refunds ADD CONSTRAINT refunds_return_request_id_fkey FOREIGN KEY (return_request_id) REFERENCES return_requests (id) ON DELETE SET NULL;

CREATE INDEX ix_refunds_order_id ON refunds (order_id);

CREATE INDEX ix_refunds_payment_id ON refunds (payment_id);

CREATE INDEX ix_refunds_razorpay_refund_id ON refunds (razorpay_refund_id);

CREATE INDEX ix_refunds_return_request_id ON refunds (return_request_id);

CREATE INDEX ix_refunds_status ON refunds (status);


-- Table: return_requests
CREATE TABLE return_requests (
  id UUID NOT NULL,
  order_id UUID NOT NULL,
  order_item_id UUID NOT NULL,
  buyer_id UUID,
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  images JSON,
  status VARCHAR(50) NOT NULL,
  refund_amount NUMERIC(10, 2) NOT NULL,
  admin_notes TEXT,
  vendor_notes TEXT,
  created_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP
);

ALTER TABLE return_requests ADD PRIMARY KEY (id);

ALTER TABLE return_requests ADD CONSTRAINT return_requests_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE return_requests ADD CONSTRAINT return_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE return_requests ADD CONSTRAINT return_requests_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES order_items (id) ON DELETE CASCADE;

CREATE INDEX ix_return_requests_buyer_id ON return_requests (buyer_id);

CREATE INDEX ix_return_requests_order_id ON return_requests (order_id);

CREATE INDEX ix_return_requests_order_item_id ON return_requests (order_item_id);

CREATE INDEX ix_return_requests_status ON return_requests (status);


-- Table: sell_units
CREATE TABLE sell_units (
  id UUID NOT NULL,
  product_id UUID NOT NULL,
  label VARCHAR(50) NOT NULL,
  unit_value NUMERIC(10, 3) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  compare_price NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE sell_units ADD PRIMARY KEY (id);

ALTER TABLE sell_units ADD CONSTRAINT sell_units_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

CREATE INDEX ix_sell_units_product_id ON sell_units (product_id);


-- Table: service_zones
CREATE TABLE service_zones (
  id UUID NOT NULL,
  zone_name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  center_latitude NUMERIC(10, 8),
  center_longitude NUMERIC(11, 8),
  radius_km NUMERIC(5, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) NOT NULL,
  min_order_value NUMERIC(10, 2) NOT NULL,
  estimated_time_mins INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE service_zones ADD PRIMARY KEY (id);

CREATE INDEX ix_service_zones_city ON service_zones (city);


-- Table: stock_reservations
CREATE TABLE stock_reservations (
  id UUID NOT NULL,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL,
  reserved_quantity NUMERIC(10, 3) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  released_at TIMESTAMP
);

ALTER TABLE stock_reservations ADD PRIMARY KEY (id);

ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

ALTER TABLE stock_reservations ADD CONSTRAINT stock_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE;

CREATE INDEX ix_stock_reservations_order_id ON stock_reservations (order_id);

CREATE INDEX ix_stock_reservations_product_id ON stock_reservations (product_id);

CREATE INDEX ix_stock_reservations_status ON stock_reservations (status);


-- Table: users
CREATE TABLE users (
  id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL,
  is_email_verified BOOLEAN NOT NULL,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP
);

ALTER TABLE users ADD PRIMARY KEY (id);


-- Table: vendor_payout_items
CREATE TABLE vendor_payout_items (
  id UUID NOT NULL,
  payout_id UUID NOT NULL,
  order_id UUID,
  order_amount NUMERIC(10, 2) NOT NULL,
  commission NUMERIC(10, 2) NOT NULL,
  net_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

ALTER TABLE vendor_payout_items ADD PRIMARY KEY (id);

ALTER TABLE vendor_payout_items ADD CONSTRAINT vendor_payout_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL;

ALTER TABLE vendor_payout_items ADD CONSTRAINT vendor_payout_items_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES vendor_payouts (id) ON DELETE CASCADE;

CREATE INDEX ix_vendor_payout_items_order_id ON vendor_payout_items (order_id);

CREATE INDEX ix_vendor_payout_items_payout_id ON vendor_payout_items (payout_id);


-- Table: vendor_payouts
CREATE TABLE vendor_payouts (
  id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_orders INTEGER NOT NULL,
  gross_amount NUMERIC(10, 2) NOT NULL,
  commission_amount NUMERIC(10, 2) NOT NULL,
  refund_deductions NUMERIC(10, 2) NOT NULL,
  net_amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP
);

ALTER TABLE vendor_payouts ADD PRIMARY KEY (id);

ALTER TABLE vendor_payouts ADD CONSTRAINT vendor_payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE;

CREATE INDEX ix_vendor_payouts_status ON vendor_payouts (status);

CREATE INDEX ix_vendor_payouts_transaction_id ON vendor_payouts (transaction_id);

CREATE INDEX ix_vendor_payouts_vendor_id ON vendor_payouts (vendor_id);


-- Table: vendors
CREATE TABLE vendors (
  id UUID NOT NULL,
  user_id UUID NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  address_line_1 VARCHAR(255) NOT NULL,
  address_line_2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  delivery_radius_km NUMERIC(5, 2) NOT NULL,
  phone VARCHAR(15),
  is_verified BOOLEAN NOT NULL,
  is_active BOOLEAN NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  total_orders INTEGER NOT NULL,
  total_reviews INTEGER NOT NULL,
  commission_percent NUMERIC(4, 2) NOT NULL,
  cod_enabled BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP,
  verified_at TIMESTAMP
);

ALTER TABLE vendors ADD PRIMARY KEY (id);

ALTER TABLE vendors ADD CONSTRAINT vendors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX ix_vendors_city ON vendors (city);

