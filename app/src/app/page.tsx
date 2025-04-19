export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Content Distribution Platform
        </h1>
        <p className="text-xl mb-8 text-center text-gray-600 dark:text-gray-300">
          Streamline your content delivery across multiple platforms
        </p>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left gap-8">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Schedule Content{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Plan and schedule your content across multiple platforms
            effortlessly.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Analytics{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Track performance and engagement across all your distribution
            channels.
          </p>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Manage Platforms{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Connect and manage all your content platforms in one place.
          </p>
        </div>
      </div>

      <footer className="flex gap-8 items-center justify-center mt-16">
        <a
          href="/dashboard"
          className="rounded-full bg-blue-500 text-white px-6 py-3 font-semibold hover:bg-blue-600 transition-colors"
        >
          Get Started
        </a>
        <a
          href="/docs"
          className="rounded-full border border-gray-300 px-6 py-3 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Documentation
        </a>
      </footer>
    </main>
  );
}
