import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Key, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('请输入邮箱地址');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setSuccess(response.data.message);
      
      // 在开发环境下，如果返回了验证码，显示它
      if (response.data.code) {
        console.log('验证码（开发环境）:', response.data.code);
        alert(`验证码（开发环境）: ${response.data.code}`);
      }
      
      setStep('verify');
      
      // 开始60秒倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('新密码长度至少为6个字符');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/auth/reset-password', {
        email,
        code,
        newPassword
      });
      setSuccess(response.data.message);
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || '密码重置失败');
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const handleResendCode = () => {
    setStep('email');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 返回登录 */}
        <div className="mb-6">
          <Link 
            to="/login" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回登录
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 图标和标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <Key className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 'email' ? '忘记密码' : '重置密码'}
            </h2>
            <p className="text-gray-600">
              {step === 'email' 
                ? '请输入您的注册邮箱，我们将发送验证码' 
                : '请输入验证码和新密码'
              }
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}

          {/* 步骤1：输入邮箱 */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline h-4 w-4 mr-1" />
                  邮箱地址
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="请输入注册邮箱"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '发送中...' : '发送验证码'}
              </button>
            </form>
          )}

          {/* 步骤2：验证码和新密码 */}
          {step === 'verify' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="inline h-4 w-4 mr-1" />
                  验证码
                </label>
                <div className="flex gap-2">
                  <input
                    id="code"
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  验证码已发送到 {email}
                  {countdown > 0 ? (
                    <span className="ml-2 text-blue-600">({countdown}秒后可重新发送)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="ml-2 text-blue-600 hover:text-blue-700"
                    >
                      重新发送
                    </button>
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  新密码
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="至少6个字符"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  确认新密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="再次输入新密码"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '重置中...' : '重置密码'}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                className="w-full text-sm text-gray-600 hover:text-gray-900"
              >
                使用其他邮箱
              </button>
            </form>
          )}

          {/* 安全提示 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>🛡️ 安全提示：</strong>
            </p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>验证码15分钟内有效</li>
              <li>最多可尝试输入5次</li>
              <li>请勿将验证码透露给他人</li>
            </ul>
          </div>
        </div>

        {/* 页脚 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          还没有账号？
          <Link to="/register" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

