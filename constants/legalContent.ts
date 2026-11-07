// Privacy Policy and Terms shown inside the app (Android and iOS).
// Same text as www.edurain.in/privacy and www.edurain.in/terms (Last Updated: November 4, 2026).
// When the website text changes, update this file too so the app and the website say the same thing.

export type LegalSeg = { t: string; b?: boolean; href?: string };
export type LegalBlock = { type: 'h2' | 'h3' | 'h4' | 'p' | 'li'; segs: LegalSeg[]; n?: number };
export interface LegalDoc {
  title: string;
  updated: string;
  blocks: LegalBlock[];
}

export const PRIVACY_DOC: LegalDoc = {
  "title": "Privacy Policy",
  "updated": "Last Updated: November 4, 2026 | Applies to the EduRain website, web app and the EduRain apps for Android and iOS",
  "blocks": [
    {
      "type": "p",
      "segs": [
        {
          "t": "Please read this Privacy Policy before using the services of "
        },
        {
          "t": "EduRain (OPC) Private Limited",
          "b": true
        },
        {
          "t": " (\"EduRain\", \"We\", \"Us\" or \"Our\"). It applies to our website "
        },
        {
          "t": "https://edurain.in",
          "href": "https://edurain.in"
        },
        {
          "t": ", the EduRain web app at "
        },
        {
          "t": "www.edurain.in/webapp",
          "href": "https://www.edurain.in/webapp"
        },
        {
          "t": ", and the "
        },
        {
          "t": "EduRain mobile app",
          "b": true
        },
        {
          "t": " on Google Play and the Apple App Store. Together these are called the "
        },
        {
          "t": "\"Platform\"",
          "b": true
        },
        {
          "t": ". The same batches, study material, tests and account work on all of them."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "By creating an account, using the Platform or giving Us Your information, You agree that We may collect and use it as described here. If You do not agree, please do not use the Platform. We may update this Policy from time to time; the date at the top shows the latest version, and for important changes We will also tell You in the app or by email."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "In short:",
          "b": true
        },
        {
          "t": " We collect what We need to run Your classes, tests and account. We do not sell Your personal data, We do not show third-party ads, and the app does not use advertising SDKs or Your advertising ID. This Policy follows the Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000 and the rules made under them."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "1. Information We Collect"
        }
      ]
    },
    {
      "type": "h3",
      "segs": [
        {
          "t": "1.1 Information You give Us"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Account details:",
          "b": true
        },
        {
          "t": " name, mobile number (verified by OTP), email address and, if You sign in with one, a password. Passwords are handled by Google Firebase Authentication; EduRain never stores Your password in readable form."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Profile details:",
          "b": true
        },
        {
          "t": " class or target exam (for example IIT-JEE, NEET, Foundation, Class 6th–12th), gender, city, state, pincode, address and a profile photo. Everything except name, mobile number and class/exam is optional."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "What You send Us:",
          "b": true
        },
        {
          "t": " doubts (text and any photo You attach), questions You type into EduAI Tutor, answers You report, feedback, and messages You send through the contact form, email or WhatsApp."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Purchase details:",
          "b": true
        },
        {
          "t": " when You buy a batch, We keep the batch, amount, coupon used, date, payment status and payment reference number, and Your name, phone, email, city and state for the GST invoice. We do "
        },
        {
          "t": "not",
          "b": true
        },
        {
          "t": " receive or store Your card number, CVV, expiry date, UPI PIN or net banking password."
        }
      ]
    },
    {
      "type": "h3",
      "segs": [
        {
          "t": "1.2 Information collected when You use the Platform"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Study activity:",
          "b": true
        },
        {
          "t": " batches You are enrolled in, study material You open and how far You got, test answers, marks and rank, live class attendance, and mentorship sessions You book. Bookmarks and study history may also be saved on Your device."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Device and technical data:",
          "b": true
        },
        {
          "t": " IP address, device and browser type, operating system, app version, time of each request and error messages, used to keep the service working and secure."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Notification token:",
          "b": true
        },
        {
          "t": " if You allow notifications, a device token so We can send You alerts."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Cookies:",
          "b": true
        },
        {
          "t": " our website and web app use cookies and similar browser storage. See section 3."
        }
      ]
    },
    {
      "type": "h3",
      "segs": [
        {
          "t": "1.3 App permissions"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "The app asks for a permission only when You use the feature that needs it, and You can turn it off any time in Your phone settings:"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Camera:",
          "b": true
        },
        {
          "t": " only when You choose to take a photo for a doubt or Your profile picture. It is never used in the background."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Photos:",
          "b": true
        },
        {
          "t": " only when You pick a photo for a doubt or Your profile picture. On Android 13 and newer the system photo picker is used, so the app receives only the photo You pick."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Notifications:",
          "b": true
        },
        {
          "t": " for live class reminders, new study material, test results, doubt answers and important announcements."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "The app does "
        },
        {
          "t": "not",
          "b": true
        },
        {
          "t": " ask for Your location, microphone or contacts. Live classes and mentorship sessions run on Google Meet, which asks for its own permissions under Google's privacy policy."
        }
      ]
    },
    {
      "type": "h3",
      "segs": [
        {
          "t": "1.4 Information You choose not to give"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "We mark which details are required. You may choose not to give any information, but without the required details (such as a verified mobile number) We cannot create Your account or provide that service. You can browse the public pages of our website without telling Us who You are."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "2. How We Use Your Information"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To create and secure Your account, verify Your mobile number and keep You signed in."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To give You the batches You are enrolled in: study material, live classes, tests, results, doubt answers, mentorship and EduAI Tutor."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To send You service messages by SMS, email or push notification (class timings, results and account updates)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To send You news about new batches and offers. You can opt out of these at any time (see section 9)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To answer Your questions and complaints and resolve disputes."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To find and fix errors, prevent fraud, misuse and repeated failed logins, and enforce our "
        },
        {
          "t": "Terms & Conditions",
          "href": "/terms"
        },
        {
          "t": "."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To improve the Platform using combined statistics (for example, which material is opened most), which do not identify You."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "To process Your payments and coupons, issue invoices and keep the records that Indian law requires."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "3. Cookies and Similar Technologies"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Cookies are small files that a website saves in Your browser. We also use similar browser storage (such as local storage). Our website and web app use them as follows:"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Essential:",
          "b": true
        },
        {
          "t": " to keep You signed in, remember Your choices (such as Your class or exam) and protect the site from attacks and misuse. Without these, signing in and some features will not work."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Analytics:",
          "b": true
        },
        {
          "t": " Google Analytics cookies (such as _ga) count visits and show which pages are used, so We can improve the website. They do not give Us Your name, email or mobile number."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Third-party cookies:",
          "b": true
        },
        {
          "t": " pages that show content or services from other companies (for example Google) may let those companies set their own cookies. We do not control them; their own privacy policies apply."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "We do "
        },
        {
          "t": "not",
          "b": true
        },
        {
          "t": " use advertising cookies, and We do not use cookies to show You ads."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Your choice:",
          "b": true
        },
        {
          "t": " You can block or delete cookies in Your browser settings at any time. You can also stop Google Analytics with Google's opt-out add-on: "
        },
        {
          "t": "tools.google.com/dlpage/gaoptout",
          "href": "https://tools.google.com/dlpage/gaoptout"
        },
        {
          "t": ". If You block essential cookies, You may not be able to stay signed in."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "The EduRain mobile app does not use cookies to track You. Pages opened inside the app may use the cookies they need to work."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "4. Sharing Your Information"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "We do not sell, rent or trade Your personal data.",
          "b": true
        },
        {
          "t": " We share it only with the service providers below, only for the purpose stated, and they may use it only to provide their service to Us:"
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "Hosting & delivery (Amazon Web Services, Bunny.net, Cloudflare)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Your account data is stored on Amazon Web Services in Mumbai (ap-south-1). Study material and profile photos are delivered through Amazon CloudFront and Bunny.net. Our web app is delivered and protected from attacks by Cloudflare."
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "Payments (payment service providers)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Payments are processed by RBI-authorised payment service providers. Your card, UPI or bank details are entered directly with them and never reach EduRain. They send Us only the payment status and reference number."
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "OTP, SMS & email (MSG91)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Your mobile number and email address are shared with MSG91 to send OTPs and account messages, under TRAI DLT rules."
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "Sign-in, notifications & contact forms (Google Firebase, Expo)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Sign-in uses Google Firebase Authentication. Messages from our website contact form are stored in Google Firebase. Push notifications are delivered through Expo and Firebase Cloud Messaging using Your device token."
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "EduAI Tutor (Google Gemini API)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Questions You type into EduAI Tutor are sent to Google's Gemini API to generate an answer, without Your name, email or mobile number. Please do not type personal details into EduAI. Answers You report are saved so our team can review them."
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "Live classes & 1:1 mentor sessions (Google Meet)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Live classes and 1:1 mentor sessions are held on Google Meet. When You join, Google processes Your participation under its own privacy policy."
        }
      ]
    },
    {
      "type": "h4",
      "segs": [
        {
          "t": "Website analytics (Google Analytics)"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Our website uses Google Analytics to measure visits. Google receives technical data such as pages viewed, device and browser type, and an approximate location derived from the IP address."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Some of these providers, such as Google and Expo, may process data on servers outside India."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "We may also share information:"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "When the law requires it:",
          "b": true
        },
        {
          "t": " with courts, police, tax and other government authorities in response to a valid legal request, or when We believe in good faith it is needed to protect the rights, property or safety of EduRain, our students or the public."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "If our business changes hands:",
          "b": true
        },
        {
          "t": " if EduRain merges with, is acquired by, or transfers its business to another company, Your information may be transferred to it, and it must continue to protect Your information as this Policy says."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "As combined statistics:",
          "b": true
        },
        {
          "t": " figures that do not identify any student, for example the number of students in a batch."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "5. Children's Privacy"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Many of our students are under 18. Under the DPDP Act, a parent or legal guardian must agree before a student under 18 creates an account or buys a batch; by doing so, the student confirms that their parent or guardian has agreed. A parent or guardian can contact us at "
        },
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in"
        },
        {
          "t": " to see, correct or delete their child's data."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "We do not track children's behaviour for advertising, do not profile them for ads and do not show them targeted advertising."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "6. How Long We Keep Your Information"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Account, profile and study data: while Your account is active. After You delete Your account, it is deleted within 30 days."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Records the law requires Us to keep (for example, for tax): as long as the law requires, even after the account is deleted."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Server logs and security records: only as long as needed for security, fixing problems and legal requirements."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Contact form messages and support emails: as long as needed to answer You, or until You ask Us to delete them."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "7. Delete Your Account and Data"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "You can delete Your EduRain account and personal data at any time, in either of these ways:"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "In the app:",
          "b": true
        },
        {
          "t": " open the EduRain app → Profile → "
        },
        {
          "t": "Delete Account & Data",
          "b": true
        },
        {
          "t": " → confirm."
        }
      ],
      "n": 1
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "By email (no app needed):",
          "b": true
        },
        {
          "t": " email "
        },
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in?subject=Account%20Deletion%20Request"
        },
        {
          "t": " from Your registered email address, or mention Your registered mobile number, with the subject "
        },
        {
          "t": "\"Account Deletion Request\"",
          "b": true
        },
        {
          "t": "."
        }
      ],
      "n": 2
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Your profile, photos, doubts, study history and device tokens are deleted within 30 days. Records the law requires Us to keep are kept only as long as the law requires. Deleting Your account ends Your access to Your batches."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "8. Keeping Your Information Safe"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "All data between Your device and our servers is sent over encrypted connections (HTTPS/TLS)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Your data is stored on secured servers, and only authorised EduRain team members who need it for their work can access it."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Card, UPI and bank details are handled only by our payment service providers and never reach our servers."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "If a data breach affects You, We will inform You and the authorities as the DPDP Act and CERT-In rules require."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Your part:",
          "b": true
        },
        {
          "t": " keep Your OTP and password secret and do not let anyone else use Your account. If You think someone else has used it, email "
        },
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in"
        },
        {
          "t": " right away. You are responsible for what is done through Your account until You tell Us."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "9. Your Rights and Choices"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "See and correct:",
          "b": true
        },
        {
          "t": " You can see and edit most of Your details in Profile, or ask Us for a summary of the personal data We hold about You."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Delete:",
          "b": true
        },
        {
          "t": " see section 7."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Withdraw consent:",
          "b": true
        },
        {
          "t": " You can withdraw Your consent at any time by deleting Your account or emailing Us. This does not affect what was done before You withdrew it."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Nominate:",
          "b": true
        },
        {
          "t": " You can nominate a person to use these rights for You if You die or become unable to."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Stop promotional messages:",
          "b": true
        },
        {
          "t": " email "
        },
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in"
        },
        {
          "t": " to stop offers and news. You will still get service messages about Your account and classes. You can turn off push notifications in Your phone settings."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Complain:",
          "b": true
        },
        {
          "t": " contact our Grievance Officer (section 10). If You are not satisfied with the answer, You may complain to the Data Protection Board of India."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "10. Grievance Officer"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Name:",
          "b": true
        },
        {
          "t": " Manoj Kumar"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Designation:",
          "b": true
        },
        {
          "t": " Head of Compliance & Grievance Officer, EduRain (OPC) Private Limited"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Email:",
          "b": true
        },
        {
          "t": " "
        },
        {
          "t": "info@edurain.in",
          "href": "mailto:info@edurain.in"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Address:",
          "b": true
        },
        {
          "t": " EduRain (OPC) Private Limited, Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "We acknowledge complaints within 24 hours and aim to resolve them within 15 days."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "11. Contact Us"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "EduRain (OPC) Private Limited",
          "b": true
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "https://edurain.in",
          "href": "https://edurain.in"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "+91 8796443910",
          "href": "tel:+918796443910"
        },
        {
          "t": " | "
        },
        {
          "t": " WhatsApp",
          "href": "https://wa.me/918796443910"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Sector 132, Urbtech, Expressway, Noida, UP, India"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "This Policy is read together with our "
        },
        {
          "t": "Terms & Conditions",
          "href": "/terms"
        },
        {
          "t": " and "
        },
        {
          "t": "Refund Policy",
          "href": "/refund-policy"
        },
        {
          "t": "."
        }
      ]
    }
  ]
};

export const TERMS_DOC: LegalDoc = {
  "title": "Terms and Conditions – EduRain",
  "updated": "Last Updated: November 4, 2026 | Governing Website, Mobile Applications & Online Batches",
  "blocks": [
    {
      "type": "p",
      "segs": [
        {
          "t": "Welcome to "
        },
        {
          "t": "EduRain",
          "b": true
        },
        {
          "t": " (\"EduRain\", \"We\", \"Us\", \"Our\"), accessible at "
        },
        {
          "t": "https://edurain.in",
          "href": "https://edurain.in"
        },
        {
          "t": ", along with our official mobile application(s) distributed on Google Play and Apple App Store, and all affiliated digital learning services (collectively, the \"Platform\")."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "These Terms and Conditions (\"Terms\") constitute a legally binding agreement between you (\"User\", \"Student\", \"Parent/Guardian\", \"You\") and EduRain (OPC) Private Limited. By registering an account, purchasing a batch, downloading study material, or using any service on the Platform, You confirm that You have read, understood, and agreed to these Terms and our "
        },
        {
          "t": "Privacy Policy",
          "href": "/privacy"
        },
        {
          "t": "."
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Notice for Parents and Guardians:",
          "b": true
        },
        {
          "t": " If a student using the EduRain Platform is under 18 years of age (minor), registration and purchases must be executed or authorized by a parent or legal guardian. The parent or guardian assumes full legal responsibility for compliance with these Terms."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "1. Our Services"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Live classes:",
          "b": true
        },
        {
          "t": " online classes taught live by EduRain teachers on the schedule shown for Your batch."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "1:1 mentor sessions:",
          "b": true
        },
        {
          "t": " one-on-one guidance sessions with an EduRain mentor, where Your batch or plan includes them."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Study material:",
          "b": true
        },
        {
          "t": " PDF notes, DPPs and other material for Your batch."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Tests:",
          "b": true
        },
        {
          "t": " practice tests and mock test series with results."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Doubt solving:",
          "b": true
        },
        {
          "t": " doubts You send are answered by our teachers."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "EduAI Tutor:",
          "b": true
        },
        {
          "t": " an AI study assistant for enrolled students (see section 8)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "The batch page shows what each batch includes."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "2. Eligibility & Account Security"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Users must provide accurate, verifiable information during signup (Full Name, active Mobile Number, Email, Target Exam/Grade, State)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Accounts are issued strictly for single, personal, non-commercial educational use. Simultaneous multi-device logins or credential sharing is prohibited."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "You are solely responsible for maintaining the confidentiality of your login OTPs, passwords, and active session tokens."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "3. Transparent Pricing, Purchases & Refund Policy"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Batch Validity:",
          "b": true
        },
        {
          "t": " Unless explicitly stated otherwise, fee payments for NEET, JEE, or Foundation courses grant digital access for the duration of that specific academic session (concluding with the respective final board/entrance examination)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "One Account, Every Device:",
          "b": true
        },
        {
          "t": " A course You buy is linked to Your EduRain account and can be used both on our website ("
        },
        {
          "t": "www.edurain.in/webapp",
          "href": "/webapp/"
        },
        {
          "t": ") and in the EduRain mobile app."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "No Hidden Auto-Renewals:",
          "b": true
        },
        {
          "t": " EduRain course purchases are one-time payments for the designated academic validity. There are no recurring auto-debits without explicit prior consumer consent."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Refund & Course Switch:",
          "b": true
        },
        {
          "t": " Due to immediate activation of intellectual property (study material, DPPs, test series), digital courses are non-refundable once activated. For wrong batch selections, students may request a batch switch within 7 days by contacting support. Read our full "
        },
        {
          "t": "Refund & Cancellation Policy",
          "href": "/refund-policy"
        },
        {
          "t": "."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "4. Live Classes & 1:1 Mentor Sessions"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Live classes and 1:1 mentor sessions are held online on Google Meet. The link is shared in the app or web app before the class or session starts. Google's own terms apply while You use Google Meet."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Class timings are shown for Your batch. If a class has to be moved or cancelled, We will tell You in the app and arrange a new time where possible."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "For a 1:1 mentor session, book a slot in the app. If You cannot attend, tell us before the session so it can be rescheduled, subject to the mentor's availability. A session You miss without telling us may not be rescheduled."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Join only with Your own account and do not share class or session links with anyone."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "5. Intellectual Property & Anti-Piracy Protection"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "All study material, PDF notes, DPPs, mock test series, graphics, software code, and educator content are the proprietary intellectual property of EduRain."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Strict Anti-Piracy Rule:",
          "b": true
        },
        {
          "t": " Screen recording, capturing live classes or study material, downloading DRM-protected files, redistributing notes on Telegram/WhatsApp channels, or reselling EduRain credentials is a criminal violation under the Indian Copyright Act, 1957."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "EduRain may use watermarking and other technical measures to protect its content. Accounts caught leaking content will be immediately terminated with permanent forfeiture of fees and reported to cybercrime authorities."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "6. Mobile App Hardware Permissions & Use"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "When using our Mobile Application on Android or iOS devices:"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Camera:",
          "b": true
        },
        {
          "t": " Used only when You choose to photograph a doubt question or take a profile picture. The camera is never used in the background."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Photos:",
          "b": true
        },
        {
          "t": " Used only to pick a photo for a doubt or Your profile picture. The app does not use the microphone."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Location:",
          "b": true
        },
        {
          "t": " The app does not use GPS or ask for location permission. The city/state in Your profile is used for invoices (GST)."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "7. In-App Account Deletion & Right to Erasure"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "In compliance with Apple App Store Guideline 5.1.1(v) and the Digital Personal Data Protection Act, users may delete their account at any time directly through the Mobile App ("
        },
        {
          "t": "Profile → \"Delete Account & Data\"",
          "b": true
        },
        {
          "t": ") or by writing to "
        },
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in"
        },
        {
          "t": ". Upon verification, active sessions and personal identifiers will be permanently expunged."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "8. Conduct, Doubts & User Content"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Be respectful in live classes, 1:1 mentor sessions and doubts. Abusive language, harassment, hate speech or advertising can lead to removal from a class or suspension of the account."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Doubts You send are seen by our teachers. Do not include phone numbers, passwords or other personal details in doubts or EduAI questions."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "EduAI Tutor:",
          "b": true
        },
        {
          "t": " EduAI answers are generated by artificial intelligence and can be wrong; check important answers with Your teachers. EduAI is available to students enrolled in a course, with a daily question limit. Use the \"Report\" button on any answer that is wrong or offensive; our team reviews every report."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Copyright Takedowns (DMCA / Indian Copyright Act):",
          "b": true
        },
        {
          "t": " If you believe any user-submitted question or content infringes your copyright, notify our Grievance Officer at "
        },
        {
          "t": "info@edurain.in",
          "href": "mailto:info@edurain.in"
        },
        {
          "t": " with copyright ownership evidence for prompt removal within 36 hours."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "9. No Guarantee of Results & Limitation of Liability"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "EduRain helps You prepare, but marks, ranks and selection depend on Your own effort. We do not guarantee any result in any exam."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "We try to keep the Platform available and the material correct, but there may be breaks for maintenance or problems beyond our control, such as internet or Google Meet outages."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "As far as the law allows, EduRain's total liability for any claim about a batch is limited to the fee You paid for that batch."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "10. Suspension, Termination & Changes to These Terms"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "We may suspend or close an account that breaks these Terms, for example by sharing the account or leaking content."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "You can stop using the Platform and delete Your account at any time (see section 7)."
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "We may update these Terms. The date at the top shows the latest version; for important changes We will also tell You in the app or by email. Using the Platform after a change means You accept the new Terms."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "11. Statutory Grievance Redressal & Governing Law"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "These Terms are governed by and construed under the laws of the Republic of India. In accordance with the Information Technology Act, 2000 and DPDP Act, 2023, the details of the designated "
        },
        {
          "t": "Grievance Redressal Officer",
          "b": true
        },
        {
          "t": " are:"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Officer Name:",
          "b": true
        },
        {
          "t": " Manoj Kumar"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Designation:",
          "b": true
        },
        {
          "t": " Grievance Redressal Officer, EduRain (OPC) Private Limited"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Email:",
          "b": true
        },
        {
          "t": " "
        },
        {
          "t": "info@edurain.in",
          "href": "mailto:info@edurain.in"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Registered Address:",
          "b": true
        },
        {
          "t": " Sector 132, Urbtech, Expressway, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201304, India"
        }
      ]
    },
    {
      "type": "p",
      "segs": [
        {
          "t": "Jurisdiction:",
          "b": true
        },
        {
          "t": " The courts at Noida / Gautam Buddha Nagar, Uttar Pradesh shall have exclusive jurisdiction over any legal dispute."
        }
      ]
    },
    {
      "type": "h2",
      "segs": [
        {
          "t": "12. Contact Support"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Website:",
          "b": true
        },
        {
          "t": " "
        },
        {
          "t": "https://edurain.in",
          "href": "https://edurain.in"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Support Email:",
          "b": true
        },
        {
          "t": " "
        },
        {
          "t": "support@edurain.in",
          "href": "mailto:support@edurain.in"
        }
      ]
    },
    {
      "type": "li",
      "segs": [
        {
          "t": "Helpline:",
          "b": true
        },
        {
          "t": " "
        },
        {
          "t": "+91 8796443910",
          "href": "tel:+918796443910"
        },
        {
          "t": " (Mon–Sat, 10:00 AM – 7:00 PM IST)"
        }
      ]
    }
  ]
};
