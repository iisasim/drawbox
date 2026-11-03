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

let restore_array = [];
let start_index = -1;
let stroke_color = "black";
let stroke_width = "2";
let is_drawing = false;
let line_opacity = "1";

let stroke_join = "round";
let line_cap = "round";
let user_name = "tuntematon";

function getX(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const clientX = event.clientX || (event.targetTouches && event.targetTouches[0].clientX);
  return (clientX - rect.left) * scaleX;
}

function getY(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const clientY = event.clientY || (event.targetTouches && event.targetTouches[0].clientY);
  return (clientY - rect.top) * scaleY;
}

function change_color(element) {
  stroke_color = element.style.background;
}

function start(event) {
  is_drawing = true;
  context.beginPath();
  context.moveTo(getX(event), getY(event));
  event.preventDefault();
}

function draw(event) {
  if (!is_drawing) return;
  context.lineTo(getX(event), getY(event));
  context.strokeStyle = stroke_color;
  context.lineWidth = stroke_width;
  context.lineCap = line_cap;
  context.lineJoin = stroke_join; 
  context.globalAlpha = line_opacity;
  context.stroke();
  event.preventDefault();
}

function stop(event) {
  if (!is_drawing) return;
  context.stroke();
  context.closePath();
  is_drawing = false;
  restore_array.push(context.getImageData(0, 0, canvas.width, canvas.height));
  start_index++;
  event.preventDefault();
}

canvas.addEventListener("touchstart", start, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stop, { passive: false });
canvas.addEventListener("mousedown", start, false);
canvas.addEventListener("mousemove", draw, false);
canvas.addEventListener("mouseup", stop, false);
canvas.addEventListener("mouseout", stop, false);

function Undo() {
  if (start_index <= 0) {
    Clear();
  } else {
    start_index--;
    restore_array.pop();
    context.putImageData(restore_array[start_index], 0, 0);
  }
}

function Clear() {
  context.fillStyle = "white";
  context.globalAlpha = 1;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillRect(0, 0, canvas.width, canvas.height);
  restore_array = [];
  start_index = -1;
  context.globalAlpha = line_opacity;
}

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
    if (!data.success) throw new Error("epäonnistui");

    const imageUrl = data.data.link;
    const googleFormData = new FormData();
    googleFormData.append(IMGUR_ID, imageUrl);
    googleFormData.append(NAME_ID, user_name.toLowerCase());

    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      body: googleFormData,
      mode: "no-cors",
    });

    statusText.textContent = "lähetetty! näkyy kunhan hyväksytään ♡";
    Clear();
    fetchImages();
  } catch (error) {
    console.error(error);
    statusText.textContent = "virhe lähetyksessä.";
  } finally {
    submitButton.disabled = false;
  }
});

// Gallerian selaustoiminto nuolinapeille
function scrollGallery(direction) {
  const gallery = document.getElementById("gallery");
  if (gallery) {
    gallery.scrollBy({ left: direction * 100, behavior: 'smooth' });
  }
}

async function fetchImages() {
  if (!DISPLAY_IMAGES) return;

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

      if (imgUrl.startsWith("http") && approved == "TRUE") {
        const div = document.createElement("div");
        div.classList.add("image-container");
        // Näkyy: [aika], taiteilija: [nimi]
        div.innerHTML = `
          <img src="${imgUrl}" alt="piirustus" class="drawbox">
          <div style="font-size: 5px; line-height: 1.2;">
            ${timestamp}<br>taiteilija: ${author}
          </div>
        `;
        gallery.appendChild(div);
      }
    });
  } catch (error) {
    console.error("Error fetching images:", error);
  }

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

function showDiv() {
  const dropdown = document.getElementById("palette");
  const selectedValue = dropdown.value;
  const divs = document.querySelectorAll(".colorPalette");

  divs.forEach(div => div.style.display = "none");
  document.getElementById(selectedValue).style.display = "grid";
}
showDiv();
