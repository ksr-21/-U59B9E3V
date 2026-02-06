
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { dbService } from '../services/dbService';
import { User, Store, Phone, Mail, Save, CheckCircle, Loader2, MessageCircle } from 'lucide-react';

interface ProfileSettingsProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, setProfile }) => {
  const [businessName, setBusinessName] = useState(profile.businessName);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);

    try {
      await dbService.updateUserProfile(profile.uid, {
        businessName,
        phoneNumber
      });
      setProfile({ ...profile, businessName, phoneNumber });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to update profile: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 p-8 text-white relative">
           <div className="relative z-10 flex items-center gap-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black">
                {profile.businessName.charAt(0)}
              </div>
              <div>
                 <h2 className="text-2xl font-bold">{profile.businessName}</h2>
                 <p className="text-slate-400 text-sm flex items-center gap-1">
                    <User size={14} /> @{profile.username} • {profile.role}
                 </p>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Store size={14} /> Business Name
              </label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Phone size={14} /> WhatsApp Link
              </label>
              <div className="relative">
                <input 
                  type="tel" 
                  placeholder="+1234567890"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium pr-10"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <MessageCircle size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-400 italic">Enter country code + number. This allows retailers to chat with you.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Mail size={14} /> Registered Email
            </label>
            <input 
              disabled
              type="email" 
              className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed font-medium"
              value={profile.email}
            />
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {success && (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-in fade-in slide-in-from-left-2">
                  <CheckCircle size={18} /> Profile Updated Successfully
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex gap-4 items-start">
         <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <MessageCircle size={24} />
         </div>
         <div>
            <h4 className="font-bold text-indigo-900 mb-1">How WhatsApp linking works</h4>
            <p className="text-sm text-indigo-700/80 leading-relaxed">
               Once you provide your WhatsApp number, it acts as a secondary channel. Retailers can use the "What-If Tool" to instantly draft an order message and send it to you if they are not using the platform-native order flow.
            </p>
         </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
