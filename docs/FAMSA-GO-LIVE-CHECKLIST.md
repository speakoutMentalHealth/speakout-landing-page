
# SpeakOut FAMSA Pilot Go-Live Checklist

## 1. Upload Required Files

Upload these bundles/files to GitHub:

- setup/famsa/index.html
- css/famsa-activation.css
- js/famsa-activation.js
- dashboards/school/
- css/school-portal.css
- js/school-portal.js
- learning/
- css/learning-platform.css
- js/learning-platform.js
- auth/auth.html
- js/auth.js
- js/auth-guard.js
- js/firebase-config.js

## 2. Add Activation Button to FAMSA Page

Add the CTA snippet to:

famsas-mental-health-club.html

Button should point to:

setup/famsa/

Final public URL:

https://speakoutmentalhealth.org/setup/famsa/

## 3. Fix Auth Guard

Make sure auth-guard.js checks:

status === "approved"

Do not require:

approved === true

unless you add that field to every user.

## 4. Firestore Requirements

User document for school admin must include:

role: "school_admin"
status: "approved"
schoolName: "FAMSA College of Health Science and Technology"
schoolCode: "FAMSA001"

School document should exist at:

schools/FAMSA001

## 5. Test FAMSA Flow

Test this exact flow:

1. Open https://speakoutmentalhealth.org/famsas-mental-health-club.html
2. Click Activate FAMSA School Portal
3. Create school administrator account
4. Complete or skip wizard steps
5. Click Save & Open Dashboard
6. Confirm redirect to dashboards/school/index.html
7. Confirm school dashboard does not kick user back to login
8. Click Resources
9. Click Courses
10. Logout and login again through auth/auth.html

## 6. Minimum Demo-Ready Standard

Before FAMSA reviews:

- No broken navigation
- School dashboard loads
- Resources page opens
- Courses page opens
- Activation wizard creates user
- User stays logged in
- Logo displays correctly
- Mobile view is acceptable
- FAMSA page has activation CTA

## 7. What Can Wait

Do not delay launch for:

- Full student import
- Full teacher import
- Parent accounts
- Complete certificate automation
- Final premium course library
- PDF report exports
- Advanced analytics

Those can roll out after activation.
