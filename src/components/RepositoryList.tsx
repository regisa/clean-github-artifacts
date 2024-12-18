'use client';

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Octokit } from "octokit";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  artifactCount: number;
  loading: boolean;
}

interface Artifact {
  id: number;
  created_at: string;
}

export default function RepositoryList() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);

  const fetchRepositories = useCallback(async () => {
    try {
      const octokit = new Octokit({ auth: session?.accessToken });
      const response = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });

      const repos = response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        artifactCount: 0,
        loading: true,
      }));

      setRepositories(repos);
      setLoading(false);

      // Fetch artifact counts for each repository
      for (const repo of repos) {
        try {
          const artifactsResponse = await octokit.rest.actions.listArtifactsForRepo({
            owner: repo.full_name.split('/')[0],
            repo: repo.name,
            per_page: 1,
          });

          setRepositories(prevRepos =>
            prevRepos.map(r =>
              r.id === repo.id
                ? { ...r, artifactCount: artifactsResponse.data.total_count, loading: false }
                : r
            )
          );
        } catch (error) {
          console.error('Error fetching artifacts', error);
          setRepositories(prevRepos =>
            prevRepos.map(r =>
              r.id === repo.id ? { ...r, artifactCount: 0, loading: false } : r
            )
          );
        }
      }
    } catch (error) {
      console.error('Error fetching repositories', error);
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    fetchRepositories();
  }, [session?.accessToken, fetchRepositories]);

  const deleteArtifacts = async (repoId: number, keepLatest: boolean = false) => {
    const repo = repositories.find(r => r.id === repoId);
    if (!repo) return;

    try {
      const octokit = new Octokit({ auth: session?.accessToken });
      const [owner, repoName] = repo.full_name.split('/');

      const artifactsResponse = await octokit.rest.actions.listArtifactsForRepo({
        owner,
        repo: repoName,
        per_page: 100,
      });

      let artifactsToDelete = artifactsResponse.data.artifacts as Artifact[];

      if (keepLatest && artifactsToDelete.length > 0) {
        // Sort artifacts by creation date (newest first)
        artifactsToDelete.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        // Remove the latest artifact from deletion list
        artifactsToDelete = artifactsToDelete.slice(1);
      }

      for (const artifact of artifactsToDelete) {
        await octokit.rest.actions.deleteArtifact({
          owner,
          repo: repoName,
          artifact_id: artifact.id,
        });
      }

      // Update the artifact count
      setRepositories(prevRepos =>
        prevRepos.map(r =>
          r.id === repoId ? { ...r, artifactCount: keepLatest ? 1 : 0 } : r
        )
      );
    } catch (error) {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      {selectedRepos.length > 0 && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg flex justify-between items-center">
          <span>{selectedRepos.length} repositories selected</span>
          <div className="flex gap-4">
            <button
              onClick={() => handleDeleteSelected(true)}
              disabled={deleting}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Keep Latest Only'}
            </button>
            <button
              onClick={() => handleDeleteSelected(false)}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete All'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className={`p-4 border rounded-lg ${
              selectedRepos.includes(repo.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{repo.name}</h3>
                <p className="text-sm text-gray-600">{repo.full_name}</p>
              </div>
              <input
                type="checkbox"
                checked={selectedRepos.includes(repo.id)}
                onChange={(e) => {
                  setSelectedRepos(prev =>
                    e.target.checked
                      ? [...prev, repo.id]
                      : prev.filter(id => id !== repo.id)
                  );
                }}
                className="ml-2 h-5 w-5"
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm">
                {repo.loading ? (
                  <span className="text-gray-500">Loading artifacts...</span>
                ) : (
                  <span>{repo.artifactCount} artifacts</span>
                )}
              </span>
              {!repo.loading && repo.artifactCount > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteArtifacts(repo.id, true)}
                    className="text-sm text-orange-600 hover:text-orange-800"
                  >
                    Keep latest
                  </button>
                  <button
                    onClick={() => deleteArtifacts(repo.id, false)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete all
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}