/**
 * 验证码管理工具
 * 用于密码重置功能
 */

interface VerificationCode {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

// 使用内存存储验证码（重启服务器会清空）
const verificationCodes = new Map<string, VerificationCode>();

// 验证码有效期（15分钟）
const CODE_EXPIRY_TIME = 15 * 60 * 1000;

// 最大尝试次数
const MAX_ATTEMPTS = 5;

// 生成6位数字验证码
export const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 保存验证码
export const saveVerificationCode = (email: string, code: string): void => {
  const normalizedEmail = email.toLowerCase().trim();
  verificationCodes.set(normalizedEmail, {
    email: normalizedEmail,
    code,
    expiresAt: Date.now() + CODE_EXPIRY_TIME,
    attempts: 0
  });
};

// 验证验证码
export const verifyCode = (email: string, code: string): { valid: boolean; message?: string } => {
  const normalizedEmail = email.toLowerCase().trim();
  const stored = verificationCodes.get(normalizedEmail);

  if (!stored) {
    return { valid: false, message: '验证码不存在或已过期' };
  }

  // 检查是否过期
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(normalizedEmail);
    return { valid: false, message: '验证码已过期，请重新获取' };
  }

  // 检查尝试次数
  if (stored.attempts >= MAX_ATTEMPTS) {
    verificationCodes.delete(normalizedEmail);
    return { valid: false, message: '验证码尝试次数过多，请重新获取' };
  }

  // 增加尝试次数
  stored.attempts++;

  // 验证验证码
  if (stored.code !== code) {
    return { valid: false, message: `验证码错误，还剩 ${MAX_ATTEMPTS - stored.attempts} 次机会` };
  }

  // 验证成功，删除验证码
  verificationCodes.delete(normalizedEmail);
  return { valid: true };
};

// 清理过期的验证码（定期运行）
export const cleanupExpiredCodes = (): void => {
  const now = Date.now();
  for (const [email, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(email);
    }
  }
};

// 每5分钟清理一次过期验证码
setInterval(cleanupExpiredCodes, 5 * 60 * 1000);

