import { getServerSession } from "next-auth";
import LoginButton from "@/components/LoginButton";
import RepositoryList from "@/components/RepositoryList";
import { authOptions } from "./api/auth/[...nextauth]/options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold mb-8">GitHub Artifacts Cleaner</h1>
        <p className="text-xl mb-8 text-muted-foreground">Sign in with GitHub to manage your artifacts</p>
        <LoginButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen py-8">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex justify-between items-center mb-8 pb-6 border-b">
          <div>
            <h1 className="text-2xl font-semibold">Your Repositories</h1>
            <p className="text-muted-foreground mt-1">Manage artifacts across all your repositories</p>
          </div>
          <LoginButton />
        </div>
        <RepositoryList />
      </div>
    </main>
  );
}
