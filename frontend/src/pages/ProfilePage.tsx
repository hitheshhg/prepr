import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Avatar from '../components/common/Avatar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  Calendar,
  Award,
  Mail,
  RefreshCw,
  Github,
  GitBranch,
  Star,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  getLinkedGitHubAccount,
  linkGitHubAccount,
  unlinkGitHubAccount,
  GitHubRepo,
} from '../services/githubService';

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

  // GitHub Integration state
  const [githubUsername, setGithubUsername] = useState('');
  const [linkedGitHubUser, setLinkedGitHubUser] = useState<string | null>(null);
  const [linkedRepos, setLinkedRepos] = useState<GitHubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubMessage, setGithubMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchProfileAndGitHub = async () => {
      setLoading(true);
      try {
        const [profileRes, ghRes] = await Promise.allSettled([
          api.get('/api/v1/auth/profile'),
          getLinkedGitHubAccount(),
        ]);

        if (profileRes.status === 'fulfilled' && profileRes.value.data) {
          setDetails(profileRes.value.data);
        }

        if (ghRes.status === 'fulfilled' && ghRes.value.status === 'linked') {
          setLinkedGitHubUser(ghRes.value.github_username);
          setLinkedRepos(ghRes.value.repos || []);
          if (ghRes.value.github_username) {
            setGithubUsername(ghRes.value.github_username);
          }
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndGitHub();
  }, []);

  const handleLinkGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUsername.trim()) return;

    setGithubLoading(true);
    setGithubMessage(null);
    try {
      const res = await linkGitHubAccount(githubUsername);
      if (res.status === 'linked') {
        setLinkedGitHubUser(res.github_username);
        setLinkedRepos(res.repos || []);
        setGithubMessage({
          type: 'success',
          text: `Successfully synchronized ${res.repos.length} repositories from @${res.github_username}!`,
        });
      }
    } catch (err) {
      setGithubMessage({
        type: 'error',
        text: 'Failed to synchronize GitHub repositories. Please check the username.',
      });
    } finally {
      setGithubLoading(false);
    }
  };

  const handleUnlinkGitHub = async () => {
    if (!window.confirm('Are you sure you want to unlink your GitHub account?')) return;
    setGithubLoading(true);
    try {
      await unlinkGitHubAccount();
      setLinkedGitHubUser(null);
      setLinkedRepos([]);
      setGithubUsername('');
      setGithubMessage({
        type: 'success',
        text: 'GitHub account unlinked successfully.',
      });
    } catch {
      setGithubMessage({
        type: 'error',
        text: 'Failed to unlink GitHub account.',
      });
    } finally {
      setGithubLoading(false);
    }
  };

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
    <div className="max-w-4xl mx-auto py-6 space-y-7">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span>Verified Profile</span>
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Candidate Profile</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
          Your credentials, interview activity summary, and connected developer GitHub repositories.
        </p>
      </div>

      {/* Main Profile Info Card */}
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

      {/* GitHub Integration Bento Card */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--bento-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-black flex items-center justify-center flex-shrink-0">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                GitHub Codebase Intelligence
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Prepr analyzes your public repositories to formulate direct architectural interview questions.
              </p>
            </div>
          </div>

          <Badge variant={linkedGitHubUser ? 'emerald' : 'neutral'} size="sm">
            {linkedGitHubUser ? `Synced: @${linkedGitHubUser}` : 'Not Linked'}
          </Badge>
        </div>

        {/* Sync Form */}
        <form onSubmit={handleLinkGitHub} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs font-mono">
                github.com/
              </span>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="username (e.g. hitheshhg)"
                className="w-full pl-28 pr-3 py-2 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] focus:outline-none focus:border-neutral-500 text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={githubLoading || !githubUsername.trim()}
                className="h-9 px-4 font-mono text-xs uppercase tracking-wider flex items-center gap-1.5"
              >
                {githubLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5" />
                )}
                <span>{linkedGitHubUser ? 'Re-Sync' : 'Connect'}</span>
              </Button>

              {linkedGitHubUser && (
                <button
                  type="button"
                  onClick={handleUnlinkGitHub}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Unlink GitHub account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Feedback Alert */}
        {githubMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 ${
              githubMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {githubMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            ) : null}
            <span>{githubMessage.text}</span>
          </div>
        )}

        {/* Repositories Preview List */}
        {linkedRepos.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--bento-border)] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>Synced Repositories ({linkedRepos.length}):</span>
              <span className="flex items-center gap-1 text-emerald-500">
                <Sparkles className="w-3 h-3" /> Ready for Project Deep-Dives
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {linkedRepos.map((repo) => (
                <div
                  key={repo.name}
                  className="p-2.5 rounded-xl bg-neutral-500/5 border border-[var(--bento-border)] flex flex-col justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 font-semibold">
                      <span className="truncate">{repo.name}</span>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                      {repo.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-[var(--bento-border)] text-[10px] font-mono text-[var(--text-muted)]">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-500/10 text-[var(--text-main)]">
                      {repo.language}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
                      {repo.stars}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ProfilePage;
