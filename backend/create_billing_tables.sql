-- Create billing tables
CREATE TABLE IF NOT EXISTS billing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grn_id INT NOT NULL,
    gross_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    balance_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('DRAFT', 'PARTIAL', 'PAID') DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grn_id) REFERENCES grns(id)
);

CREATE TABLE IF NOT EXISTS billing_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode ENUM('Cash', 'Bank', 'UPI', 'Cheque') NOT NULL,
    reference_no VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (billing_id) REFERENCES billing(id)
);

CREATE TABLE IF NOT EXISTS return_billing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    return_id INT NOT NULL,
    gross_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    balance_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('DRAFT', 'PARTIAL', 'PAID') DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (return_id) REFERENCES return_headers(id)
);

CREATE TABLE IF NOT EXISTS return_billing_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode ENUM('Cash', 'Bank', 'UPI', 'Cheque') NOT NULL,
    reference_no VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (billing_id) REFERENCES return_billing(id)
);