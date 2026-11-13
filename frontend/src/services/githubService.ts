import { api } from './api';

export interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  is_fork: boolean;
  html_url: string;
  topics: string[];
  updated_at: string;
}

export interface GitHubReposResponse {
  status: string;
  username: string;
  total: number;
  repos: GitHubRepo[];
  message?: string;
}

export interface LinkedGitHubResponse {
  status: 'linked' | 'unlinked';
  github_username: string | null;
  repos: GitHubRepo[];
}

export const getGitHubRepos = async (username: string): Promise<GitHubReposResponse> => {
  const clean = username.trim().replace(/^@/, '');
  const response = await api.get<GitHubReposResponse>(`/api/v1/github/repos/${clean}`);
  return response.data;
};

export const linkGitHubAccount = async (githubUsername: string): Promise<LinkedGitHubResponse> => {
  const clean = githubUsername.trim().replace(/^@/, '');
  const response = await api.post<LinkedGitHubResponse>('/api/v1/github/link', {
    github_username: clean,
  });
  return response.data;
};

export const getLinkedGitHubAccount = async (): Promise<LinkedGitHubResponse> => {
  const response = await api.get<LinkedGitHubResponse>('/api/v1/github/linked');
  return response.data;
};

export const unlinkGitHubAccount = async (): Promise<{ status: string }> => {
  const response = await api.delete<{ status: string }>('/api/v1/github/unlink');
  return response.data;
};
