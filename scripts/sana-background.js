async function checkBackground() {
  try {
    const res = await fetch(
      "http://localhost:3000/api/background"
    );

    const data =
      await res.json();

    console.log(
      "===== 经纪人 BACKGROUND CHECK ====="
    );

    console.log(
      new Date().toLocaleString()
    );

    console.log(
      data.reminder
    );

    console.log(
      "================================="
    );

  } catch {

    console.log(
      "经纪人 background check failed."
    );

  }
}

checkBackground();

setInterval(
  checkBackground,
  1000 * 60 * 60
);