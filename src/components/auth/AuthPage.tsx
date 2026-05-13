import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-500/5 rounded-full blur-3xl" />
      
      {isLogin ? (
        <LoginForm onToggleForm={() => setIsLogin(false)} onSuccess={() => {}} />
      ) : (
        <SignupForm onToggleForm={() => setIsLogin(true)} />
      )}
    </div>
  );
};
