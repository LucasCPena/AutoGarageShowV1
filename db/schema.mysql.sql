CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','user') NOT NULL,
  document VARCHAR(30),
  phone VARCHAR(30),
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(8) NOT NULL,
  location VARCHAR(200) NOT NULL,
  contact_name VARCHAR(160) NOT NULL,
  contact_document VARCHAR(30) NOT NULL,
  contact_phone VARCHAR(30),
  contact_phone_secondary VARCHAR(30),
  contact_email VARCHAR(160),
  start_at VARCHAR(32) NOT NULL,
  end_at VARCHAR(32),
  status ENUM('pending','approved','completed') NOT NULL,
  recurrence JSON NOT NULL,
  website_url VARCHAR(255),
  live_url VARCHAR(255),
  cover_image VARCHAR(255),
  images JSON,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  featured_until VARCHAR(32),
  created_by VARCHAR(36) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
CREATE TABLE IF NOT EXISTS past_events (
  id VARCHAR(36) PRIMARY KEY,
  event_id VARCHAR(36),
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,                    
  city VARCHAR(120) NOT NULL,
  state VARCHAR(8) NOT NULL,
  date VARCHAR(32) NOT NULL,
  images JSON NOT NULL,
  description TEXT,
  attendance INT,
  videos JSON,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  make VARCHAR(120) NOT NULL,
  model VARCHAR(120) NOT NULL,
  model_year INT NOT NULL,
  manufacture_year INT NOT NULL,
  year INT NOT NULL,
  mileage INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  images JSON NOT NULL,
  contact JSON NOT NULL,
  specifications JSON NOT NULL,
  status ENUM('pending','approved','active','inactive','sold','rejected') NOT NULL,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  featured_until VARCHAR(32),
  created_by VARCHAR(36) NOT NULL,
  document VARCHAR(30) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(8) NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36),
  event_id VARCHAR(36),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  image VARCHAR(255) NOT NULL,
  link VARCHAR(255),
  section VARCHAR(80) NOT NULL,
  position INT NOT NULL,
  status ENUM('active','inactive') NOT NULL,
  start_date VARCHAR(32) NOT NULL,
  end_date VARCHAR(32),
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  data JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicle_brands (
  id VARCHAR(120) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  models JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS news (
  id VARCHAR(36) PRIMARY KEY,
  slug VARCHAR(180) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category ENUM('eventos','classificados','geral','dicas') NOT NULL,
  cover_image VARCHAR(255) NOT NULL,
  author VARCHAR(160) NOT NULL,
  status ENUM('draft','published') NOT NULL,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
);
