import { ImageResponse } from "next/og";

export const alt = "HanFin - Personal Finance & Market Portfolio";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

async function loadOutfitFont() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/google/fonts/main/ofl/outfit/static/Outfit-Bold.ttf"
    );
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch (error) {
    console.warn("Gagal memuat font Outfit untuk OG Image:", error);
  }
  return null;
}

export default async function Image() {
  const outfitFontData = await loadOutfitFont();

  const fontsOption = outfitFontData
    ? [
        {
          name: "Outfit",
          data: outfitFontData,
          style: "normal" as const,
          weight: 700 as const,
        },
      ]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b", // zinc-950
          color: "#ffffff",
          fontFamily: outfitFontData ? "Outfit, sans-serif" : "sans-serif",
          padding: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow Accent */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(9, 9, 11, 0) 70%)",
          }}
        />

        {/* Teks Logo Tepat Di Tengah Tanpa Kotak */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "84px",
            fontWeight: "bold",
            letterSpacing: "-0.03em",
            marginBottom: "20px",
          }}
        >
          <span style={{ color: "#ffffff" }}>Han</span>
          <span style={{ color: "#10b981" }}>Fin</span>
        </div>

        {/* Deskripsi Singkat */}
        <div
          style={{
            fontSize: "26px",
            color: "#a1a1aa", // zinc-400
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Personal Finance & Market Portfolio
        </div>

        {/* Domain Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "40px",
            padding: "8px 24px",
            borderRadius: "9999px",
            border: "1px solid #27272a", // zinc-800
            backgroundColor: "#18181b", // zinc-900
            fontSize: "18px",
            color: "#10b981", // emerald-500
            fontWeight: "bold",
          }}
        >
          hanfin.app
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontsOption,
    }
  );
}