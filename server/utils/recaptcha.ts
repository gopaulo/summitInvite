/**
 * reCAPTCHA v3 verification utility
 */

interface RecaptchaVerificationResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyRecaptcha(token: string, expectedAction: string): Promise<{
  isValid: boolean;
  score?: number;
  error?: string;
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('reCAPTCHA secret key not found in environment variables');
    return { isValid: false, error: 'reCAPTCHA configuration error' };
  }

  if (!token) {
    return { isValid: false, error: 'reCAPTCHA token is required' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data: RecaptchaVerificationResponse = await response.json();

    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']);
      return { 
        isValid: false, 
        error: 'reCAPTCHA verification failed' 
      };
    }

    // Check if action matches (optional but recommended)
    if (data.action !== expectedAction) {
      console.warn(`reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${data.action}`);
    }

    // For reCAPTCHA v3, check the score (0.0-1.0, higher is better)
    // Typical threshold is 0.5, but you can adjust based on your needs
    const score = data.score || 0;
    const minScore = 0.5;
    
    if (score < minScore) {
      console.warn(`reCAPTCHA score too low: ${score} (minimum: ${minScore})`);
      return { 
        isValid: false, 
        score, 
        error: 'reCAPTCHA score too low' 
      };
    }

    return { 
      isValid: true, 
      score 
    };

  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { 
      isValid: false, 
      error: 'reCAPTCHA verification service error' 
    };
  }
}