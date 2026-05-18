export async function GET() {
  try {
    const response = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current_weather=true"
    );

    const data = await response.json();
    const code = data.current_weather.weathercode;

    let weather = "晴朗";

    if (code >= 1 && code <= 3) weather = "多云";
    if (code >= 45 && code <= 48) weather = "有雾";
    if (code >= 51 && code <= 57) weather = "小雨";
    if (code >= 61 && code <= 67) weather = "降雨";
    if (code >= 71 && code <= 77) weather = "降雪";
    if (code >= 80 && code <= 82) weather = "阵雨";
    if (code >= 95) weather = "雷雨";

    return Response.json({
      success: true,
      city: "London",
      temperature: data.current_weather.temperature,
      weather,
      windspeed: data.current_weather.windspeed,
    });
  } catch {
    return Response.json({
      success: false,
      city: "London",
      temperature: "--",
      weather: "天气不可用",
      windspeed: "--",
    });
  }
}