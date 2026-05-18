async function checkBackground() {
  try {
    const res = await fetch(
      "http://localhost:3000/api/background"
    );

    const data =
      await res.json();

    console.log(
      "===== SANA BACKGROUND CHECK ====="
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
      "SANA background check failed."
    );

  }
}

checkBackground();

setInterval(
  checkBackground,
  1000 * 60 * 60
);