'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { Octokit } from 'octokit';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

interface Artifact {
  id: number;
  name: string;
  size_in_bytes: number;
  created_at: string;
  expired: boolean;
}

interface GithubArtifact {
  id: number;
  node_id: string;
  name: string;
  size_in_bytes: number;
  url: string;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  expires_at: string | null;
  updated_at: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  artifactCount: number;
  totalSize: number;
  artifacts: Artifact[];
  loading: boolean;
}

interface ModalProps {
  repository: Repository;
  onClose: () => void;
  onDelete: (artifactId: number) => Promise<void>;
}

interface LogMessage {
  id: string;
  text: string;
  timestamp: Date;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function ArtifactModal({ repository, onClose, onDelete }: ModalProps) {
  const [deletingIds, setDeletingIds] = useState<number[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useEffect(() => {
    setArtifacts(
      [...repository.artifacts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );
  }, [repository.artifacts]);

  const handleDelete = async (artifactId: number) => {
    setDeletingIds((prev) => [...prev, artifactId]);
    try {
      await onDelete(artifactId);
      // Remove the artifact from the local state immediately after successful deletion
      setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
    } catch (error) {
      console.error('Error deleting artifact:', error);
    }
    setDeletingIds((prev) => prev.filter((id) => id !== artifactId));
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{repository.name} Artifacts</DialogTitle>
          <DialogDescription>
            Manage artifacts for {repository.full_name}. Total size:{' '}
            {formatBytes(repository.totalSize)}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh]">
          {artifacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No artifacts found</div>
          ) : (
            <div className="space-y-3">
              {artifacts.map((artifact) => (
                <Card key={artifact.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-medium">{artifact.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Size: {formatBytes(artifact.size_in_bytes)} • Created:{' '}
                        {new Date(artifact.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(artifact.id)}
                      disabled={deletingIds.includes(artifact.id)}
                    >
                      {deletingIds.includes(artifact.id) ? 'Deleting...' : 'Delete'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add this helper function for formatting timestamps with milliseconds
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
}

interface RepositoryListProps {
  showConsole: boolean;
}

export default function RepositoryList({ showConsole }: RepositoryListProps) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const addLog = useCallback((text: string) => {
    setLogs((prev) =>
      [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          text,
          timestamp: new Date(),
        },
      ].sort((a, b) => b.id.localeCompare(a.id))
    );
  }, []);

  const fetchRepositories = useCallback(async () => {
    try {
      setLogs([]);
      addLog('Fetching repositories...');
      const octokit = new Octokit({ auth: session?.accessToken });
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });

      addLog(`Found ${response.data.length} repositories`);

      // Set repositories immediately with loading state
      const repos = response.data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        artifactCount: 0,
        totalSize: 0,
        artifacts: [],
        loading: true,
      }));
      setRepositories(repos);
      setLoading(false);

      // Fetch artifacts for each repository in parallel
      const artifactPromises = repos.map(async (repo) => {
        try {
          addLog(`Fetching artifacts for ${repo.name}...`);
          const artifactsResponse = await octokit.rest.actions.listArtifactsForRepo({
            owner: repo.full_name.split('/')[0],
            repo: repo.name,
            per_page: 100,
          });

          const githubArtifacts = artifactsResponse.data.artifacts as GithubArtifact[];
          const artifacts: Artifact[] = githubArtifacts.map((art) => ({
            id: art.id,
            name: art.name,
            size_in_bytes: art.size_in_bytes,
            created_at: art.created_at,
            expired: art.expired,
          }));

          const totalSize = artifacts.reduce((sum, artifact) => sum + artifact.size_in_bytes, 0);
          addLog(`Found ${artifacts.length} artifacts in ${repo.name} (${formatBytes(totalSize)})`);

          setRepositories((prevRepos) =>
            prevRepos.map((r) =>
              r.id === repo.id
                ? {
                    ...r,
                    artifactCount: artifacts.length,
                    totalSize,
                    artifacts,
                    loading: false,
                  }
                : r
            )
          );
        } catch (error) {
          addLog(`Error fetching artifacts for ${repo.name}`);
          console.error('Error fetching artifacts', error);
          setRepositories((prevRepos) =>
            prevRepos.map((r) =>
              r.id === repo.id
                ? { ...r, artifactCount: 0, totalSize: 0, artifacts: [], loading: false }
                : r
            )
          );
        }
      });

      await Promise.all(artifactPromises);
      addLog('Finished fetching all artifacts');
      setHideEmpty(true);
    } catch (error) {
      addLog('Error fetching repositories');
      console.error('Error fetching repositories', error);
      setLoading(false);
    }
  }, [session?.accessToken, addLog]);

  useEffect(() => {
    if (session?.accessToken) {
      fetchRepositories();
    }
  }, [session?.accessToken, fetchRepositories]);

  const deleteArtifact = async (repoId: number, artifactId: number) => {
    const repo = repositories.find((r) => r.id === repoId);
    if (!repo) return;

    const artifact = repo.artifacts.find((a) => a.id === artifactId);
    if (!artifact) return;

    try {
      addLog(`Deleting artifact "${artifact.name}" from ${repo.name}...`);
      const octokit = new Octokit({ auth: session?.accessToken });
      const [owner, repoName] = repo.full_name.split('/');

      await octokit.rest.actions.deleteArtifact({
        owner,
        repo: repoName,
        artifact_id: artifactId,
      });

      addLog(`Successfully deleted artifact "${artifact.name}" from ${repo.name}`);

      // Update repository state
      setRepositories((prevRepos) =>
        prevRepos.map((r) => {
          if (r.id === repoId) {
            const updatedArtifacts = r.artifacts.filter((a) => a.id !== artifactId);
            const totalSize = updatedArtifacts.reduce(
              (sum, artifact) => sum + artifact.size_in_bytes,
              0
            );
            return {
              ...r,
              artifacts: updatedArtifacts,
              artifactCount: updatedArtifacts.length,
              totalSize,
            };
          }
          return r;
        })
      );
    } catch (error) {
      addLog(`Error deleting artifact "${artifact.name}" from ${repo.name}`);
      console.error('Error deleting artifact:', error);
    }
  };

  const deleteArtifacts = async (repoId: number, keepLatest: boolean = false) => {
    const repo = repositories.find((r) => r.id === repoId);
    if (!repo) return;

    try {
      const octokit = new Octokit({ auth: session?.accessToken });
      const [owner, repoName] = repo.full_name.split('/');

      let artifactsToDelete = [...repo.artifacts];

      if (keepLatest && artifactsToDelete.length > 0) {
        // Sort artifacts by creation date (newest first)
        artifactsToDelete.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        // Remove the latest artifact from deletion list
        artifactsToDelete = artifactsToDelete.slice(1);
      }

      addLog(`Deleting ${artifactsToDelete.length} artifacts from ${repo.name}...`);

      for (const artifact of artifactsToDelete) {
        try {
          await octokit.rest.actions.deleteArtifact({
            owner,
            repo: repoName,
            artifact_id: artifact.id,
          });
          addLog(`Successfully deleted artifact "${artifact.name}" from ${repo.name}`);
        } catch (error) {
          addLog(`Error deleting artifact "${artifact.name}" from ${repo.name}`);
          console.error('Error deleting artifact:', error);
        }
      }

      // Update the repository state
      setRepositories((prevRepos) =>
        prevRepos.map((r) => {
          if (r.id === repoId) {
            const remainingArtifacts = keepLatest ? [repo.artifacts[0]] : [];
            const totalSize = remainingArtifacts.reduce(
              (sum, artifact) => sum + artifact.size_in_bytes,
              0
            );
            return {
              ...r,
              artifacts: remainingArtifacts,
              artifactCount: remainingArtifacts.length,
              totalSize,
            };
          }
          return r;
        })
      );

      addLog(`Finished processing ${repo.name}`);
    } catch (error) {
      addLog(`Error processing ${repo.name}`);
      console.error('Error deleting artifacts:', error);
    }
  };

  const handleDeleteSelected = async (keepLatest: boolean = false) => {
    setDeleting(true);
    for (const repoId of selectedRepos) {
      await deleteArtifacts(repoId, keepLatest);
    }
    setSelectedRepos([]);
    setDeleting(false);
  };

  const filteredRepositories = hideEmpty
    ? repositories.filter((repo) => repo.artifactCount > 0)
    : repositories;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showConsole && (
        <div className="border rounded-lg bg-card p-4 overflow-hidden">
          <h3 className="font-semibold mb-2">Progress Log</h3>
          <div className="space-y-1 overflow-y-auto max-h-[200px] font-mono text-xs">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2">
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className="break-all">{log.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          {selectedRepos.length > 0 && (
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleDeleteSelected(true)}
                disabled={deleting}
                className="border-orange-400 text-orange-400 hover:bg-orange-400/10"
              >
                {deleting ? 'Deleting...' : 'Keep Latest Only'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteSelected(false)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete All'}
              </Button>
            </div>
          )}
        </div>

        <table className="feed-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Size</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRepositories.map((repo) => (
              <tr key={repo.id}>
                <td className="whitespace-nowrap">
                  {new Date(repo.artifacts[0]?.created_at || Date.now()).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}
                </td>
                <td>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-left font-medium"
                    onClick={() => setSelectedRepo(repo)}
                  >
                    {repo.name}
                  </Button>
                </td>
                <td className="whitespace-nowrap text-muted-foreground">
                  {formatBytes(repo.totalSize)}
                </td>
                <td>
                  <span className="feed-badge">
                    {repo.artifactCount > 0 ? 'ARTIFACTS' : 'EMPTY'}
                  </span>
                </td>
                <td className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedRepo(repo)}>
                    <span className="sr-only">Open</span>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRepo && (
        <ArtifactModal
          repository={selectedRepo}
          onClose={() => setSelectedRepo(null)}
          onDelete={(artifactId) => deleteArtifact(selectedRepo.id, artifactId)}
        />
      )}
    </div>
  );
}
