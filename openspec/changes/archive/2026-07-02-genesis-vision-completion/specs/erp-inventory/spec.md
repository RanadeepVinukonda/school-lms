## ADDED Requirements

### Requirement: Inventory item management
The system SHALL allow school admins to manage inventory items (stationery, equipment, furniture).

#### Scenario: Admin adds an inventory item
- WHEN an admin enters item name, category, quantity, and supplier
- THEN the item is saved and listed in the inventory dashboard

#### Scenario: Admin records stock usage
- WHEN an admin reduces the quantity of an item
- THEN a usage log entry is created with timestamp and reason

### Requirement: Supplier management
The system SHALL maintain a supplier directory.

#### Scenario: Admin adds a supplier
- WHEN an admin enters supplier name, contact, and catalog items
- THEN the supplier is saved for reorder tracking
