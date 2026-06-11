# eTutor Enterprise Demo — Full Platform Reference

**URL**: `https://enterprisedemo.etutor.co/`  
**Credentials**: `shyam1@hallmarklearninglabs.com` / `779392`  
**Vendor**: Hallmark Learning Labs / Hallmark Global Technologies Ltd  
**Location**: Hyderabad, India  
**Website**: https://etutor.co

---

## 1. Architecture Overview

| Layer | Technology |
|-------|-----------|
| **Frontend** | AngularJS 1.x (Angular 1.4.9 + 1.x hybrid), jQuery 3.6.x, Bootstrap 5 (Metronic theme) |
| **Backend** | PHP (vanilla, no framework detected) |
| **Database** | MySQL |
| **Hosting** | AWS (Application Load Balancer — ALB) |
| **Web Server** | Apache |
| **Session** | PHP Sessions (`PHPSESSID`) + AWSALB affinity cookies |
| **CDN/Assets** | Self-hosted + CDN (Google Fonts, unpkg, cdnjs) |
| **Real-time** | None detected (no WebSocket, no Pusher) |
| **HTTPS** | Yes (TLS) |
| **HTTP/2** | Yes (`Upgrade: h2` header) |

---

## 2. Tech Stack

### Frontend Libraries
```
AngularJS 1.x (angular.min.js, angular-sanitize.min.js, angular-animate 1.4.9)
AngularUI Bootstrap (ui-bootstrap-tpls-0.11.0.js)
jQuery 3.6.0 / 3.7.1
Axios (unpkg)
Bootstrap 5 (Metronic theme - keen-themes.io)
DataTables (datatables.bundle)
Leaflet (maps)
PrismJS (syntax highlighting)
FullCalendar
dirPagination (Angular pagination)
```

### Backend (PHP)
```
PHP: vanilla, no framework
APIs: Custom flat-file PHP services
Auth: Session-based (PHPSESSID) + AJAX token in POST body
```

---

## 3. Page Structure & Routing

The app uses flat PHP pages with clean URLs (mod_rewrite or similar). All pages are `.php` files but accessed without extension.

### 3.1 Authentication
| Page | Route |
|------|-------|
| Login | `/` or `/index` |
| Login POST | `dologin.php` |
| Logout | `sign-out` |

### 3.2 Lead Management (Front Office)
| Page | Route |
|------|-------|
| Lead Capturing | `lead-capturing` |
| Lead Centralization | `lead-centralization` |
| Leads Assigning | `leads-assigning` |
| Counsellor Dashboard | `counsellor-dashboard` |
| Lead Analytics Manager | `lead-analytics-manager` |
| Lead Reports | `lead-reports` |
| Front Office Dashboard | `front-office-dashboard` |
| Deleted Enquiries | `deleted-enquires` |

### 3.3 Student Management (ERP)
| Page | Route |
|------|-------|
| Import Students | `import-students-erp` |
| Add Student | `add-student-erp` |
| Candidates Dashboard | `candidates-dashboard` |
| Admission List | `admission-list-erp` |
| Promoted List | `promoted-list` |
| Promote Students | `promote-students` |
| Assign Course | `assign-course` |

### 3.4 Fee Management
| Page | Route |
|------|-------|
| Fee Concession Requests | `fee-concession-requests` |
| Carry Forward Fees | `carryforward-fees` |
| Assign Fees | `assign-fees` |
| Assign Other Fees | `assign-other-fees` |
| Master Fees | `master-fees` |
| Create Fees | `create-fees` |
| Fee Installment Master | `fee-installment-master` |
| Fee Structure | `fee-structure` |
| Student Fees Dues | `student-fees-dues` |
| Student Fees Overdues | `student-fees-overdues` |
| Finance Dashboard | `finance-dashboard` |
| Fee Collection | `fee-collection` |
| Student Fees Transactions | `student-fees-transactions` |
| Day Fee Report | `day-fee-report` |

### 3.5 Accounts / Finance
| Page | Route |
|------|-------|
| Ledger AC Management | `ledger-ac-management` |
| Income List | `income-list` |
| Add Income | `add-income` |
| Income Report | `income-report` |
| Expenses List | `expenses-list` |
| Add Bill Payment | `add-bill-payment` |
| Expenses Report | `expenses-report` |
| Expense Approvals | `expense-approvals` |
| Accounts Manager Dashboard | `accounts-manager-dashboard` |
| Income & Expenses | `income-expenses` |

### 3.6 Staff / HR Management
| Page | Route |
|------|-------|
| Add Staff | `add-staff` |
| Staff List | `staff` |
| Teachers | `teachers` |
| Staff Leaves | `staff-leaves` |
| Staff Activity Summary | `staff-activity-summary` |
| Staff Add Report | `staff-add-report` |
| Leave Balances | `leave-balances` |
| Holiday Calendar | `holiday-calendar` |
| Activity Report | `activity-report` |
| Document Center | `document-center` |
| Departments | `departments` |
| Designations | `designations` |
| Employee Types | `employee-types` |
| Shifts | `shifts` |
| Leave Types | `leave-types` |
| Staff Working Days | `staff-working-days` |
| Manage Employee Leaves | `manage-employee-leaves` |
| Document Category | `document-category` |
| Document Upload | `document-upload` |

### 3.7 Attendance
| Page | Route |
|------|-------|
| Manual Mark Attendance | `manual-mark-attendance` |
| Upload Attendance | `upload-attendance` |
| Class Attendance Report | `class-attendance-report` |
| Attendance Criteria | `attendance-criteria` |
| Update Working Days | `update-working-days` |
| Upload Holidays | `upload-holidays` |
| Month-wise Attendance Report | `month-wise-attendance-report` |

### 3.8 Academic / Gradebook
| Page | Route |
|------|-------|
| Category Master | `category-master` |
| Import Chapter/Topic/Subtopic | `import-chapter-topic-and-subtopic` |
| Student Subject Mapping | `student-subject-mapping` |
| Gradebook Structures | `gradebook-structures` |
| Create Gradebook Structure | `create-gradebook-structure` |
| Gradebook Management | `gradebook-management` |
| Gradebook Templates | `gradebook-templates` |
| Create Gradebook Template | `gradebook-template-create` |
| Data Entry Dashboard | `dataentry-dashboard` |
| Exam Paper Approval | `exam-paper-approval` |
| Exam Timetable Approval | `exam-timetable-approval` |

### 3.9 Classwork / Timetable
| Page | Route |
|------|-------|
| Classwork Tracking | `classwork-tracking` |
| Timetable (Class Sections) | `class-sections` |
| Configure Periods | `configure-periods` |

### 3.10 Exam Management
| Page | Route |
|------|-------|
| Manage Templates | `test-templates` |
| Manage Question Papers | `question-papers` |
| Manage Tests | `custom-test-list` (also `compose-test`) |
| Previous Years QP | `pyqs-custom-test-list` |
| Question Paper View Attempts | `question-paper-view-attempts` |
| Take Test | `taketest` or `jadv-taketest` (JEE Advanced) |

### 3.11 Content Management
| Page | Route |
|------|-------|
| Manage Resources | `all-resources` |
| Upload Resource | `upload-resource` |
| Manage Question Bank | `questions` |
| Manage Documents (OCR) | `ocr-documents` |

### 3.12 Reports & Analytics
| Page | Route |
|------|-------|
| Download Exam Reports | `exam-reports` |
| Test Reports | `objective-test-reports` |
| Score Average on Tests | `score-average-on-tests` |
| Institutional Reports | `institutional-analytics` |

### 3.13 Notifications
| Page | Route |
|------|-------|
| Create Notification | `create-notifications` |
| List Notifications | `all-notifications` |
| Notification Types | `notification-types` |
| Modules Permissions | `notification-settings` |
| Templates | `notification-templates` |

### 3.14 Other
| Page | Route |
|------|-------|
| Inbox | `inbox` |
| Help Desk | `admin-helpdesk` |
| My Profile | `my-profile` |
| Privacy Policy | `privacy-policy` |
| Terms of Use | `terms-and-conditions` |

---

## 4. API Endpoints

### 4.1 `api/Adminservice.php`
Main admin service. Action-based POST API.
```json
// Request format: application/x-www-form-urlencoded
// Parameters: action=<action_name>&<other_params>

// Known actions (discovered from JS):
- rankbooster / student_rank_booster
```

### 4.2 `api/parent_api.php`
Parent portal data service.
```json
// Known actions:
- getAttendance       → { data: null, error: false, message: "" }
- getStudentReports
```

### 4.3 `api/levelone-manager_Service.php`
Level-1 manager (dashboard & operations). Most active API.
```json
// Known actions:
- getSubjects         → { subjects: [...], error: bool, message: "" }
- exams               → { exams: [...], total_tests: int, today_tests_count: int, upcoming_tests_count: int, recent_tests_count: int }
- examsDraft          → { exams: [...] }
- examsReports        → { examsReports: [...] }
- dialyscheduler      → { classwork: [...], homework: [...] }
- event_details       → { data: { comming_soon: bool, is_running: bool, is_exam: bool, is_metting: bool, show_block: bool } }
- get_courseSubscription → { testbooster: bool }
```

### 4.4 `api/TemplateService.php`
Template management service.
```json
// Known actions:
- getClassesNSubjectsByCourse
```

### 4.5 `api/Service.php`
Generic service.
```json
// Known actions:
- academic_years      → { years: [...], current_year: { academic_id: ... } }
```

### 4.6 Standalone PHP Endpoints
```php
dologin.php                          // POST: email, password → { error: bool, message: "", default_dashboard: "", is_redirect: bool }
getCoursesList.php                   // POST: ct_id → { courses: [...] }
load_all_classes.php                 // GET: course_id → [{ class_id, class_name }, ...]
getSectionsList.php                  // GET: class_id → { sections: [...] }
get_institutional_analytics.php      // POST: campus_id, academic_year_id, course_id, class_id, section_id, page → { status, data, summary }
change_current_campus_status.php     // POST: campus_id → { current_url }
change_current_course_status.php     // POST: course_id, id
join-live-class                       // POST form submit → Zoom/BBB SDK
join-live-class-z                     // POST → Zoom SDK
join_live_class_g.php                 // POST → Google Meet SDK
join_live_class_t.php                 // POST → Microsoft Teams SDK
```

---

## 5. Virtual Classroom SDK Integrations

The platform supports multiple live class SDKs, selected by `SDK_TYPE`:
```
zoom   → join-live-class-z  (POST form, _self)
gmeet  → join_live_class_g.php (POST, _blank)
teams  → join_live_class_t.php (POST, _blank)
(other)→ join-live-class (POST, _self)
```

---

## 6. AI/ML Features — Security Assessment

### 6.1 Claims from Marketing Site (etutor.co)
The public marketing site claims:
- **AI-powered adaptive practice** — "leverages AI power driven adaptive learning functionality"
- **AI-powered reports and analytics** — "AI analytical reports"
- **AI proctoring** for online exams — "advanced proctoring-technology"
- **IRT-based sorted and curated question bank** — Item Response Theory

### 6.2 Actual Implementation Findings
After thorough examination of all accessible front-end JavaScript files and API endpoints:

| Claim | Found in Code? | Reality |
|-------|---------------|---------|
| AI Adaptive Practice | **No** | No AI model calls found |
| AI Analytics/Reports | **No** | Standard SQL aggregation (AVG, SUM, COUNT) with PHP math |
| AI Proctoring | **No** | No proctoring logic found in frontend |
| AI Question Generation | **No** | Questions created manually or imported |

**Verdict**: The "AI" features are purely statistical analytics (averages, completion rates, attempted rates) branded as AI. No external AI APIs (OpenAI, Gemini, Anthropic, etc.) are called. No machine learning models are referenced. No custom AI endpoints exist.

---

## 7. Database Schema (Inferred)

From SQL error leaks and front-end data binding:

### Core Tables
```sql
-- Users/RBAC
users (id, email, password, level, campus_id, course_id, class_id, section_id, status)
user_levels / roles

-- Academic Structure
courses (id, name, ct_id, status)
classes (id, class_id, class_name, course_id)
sections (id, section_id, section_name, class_id)
subjects (id, name, course_id, class_id, status, sort_order, is_olympiad)

-- Students
students (id, user_id, course_id, class_id, section_id, academic_year_id, ...)
admissions / candidates

-- Staff
staff (id, user_id, department_id, designation_id, employee_type_id, shift_id, ...)
departments, designations, employee_types, shifts
leave_types, staff_leaves, leave_balances

-- Attendance
attendance (id, student_id, class_id, date, status, ...)
attendance_criteria, working_days, holidays

-- Fees
fees_master, fees_structure, fee_installments
fee_collections, fee_transactions, fee_concessions
fee_dues, fee_overdues

-- Finance
income, expenses, expense_approvals, ledger_accounts

-- Exams / Tests
tests (id, title, course_id, class_id, section_id, start_date, end_date, start_time, end_time, 
       testSize, testTime, marks_per_question, negativeMarks, is_jumbling, testType, 
       common_paper, is_jee_new_pattern, is_neet_new_pattern, source_type, 
       UserTestPause, test_mode, subject_id, nav_tab_visibility, status)
question_papers (id, test_id, ...)
test_templates

-- Questions / Question Bank
questions (id, category_id, subject_id, chapter_id, topic_id, question_text, 
           question_type, options, correct_answer, marks, difficulty, status)
categories, chapters, topics, sub_topics

-- Resources / Content
resources (id, title, type, file_path, course_id, class_id, subject_id, ...)
documents (id, title, ocr_text, file_path, ...)

-- Gradebook
gradebook_structures, gradebook_management, gradebook_templates

-- Classwork / Timetable
classwork, homework, scheduler_events
class_sections, periods

-- Notifications
notifications, notification_types, notification_settings, notification_templates
notification_queue (whatsapp, email, sms)

-- Leads / Enquiries
leads, lead_assignments, counsellor_actions

-- Campus / Multi-tenant
campuses (id, name, ...)
academic_years (id, name, start_date, end_date, is_current)

-- Analytics (pre-calculated)
institutional_analytics (summary data, pre-aggregated)
```

### Data Flow
```
Browser (AngularJS) 
  → POST (form-urlencoded) 
  → PHP Service (api/*.php or direct .php) 
  → MySQL 
  → JSON response 
  → AngularJS $scope binding
```

---

## 8. Security Analysis

### 8.1 HTTP Security Headers (Missing)
| Header | Status | Risk |
|--------|--------|------|
| `Content-Security-Policy` | ❌ Missing | XSS |
| `X-Frame-Options` | ❌ Missing (JS frame-busting instead) | Clickjacking |
| `X-Content-Type-Options` | ❌ Missing | MIME sniffing |
| `Strict-Transport-Security` | ❌ Missing | MITM downgrade |
| `Referrer-Policy` | ❌ Missing | Referer leak |
| `Permissions-Policy` | ❌ Missing | Feature misuse |

### 8.2 Vulnerabilities Found
1. **SQL Injection** — API returns full MySQL error with query text in HTTP response (e.g., `SELECT * FROM subjects WHERE course_id= AND FIND_IN_SET(,class_id)`)
2. **AngularJS 1.x (old)** — Known CVEs for Angular 1.4.9 and 0.11.0
3. **No CSRF Protection** — No anti-CSRF tokens detected
4. **Session Security** — `PHPSESSID` cookie lacks `Secure` and `HttpOnly` flags in initial response
5. **No Rate Limiting** visible on login endpoint
6. **Server Banner Leak** — Apache version exposed in 403 responses
7. **Verbose Error Messages** — SQL queries leaked to clients

### 8.3 Authentication
```
POST /dologin.php
  email=<email>
  password=<password>
  → Content-Type: application/x-www-form-urlencoded
  → Response: { "error": false, "message": "Success", "default_dashboard": "levelone-manager-dashboard", "is_redirect": false }
  → Session: PHPSESSID cookie (set by server)
  → No JWT, no API tokens, no OAuth
```

---

## 9. Key Observations

1. **No Mobile App** — Despite claims, no dedicated mobile app exists (confirmed by SoftwareFinder review)
2. **No WebSocket** — No real-time features (polling-based updates)
3. **No RESTful API** — Uses JSON-over-HTTP-POST with action parameters
4. **Flat PHP** — No MVC framework (no Laravel, Symfony, CodeIgniter)
5. **AngularJS + jQuery Hybrid** — Unusual combination, suggests iterative development over time
6. **Metronic Theme** — Commercial Bootstrap 5 template from keen-themes.io
7. **Multi-tenant** — Campus-based isolation via `campus_id` parameter
8. **OCR Support** — Document management with OCR (likely Tesseract or similar)
9. **No Cache Layer** — No Redis/Memcached evidence
10. **AWS Hosted** — Application Load Balancer with sticky sessions

---

## 10. Integration Points

| Integration | Type | Details |
|-------------|------|---------|
| Zoom | SDK | Live classes via `join-live-class-z` |
| Google Meet | SDK | Live classes via `join_live_class_g.php` |
| Microsoft Teams | SDK | Live classes via `join_live_class_t.php` |
| WhatsApp | Notification | Automated alerts/notifications |
| SMS | Notification | Bulk SMS gateway |
| Email | Notification | SMTP/PHP mail |
| Biometric/RFID | Hardware | Attendance integration |
| OMR | Scanning | Optical mark recognition for offline exams |
| ERP (3rd party) | Integration | Claims ERP integration capability |
