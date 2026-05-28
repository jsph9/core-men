export default function CatalogoLoading() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm">
            <div className="aspect-square animate-pulse rounded-lg bg-gray-100" />
            <div className="mt-3 h-4 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
