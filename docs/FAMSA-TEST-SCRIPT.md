
# FAMSA Pilot Test Script

## Test A — Public Page

Open:
https://speakoutmentalhealth.org/famsas-mental-health-club.html

Confirm:
- Page loads
- Activation button is visible
- Activation button opens https://speakoutmentalhealth.org/setup/famsa/

## Test B — School Activation

Use a fresh email address.

Enter:
- Administrator full name
- Position
- Email
- Phone
- Password
- Confirm password

Click:
Create Admin & Continue

Expected:
- User is created in Firebase Auth
- Firestore user document is created
- Role is school_admin
- Status is approved

## Test C — Wizard

- Fill or skip setup steps
- Select departments
- Select levels
- Select modules
- Click Save & Open Dashboard

Expected:
- School document updates under schools/FAMSA001
- Redirects to school dashboard

## Test D — Dashboard Access

Expected:
- Dashboard opens
- User is not redirected back to auth page
- School name displays or fallback displays
- Navigation works

## Test E — Shared Learning

From school dashboard:

- Open Resources
- Open Courses

Expected:
- Both pages load
- If Firestore is empty or blocked, demo fallback cards appear
- No visible error message should scare the user

## Test F — Re-login

- Logout
- Login through auth/auth.html using the same school admin account

Expected:
- Redirects to dashboards/school/index.html
