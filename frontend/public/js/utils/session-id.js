function getSessionId() {
  return document.getElementById('uuid').value;
}

// redirection for demos
async function loadExample(name, id) {
  document.getElementById("examples").classList.add("hidden");
  document.getElementById("generating-example").classList.remove("hidden");
  
  const response = await fetch("/create?example=" + name + "&id=" + id);
  console.log(response)
  console.log(response.ok)
  if (response.ok) {
    window.location.href = "/proof?id=" + id; // TODO remove `proof`
  } else {
    document.getElementById("generating-example").innerHTML = "Something went wrong. Please reload this page and try again. If the problem persists, feel free to contact the authors";
  }
}

function fixDecimals(num) {
  return Math.trunc(num);
}