require('dotenv').config();

console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASS exists:', !!process.env.SMTP_PASS);
console.log('SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
console.log('--- Resend Variables ---');
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('RESEND_API_KEY starts with re_:', process.env.RESEND_API_KEY?.startsWith('re_'));
console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
console.log('RESEND_FROM_NAME:', process.env.RESEND_FROM_NAME);
