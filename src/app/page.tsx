import { getServerSession } from "next-auth";
import LoginButton from "@/components/LoginButton";
import RepositoryList from "@/components/RepositoryList";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">GitHub Artifacts Cleaner</h1>
        <p className="text-xl mb-8">Sign in with GitHub to manage your artifacts</p>
        <LoginButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Repositories</h1>
          <LoginButton />
        </div>
        <RepositoryList />
      </div>
    </main>
  );
}
