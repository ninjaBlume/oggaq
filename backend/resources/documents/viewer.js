// A fragment never reaches access logs. Clear it before enabling the POST handoff.
function receiveTicket() {
  const ticket = location.hash.slice(1);
  history.replaceState(null, "", location.pathname);
  const valid = /^[a-f0-9]{64}$/.test(ticket);
  document.getElementById("ticket").value = valid ? ticket : "";
  document.getElementById("open").disabled = !valid;
  document.getElementById("status").textContent = valid
    ? "Bağlantı 5 dakika geçerlidir ve bir kez açılabilir."
    : "Uygulamadaki PDF bağlantısını yeniden açman gerekebilir.";
}
// iOS may reuse the tab without reloading when another export changes only its fragment.
window.addEventListener("hashchange", receiveTicket);
receiveTicket();
