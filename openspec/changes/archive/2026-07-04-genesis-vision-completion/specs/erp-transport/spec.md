## ADDED Requirements

### Requirement: Transport route management
The system SHALL allow school admins to manage transport routes and stops.

#### Scenario: Admin creates a route
- WHEN an admin fills in route name, vehicle details, and stop list
- THEN the route is saved and visible in the transport dashboard

#### Scenario: Student assigned to a stop
- WHEN an admin or teacher assigns a student to a transport stop
- THEN the student's transport details are saved and visible in their profile

### Requirement: Transport attendance tracking
The system SHALL allow tracking student boarding/alighting.

#### Scenario: Driver marks attendance
- WHEN a driver (teacher role) marks a student as boarded
- THEN the attendance record is saved with date/time and route ID
