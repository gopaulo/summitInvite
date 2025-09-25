Develop a secure, scalable invite system for The Summit 25 event using PHP (compatible with legacy systems), MySQL, and modern CSS3. All core flows must match the exclusivity, branding, and communication cadence outlined below. The system must send all transactional emails through Brevo (formerly Sendinblue) using provided API credentials and modular HTML templates.

***

### **1. User Experience & Registration Flow**

- **Landing Page:**
  - No open registration. Main CTAs: “Enter Your Invitation Code” and “Join the Waitlist.”
  - Invite code form unlocks registration if valid; ineligible codes show a clear message and guidance.
  - Waitlist form collects name, email, role, company name/size, LinkedIn, motivation—store for prioritization.

- **Invitation System:**
  - Each attendee receives a unique code (they get several, e.g., 5, to invite peers).
  - Codes are single-use, traceable (who invited whom), and can expire.
  - Admins can release codes manually or in batches (for moving people from the waitlist or for partners).

***

### **2. Database Schema**

- **users**: user and status info.
- **invitation_codes**: code itself, assigned/used by whom, status, and timestamps.
- **waitlist**: user_id mapped, scoring, notes, promotion status.
- **email_logs**: all send activity for auditing/troubleshooting.

(Refer to previous response for schema.)

***

### **3. Brand Identity Implementation**

- Apply these colors in all branding and email styling (CSS variables recommended):
  - Primary dark: #2C3E50
  - Deep blue: #34495E
  - Accent blue: #5DADE2
  - Silver/metal: #BDC3C7
  - White: #FFFFFF
- Typography: Modern, clean sans-serif.
- Use provided logo and mountain imagery as in attached files.
- All frontend components must be responsive and visually polished, keeping the premium/exclusive feel.

***

### **4. Email System (Brevo API, HTML Templates)**

- Use the Brevo transactional email REST API.
- Store API key and sender info using Replit secrets, not directly in code.
  - Sender: info@thesummit25.com ("The Summit 25")
- Modular HTML templates for:
  - Invitation
  - Waitlist confirmation
  - Waitlist promotion
  - Registration confirmation
  - Referral invitation
  - Event reminders
- Templates should use `{{variable}}` syntax for replacements.
- Email handler must allow easy swapping of templates and variables.

(See previous PHP handler and template instructions.)

***

### **5. Referral Tracking & Admin**

- Visualize invite trees/referral chains in the admin dashboard.
- Export user, invite, and waitlist lists as CSV.
- Adjust code parameters / resend invites easily from the admin panel.
- Waitlist scoring: auto-assign numeric “priority” score based on form data; admins can override/annotate.

***

### **6. Security & Reliability**

- Enforce single-use, hard-to-guess codes.
- Rate-limit code submissions; log failed attempts.
- CAPTCHA on waitlist form to prevent spam.
- All database/data access via prepared statements.
- Sessions secured and managed appropriately.

***

### **7. Implementation Guidance**

- Build code modularly for easy updates, especially for CSS, email templates, and referral rules.
- Comment code clearly so business logic, branding, and Brevo integration points are obvious.
- Test code handling for all key journeys: code entry, waitlist, promotion, referral, and email flows.
- Use real brand assets/colors (see attached files and color palette).
- Set system so that replacing an email template (in `/email_templates/`) updates all sends of that type.

***

### **8. Sample Usage**

- When a code is used for registration:
  - Mark as used, map inviter and new user, send "registration confirmation."
  - Auto-generate N invite codes for the new attendee and email them.
- When admin promotes a user from waitlist:
  - Assign a code, send "waitlist promotion" email.
- When invite is sent (referral or direct):
  - Send "invitation" or "referral invitation" with brand template.

***

**All branding guidance, database design, security precautions, and email messaging outlined above are strictly required.  
If anything here is unclear, request clarification before implementation.**

Attachments:  
- Brand visuals and color palette  
- PDF of landing page  
- Logo and imagery files  
- Invite-system-instructions.md

***
