export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
    <div className="card w-full max-w-md p-7">
      <h1 className="text-2xl font-bold">Fleeto Service Management</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in with your assigned account.</p>
      {q.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Invalid email or password.</div>}
      <form className="mt-6 space-y-4" action="/api/auth/login" method="post">
        <div><label>Email</label><input name="email" type="email" required/></div>
        <div><label>Password</label><input name="password" type="password" required/></div>
        <button className="btn-primary w-full" type="submit">Sign in</button>
      </form>
    </div>
  </main>;
}
