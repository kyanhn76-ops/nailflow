export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold text-pink-600">NailFlow</h1>
        <p className="mt-2 text-gray-600">Fair queues for busy nail salons</p>

        <div className="mt-10 rounded-2xl bg-white p-6 shadow-md">
          <p className="text-sm uppercase tracking-wide text-gray-400">
            Now serving
          </p>
          <p className="mt-1 text-6xl font-bold text-gray-900">12</p>
          <p className="mt-4 text-gray-600">5 people waiting · about 25 min</p>
        </div>

        <button className="mt-8 w-full rounded-full bg-pink-600 py-4 text-lg font-semibold text-white hover:bg-pink-700">
          Join the queue
        </button>
      </div>
    </main>
  );
}