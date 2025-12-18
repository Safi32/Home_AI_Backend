// In-memory store for OTPs
const otpStore = new Map();

// Default OTP expiry time in minutes
const OTP_EXPIRY_MINUTES = 10;

/**
 * Cleans up expired OTPs from the store
 */
const cleanupExpiredOtps = () => {
  const now = new Date();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
};

// Set up cleanup interval (runs every 5 minutes)
setInterval(cleanupExpiredOtps, 5 * 60 * 1000);

module.exports = {
  otpStore,
  OTP_EXPIRY_MINUTES
};
