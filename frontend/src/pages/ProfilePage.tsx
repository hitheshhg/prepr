import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Avatar from '../components/common/Avatar';
import Card from '../components/ui/Card';
import { Calendar, Award, Mail, RefreshCw } from 'lucide-react';

interface ProfileDetails {
  email: string;
  display_name: string;
  photo_url?: string;
  created_at?: string;
  total_sessions: number;
}

export const ProfilePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/v1/auth/profile');
        if (res.data) {
          setDetails(res.data);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const displayName =
    details?.display_name || currentUser?.displayName || 'Candidate';
  const email = details?.email || currentUser?.email || 'No email provided';
  const photoUrl = details?.photo_url || currentUser?.photoURL || null;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Active Candidate';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent Member';
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="wix-pill text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Verified Profile
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Candidate Profile</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Your credentials and interview activity summary.
        </p>
      </div>

      <Card padding="lg">
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar src={photoUrl} name={displayName} size="xl" />

          <div>
            <h2 className="text-xl font-bold tracking-tight">{displayName}</h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] font-mono mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{email}</span>
            </div>
          </div>

          <div className="w-full border-t border-[var(--bento-border)] pt-4 grid grid-cols-2 gap-4 text-left">
            {/* Member Since */}
            <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Member Since</span>
              </div>
              <p className="text-sm font-semibold font-mono mt-1">
                {loading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-[var(--text-muted)]" />
                ) : (
                  formatDate(details?.created_at)
                )}
              </p>
            </div>

            {/* Total Sessions */}
            <div className="p-3.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)]">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                <Award className="w-3.5 h-3.5" />
                <span>Total Sessions</span>
              </div>
              <p className="text-sm font-semibold font-mono mt-1">
                {loading ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-[var(--text-muted)]" />
                ) : (
                  details?.total_sessions ?? 0
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
