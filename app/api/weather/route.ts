import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://wttr.in/Clacton-on-Sea?format=j1", {
      next: { revalidate: 900 }, // 15 min cache
    });
    if (!res.ok) throw new Error("wttr.in failed");
    const json = await res.json();
    const current = json.current_condition?.[0];
    if (!current) throw new Error("No weather data");
    return NextResponse.json({
      temp: current.temp_C,
      feelsLike: current.FeelsLikeC,
      desc: current.weatherDesc?.[0]?.value || "Unknown",
      humidity: current.humidity,
      windKmph: current.windspeedKmph,
      location: "Clacton-on-Sea",
      icon: weatherIcon(current.weatherCode),
    });
  } catch (e) {
    return NextResponse.json({ error: "Weather unavailable" }, { status: 503 });
  }
}

function weatherIcon(code: string): string {
  const c = parseInt(code);
  if (c === 113) return "☀️";
  if (c === 116) return "⛅";
  if ([119, 122].includes(c)) return "☁️";
  if ([143, 248, 260].includes(c)) return "🌫️";
  if ([176, 263, 266, 293, 296].includes(c)) return "🌦️";
  if ([299, 302, 305, 308].includes(c)) return "🌧️";
  if ([311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 368, 371, 374, 377].includes(c)) return "❄️";
  if ([386, 389, 392, 395].includes(c)) return "⛈️";
  return "🌡️";
}
