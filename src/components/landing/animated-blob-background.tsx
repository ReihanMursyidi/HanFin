export function AnimatedBlobBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Blob 1: Kiri Atas (Warna Primary) */}
      <div className="absolute -top-20 -left-20 w-80 sm:w-lg h-80 sm:h-128 bg-primary/30 rounded-full blur-3xl animate-blob" />

      {/* Blob 2: Kanan Atas/Tengah (Warna Emerald) */}
      <div className="absolute top-1/4 -right-20 w-80 sm:w-lg h-80 sm:h-128 bg-primary/30 rounded-full blur-3xl animate-blob animation-delay-2000" />

      {/* Blob 3: Kiri Tengah (Warna Emerald disamakan dengan Blob 2, Posisi lebih ke atas) */}
      <div className="absolute top-1/2 left-10 sm:left-1/4 w-80 sm:w-lg h-80 sm:h-128 bg-primary/30 rounded-full blur-3xl animate-blob animation-delay-4000" />
    </div>
  );
}
