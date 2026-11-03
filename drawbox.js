/*
  Drawbox JS - Iisun sivustolle muokattu versio
*/

const GOOGLE_FORM_ID = "1FAIpQLSctrb908lMk03uBQgcJMV1wp-ICHpG42djjRq8aG6TFN6ALjA";
const IMGUR_ID = "entry.326300556";
const NAME_ID = "entry.2054602504";
const GOOGLE_SHEET_ID = "1Mk_dgGKv13nmpOFbtUOqdOv5ik-W7zwzYyx4n4V2vJc";

const DISPLAY_IMAGES = true;
const IMAGE_APPROVAL = true;
const CLIENT_ID = "bfaaee57f0b78f1";
const DEBUG_MODE = false;

const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/" + GOOGLE_SHEET_ID + "/export?format=csv";
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/" + GOOGLE_FORM_ID + "/formResponse";

let canvas = document.getElementById("drawboxcanvas");
let context = canvas.getContext("2d");
context.fillStyle = "white";
context.fillRect(0, 0, canvas.width, canvas.height);

function CreateCanvasMobile(x) {
  if (x.matches) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetWidth;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}

var x = window.matchMedia("(max-width: 499px)");
CreateCanvasMobile(x);
x.addEventListener("change", function() {
  CreateCanvasMobile(x);
});

let restore_array = [];
let start_index = -1;
let stroke_color = "black";
let stroke_width = "2";
let is_drawing = false;
let line_opacity = "1";

let stroke_join = "round";
let line_cap = "round";
let user_name = "tuntematon";

const pos = { x: 0, y: 0 };
const pen_style = {
  color: "black",
  cap: "round",
  radius: "2",
  canvas: document.createElement("canvas"),
  cursor_url: null,
  opacity: "1"
};

document.querySelector("fieldset").oninput = updatePenStyle;
updatePenStyle();

function updatePenStyle() {
  const rad = pen_style.radius = stroke_width;
  const color = pen_style.color = stroke_color;
  const cap = pen_style.cap = line_cap;
  const opacity = pen_style.opacity = line_opacity;
  const cursor_canvas = pen_style.canvas;
  const cursor_ctx = cursor_canvas.getContext("2d");

  cursor_canvas.width = cursor_canvas.height = rad;
  cursor_ctx.fillStyle = color;
  
  if (cap === "round") {
    cursor_ctx.arc(rad / 2, rad / 2, rad / 2, 0, Math.PI * 2);
  } else {
    cursor_ctx.rect(0, 0, rad, rad);
  }
  cursor_ctx.fill();
  
  cursor_canvas.toBlob(function(blob) {
    URL.revokeObjectURL(pen_style.cursor_url);
    pen_style.cursor_url = URL.createObjectURL(blob);
    canvas.style.cursor = `url(${pen_style.cursor_url}) ${rad/2} ${rad/2}, auto`; 
    if (rad < 4) { canvas.style.cursor = "crosshair"; }
  }); 
}

function setPosition(e) {
  const rect = canvas.getBoundingClientRect();
  pos.x = e.clientX - rect.left;
  pos.y = e.clientY - rect.top;
}

function change_color(element) {
  stroke_color = element.style.background;
  updatePenStyle();
}

function start(event) {
  has_moved = false;
  is_drawing = true;
  context.beginPath();
  context.moveTo(getX(event), getY(event));
  event.preventDefault();
}

function draw(event) {
  if (!is_drawing) return;
  has_moved = true;
  context.lineTo(getX(event), getY(event));
  context.strokeStyle = stroke_color;
  context.lineWidth = stroke_width;
  context.lineCap = line_cap;
  context.lineJoin = stroke_join; 
  context.globalAlpha = line_opacity;
  context.stroke();
  setPosition(event);
  event.preventDefault();
}

function stop(event) {
  if (!is_drawing) return;
  if (!has_moved) {
    let start_draw_x = getX(event);
    let start_draw_y = getY(event);
    context.lineTo(start_draw_x + 1, start_draw_y);
    context.stroke();
  }
  context.stroke();
  context.closePath();
  is_drawing = false;
  restore_array.push(context.getImageData(0, 0, canvas.width, canvas.height));
  start_index++;
  event.preventDefault();
}

function getX(event) {
  return event.pageX ? event.pageX - canvas.offsetLeft : event.targetTouches[0].pageX - canvas.offsetLeft;
}

function getY(event) {
  return event.pageY ? event.pageY - canvas.offsetTop : event.targetTouches[0].pageY - canvas.offsetTop;
}

canvas.addEventListener("touchstart", start, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stop, { passive: false });
canvas.addEventListener("mousedown", start, false);
canvas.addEventListener("mousemove", draw, false);
canvas.addEventListener("mouseup", stop, false);
canvas.addEventListener("mouseout", stop, false);

// Kumous ilman vahvistuskyselyitä
function Undo() {
  if (start_index <= 0) {
    Clear();
  } else {
    start_index--;
    restore_array.pop();
    context.putImageData(restore_array[start_index], 0, 0);
  }
}

// Tyhjennys suoraan ilman "are you sure?" -pop-upia
function Clear() {
  context.fillStyle = "white";
  context.globalAlpha = 1;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillRect(0, 0, canvas.width, canvas.height);
  restore_array = [];
  start_index = -1;
  context.globalAlpha = line_opacity;
}

// Lähetys suoraan ilman vahvistusikkunoita
document.getElementById("submit").addEventListener("click", async function () {
  if (start_index <= -1) {
    document.getElementById("status").textContent = "piirrä ensin jotain!";
    return;
  }

  const submitButton = document.getElementById("submit");
  const statusText = document.getElementById("status");

  submitButton.disabled = true;
  statusText.textContent = "lähetetään...";

  const imageData = canvas.toDataURL("image/png");
  const blob = await (await fetch(imageData)).blob();
  const formData = new FormData();
  formData.append("image", blob, "drawing.png");

  try {
    const response = await fetch("https://api.imgur.com/3/image", {
      method: "POST",
      headers: { Authorization: `Client-ID ${CLIENT_ID}` },
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error("kuvan lataus epäonnistui");

    const imageUrl = data.data.link;

    const googleFormData = new FormData();
    googleFormData.append(IMGUR_ID, imageUrl);
    googleFormData.append(NAME_ID, user_name.toLowerCase());

    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      body: googleFormData,
      mode: "no-cors",
    });

    if (IMAGE_APPROVAL) {
      statusText.textContent = "piirustus lähetetty! se ilmestyy galleriaan kun se on hyväksytty ♡";
    } else {
      statusText.textContent = "piirustus lähetetty onnistuneesti!";
    }

    Clear(); // Tyhjennetään kanvas lähetyksen jälkeen
    fetchImages(); // Päivitetään galleria
  } catch (error) {
    console.error(error);
    statusText.textContent = "virhe kuvan lähetyksessä.";
  } finally {
    submitButton.disabled = false;
  }
});

// Haetaan ja näytetään lähetetyt kuvat
async function fetchImages() {
  if (!DISPLAY_IMAGES) {
    document.getElementById("gallery").textContent = "galleria on pois käytöstä.";
    return;
  }

  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    const csvText = await response.text();
    const rows = csvText.split("\n").slice(1);

    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";
    rows.reverse().forEach((row) => {
      const columns = row.split(",");
      if (columns.length < 2) return;

      const timestamp = columns[0].trim().toLowerCase();
      const imgUrl = columns[1].trim().replace(/"/g, "");
      const author = columns[2].trim().replace(/"/g, "").toLowerCase();
      const approved = columns[3].trim().replace(/"/g, "");
      const myComment = columns[4].trim().replace(/"/g, "").toLowerCase();

      function loadImages() {
        const div = document.createElement("div");
        div.classList.add("image-container");
        div.innerHTML = `
          <img src="${imgUrl}" alt="piirustus" class="drawbox" title="${myComment}">
          <p>${timestamp}</p>
          <p>tekijä: ${author}</p>
        `;
        gallery.appendChild(div);
      }

      if (IMAGE_APPROVAL) {
        if (imgUrl.startsWith("http") && approved == "TRUE") {
          loadImages();
        }
      } else {
        if (imgUrl.startsWith("http")) {
          loadImages();
        }
      }
    });
  } catch (error) {
    console.error("Error fetching images:", error);
    document.getElementById("gallery").textContent = "kuvien lataaminen epäonnistui.";
  }

  // Suurennos klikattaessa
  document.querySelectorAll('.drawbox').forEach(img => {
    img.addEventListener('click', function() {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.background = 'rgba(0,0,0,0.8)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = 10000;
      overlay.addEventListener('click', () => document.body.removeChild(overlay));

      const bigImg = document.createElement('img');
      bigImg.src = img.src;
      bigImg.style.maxWidth = '90vw';
      bigImg.style.maxHeight = '90vh';
      bigImg.style.borderRadius = '4px';

      overlay.appendChild(bigImg);
      document.body.appendChild(overlay);
    });
  }); 
}

fetchImages();

// Ctrl+Z pikakomento kumoukselle
function keyPressHandler(e) {
  var evtobj = window.event ? window.event : e;
  if (evtobj.ctrlKey && evtobj.keyCode == 90) {
    Undo();
  }
}

window.addEventListener('keydown', keyPressHandler);

function showDiv() {
  const dropdown = document.getElementById("palette");
  const selectedValue = dropdown.value;
  const divs = document.querySelectorAll(".colorPalette");

  divs.forEach(div => div.style.display = "none");
  document.getElementById(selectedValue).style.display = "flex";
}
showDiv();
