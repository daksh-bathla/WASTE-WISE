-- WasteWise Database Schema
-- Run this script in phpMyAdmin or MySQL to create the database and tables

CREATE DATABASE IF NOT EXISTS wastewise;
USE wastewise;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  language VARCHAR(20) DEFAULT 'en',
  streak_count INT DEFAULT 0,
  last_active DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  culture VARCHAR(50),
  region VARCHAR(100),
  state VARCHAR(100),
  city VARCHAR(100),
  is_rural BOOLEAN DEFAULT FALSE,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User medical information
CREATE TABLE IF NOT EXISTS user_medical (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  conditions TEXT,
  medications TEXT,
  allergies TEXT,
  is_pregnant BOOLEAN DEFAULT FALSE,
  age_group VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User skin information
CREATE TABLE IF NOT EXISTS user_skin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  skin_type VARCHAR(30),
  known_reactions TEXT,
  sensitivity_level VARCHAR(20),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User dietary information
CREATE TABLE IF NOT EXISTS user_dietary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  is_diabetic BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,
  is_jain BOOLEAN DEFAULT FALSE,
  is_halal BOOLEAN DEFAULT FALSE,
  is_gluten_free BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User household information
CREATE TABLE IF NOT EXISTS user_household (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  animals JSON,
  family_members INT DEFAULT 1,
  children_count INT DEFAULT 0,
  elderly_count INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  parent_category VARCHAR(100),
  description TEXT,
  safe_uses JSON,
  contraindications JSON,
  animal_safe_species JSON,
  animal_toxic_species JSON,
  disposal_method TEXT
);

-- Scans
CREATE TABLE IF NOT EXISTS scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  input_type ENUM('expired_product','waste_packaging','food_peels','electronics','other'),
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  weather_temp DECIMAL(5,2),
  weather_humidity INT,
  weather_uv DECIMAL(4,2),
  season VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Items
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scan_id INT,
  product_name VARCHAR(200),
  category_id INT,
  expiry_type ENUM('best_before','use_by','expiry_date','none'),
  expiry_date DATE,
  days_past_expiry INT,
  risk_level ENUM('safe','caution','unsafe'),
  raw_input TEXT,
  photo_url VARCHAR(500),
  FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Item components
CREATE TABLE IF NOT EXISTS item_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT,
  component_name VARCHAR(100),
  component_type VARCHAR(100),
  material VARCHAR(100),
  condition_status VARCHAR(50),
  estimated_quantity DECIMAL(10,2),
  unit VARCHAR(20),
  is_safe_to_repurpose BOOLEAN DEFAULT TRUE,
  safety_level ENUM('safe','caution','unsafe'),
  safe_for_body BOOLEAN DEFAULT TRUE,
  safe_for_animals BOOLEAN DEFAULT TRUE,
  safe_for_plants BOOLEAN DEFAULT TRUE,
  safe_for_crafts BOOLEAN DEFAULT TRUE,
  safety_warnings JSON,
  safety_must_not JSON,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_component_id INT,
  module_type ENUM('traditional','animal_feed','modern','diy','religious','health','disposal','ewaste'),
  title VARCHAR(300),
  steps JSON,
  source_url VARCHAR(500),
  source_credibility VARCHAR(50),
  region_tag VARCHAR(100),
  personalisation_note TEXT,
  video_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_component_id) REFERENCES item_components(id) ON DELETE CASCADE
);

-- Disclaimers
CREATE TABLE IF NOT EXISTS disclaimers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestion_id INT UNIQUE,
  who_should_not_use TEXT,
  when_to_stop TEXT,
  patch_test_required BOOLEAN DEFAULT FALSE,
  medical_boundary TEXT,
  animal_safety_note TEXT,
  quantity_ceiling VARCHAR(100),
  FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE
);

-- Community ratings
CREATE TABLE IF NOT EXISTS community_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  suggestion_id INT,
  user_id INT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  photo_url VARCHAR(500),
  tried_it BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggestion_id) REFERENCES suggestions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Scrap log
CREATE TABLE IF NOT EXISTS scrap_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  item_name VARCHAR(200),
  item_type VARCHAR(100),
  quantity DECIMAL(10,2),
  unit VARCHAR(20),
  action_taken ENUM('repurposed','fed_to_animals','composted','sold','donated','disposed'),
  logged_date DATE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Gaushala locations
CREATE TABLE IF NOT EXISTS gaushala_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200),
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  city VARCHAR(100),
  state VARCHAR(100),
  accepts_peels BOOLEAN DEFAULT TRUE,
  accepts_roti BOOLEAN DEFAULT TRUE,
  accepts_dairy BOOLEAN DEFAULT TRUE,
  contact VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE
);

-- Electronics platforms
CREATE TABLE IF NOT EXISTS electronics_platforms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  type ENUM('resale','recycling','takeback','donation'),
  url VARCHAR(300),
  accepts_brands JSON,
  accepts_categories JSON,
  pays_user BOOLEAN DEFAULT FALSE,
  is_doorstep_pickup BOOLEAN DEFAULT FALSE,
  coverage_areas JSON
);

-- Insert electronics platforms data
INSERT IGNORE INTO electronics_platforms (id, name, type, url, pays_user, is_doorstep_pickup) VALUES
(1, 'Cashify', 'resale', 'https://cashify.in', TRUE, TRUE),
(2, 'Namowaste', 'recycling', 'https://namowaste.com', FALSE, TRUE),
(3, 'Attero Recycling', 'recycling', 'https://attero.in', FALSE, FALSE),
(4, 'E-Parisaraa', 'recycling', 'https://e-parisaraa.com', FALSE, FALSE),
(5, 'Karo Sambhav', 'recycling', 'https://karosambhav.com', FALSE, FALSE),
(6, 'Goonj', 'donation', 'https://goonj.org', FALSE, FALSE),
(7, 'OLX', 'resale', 'https://olx.in', TRUE, FALSE);
