
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth } from "../firebase.ts";
import { dbService } from "../services/dbService.ts";
import { UserRole } from "../types.ts";
import { Box, Lock, Mail, User, ArrowRight, Loader2, Sparkles, Store, Truck, Phone } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.RETAILER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: username });

        await dbService.createUserProfile({
          uid: user.uid,
          username,
          email,
          role,
          businessName: businessName || username,
          phoneNumber: phoneNumber || ''
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-emerald-600 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Box size={28} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight">SmartStock <span className="text-indigo-400">AI</span></span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            Intelligent Inventory <br /> 
            <span className="text-indigo-400">For Retail & Supply.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-md">
            Whether you're running a shop or managing a warehouse, predict demand and optimize supply with ease.
          </p>
        </div>

        <div className="relative z-10 bg-slate-800/50 backdrop-blur-md border border-slate-700 p-6 rounded-2xl max-w-sm">
          <div className="flex items-center gap-2 mb-3">
             <Sparkles size={18} className="text-indigo-400" />
             <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Unified Supply Chain</span>
          </div>
          <p className="text-sm text-slate-300 italic">
            Connect retailers and suppliers on a single intelligent platform. Link your WhatsApp to get orders directly.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 py-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900">{isLogin ? 'Welcome Back' : 'Join SmartStock'}</h2>
            <p className="text-slate-500 mt-2">Enter your details to manage your business.</p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setRole(UserRole.RETAILER)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    role === UserRole.RETAILER ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Store size={24} className="mb-2" />
                  <span className="text-xs font-bold">Retailer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole(UserRole.SUPPLIER)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                    role === UserRole.SUPPLIER ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Truck size={24} className="mb-2" />
                  <span className="text-xs font-bold">Supplier</span>
                </button>
              </div>
            )}

            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. johndoe" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Business Name</label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Metro Grocery" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">WhatsApp Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="tel" 
                      placeholder="+1234567890" 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  type="email" 
                  placeholder="name@company.com" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  required
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : `Register as ${role === UserRole.RETAILER ? 'Retailer' : 'Supplier'}`}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
