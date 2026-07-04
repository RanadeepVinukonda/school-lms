## ADDED Requirements

### Requirement: Password reset flow uses correct Supabase API
The password reset flow SHALL use Supabase's recovery flow, not Firebase's oobCode pattern.

#### Scenario: Password reset works end-to-end
- **WHEN** a user requests a password reset
- **THEN** the system SHALL call `supabase.auth.resetPasswordForEmail(email)`
- **WHEN** the user clicks the reset link and enters a new password
- **THEN** the system SHALL call `supabase.auth.updateUser({ password })` with an active session from the recovery link

### Requirement: loading prop is supported on Button component
The `Button` component SHALL accept a `loading` prop that disables the button and shows a spinner.

#### Scenario: Loading state prevents double-submit
- **WHEN** a form's Button has `loading={true}`
- **THEN** the button SHALL be disabled
- **THEN** a spinner SHALL be visible inside the button
- **THEN** clicking the button SHALL NOT trigger the form submission

### Requirement: ROUTES.ADMIN_LOGIN constant exists
The `ROUTES` constant object SHALL include `ADMIN_LOGIN` pointing to a valid route path.

#### Scenario: Admin layout can redirect to login
- **WHEN** the admin layout encounters an error state
- **THEN** `<Navigate to={ROUTES.ADMIN_LOGIN} replace />` SHALL navigate to a valid route
- **THEN** the admin login page SHALL render

### Requirement: selectedClassId persists across reloads
The `authStore` SHALL persist `selectedClassId` to localStorage.

#### Scenario: Class selection survives page reload
- **WHEN** a user selects a class and reloads the page
- **THEN** `selectedClassId` SHALL retain its value
- **THEN** the UI SHALL reflect the previously selected class
