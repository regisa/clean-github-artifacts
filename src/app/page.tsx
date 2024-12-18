import { getServerSession } from "next-auth";
import LoginButton from "@/components/LoginButton";
import RepositoryList from "@/components/RepositoryList";
import { authOptions } from "./api/auth/[...nextauth]/options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[#0d1117]">
        <h1 className="text-4xl font-bold mb-8 text-[#c9d1d9]">GitHub Artifacts Cleaner</h1>
        <p className="text-xl mb-8 text-[#8b949e]">Sign in with GitHub to manage your artifacts</p>
        <LoginButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1117] py-8">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[#30363d]">
          <div>
            <h1 className="text-2xl font-semibold text-[#c9d1d9]">Your Repositories</h1>
            <p className="text-[#8b949e] mt-1">Manage artifacts across all your repositories</p>
          </div>
          <LoginButton />
        </div>
        <RepositoryList />
      </div>
    </main>
  );
}
