console.log("hello world");

function hide_sidebar() {
  let sidebar = document.getElementsByClassName("sidebar")[0];
  sidebar.style.display = "none";
}

document.addEventListener("click", function (event) {
  let sidebar = document.querySelector(".sidebar");
  if (sidebar && !sidebar.contains(event.target)) {
    hide_sidebar();
  }
});

function open_sidebar(event) {
  event.stopPropagation(); // Prevent the click event from bubbling up to the document
  let sidebar = document.getElementsByClassName("sidebar")[0];
  sidebar.style.display = "block";
}

/* The speed/duration of the effect in milliseconds */
var text = "! Eager to design effective solutions for real-world challenges.";
var i = 0;
var speed = 100;
function typeWriter() {
  if (i < text.length) {
    document.getElementById("typed-text").innerHTML += text.charAt(i);
    i++;
    setTimeout(typeWriter, speed);
  }
}
typeWriter();

function updateSkills() {
  const container = document.querySelector(".grid-container4");
  const skills = {
    Javascript: "50",
    Python: "90",
    CSS: "80",
    R: "30",
    C: "50",
    Java: "40",
    HTML: "60",
  };
  let windowWidth = screen.width;
  let index = 0;

  for (let skill in skills) {
    let element;

    if (index < container.children.length) {
      element = container.children[index];
    } else {
      element = document.createElement("div");
      element.className = "item-4 rancho";
      container.appendChild(element);
    }

    element.textContent = skill;
    var width = skills[skill];
    var width2;

    if (windowWidth < 600) {
      width2 = Math.round(width / 3.2) + "0px";
    } else {
      width2 = width / 2 + "0px";
    }

    element.style.setProperty("--item-4-after-width", width2);
    index++;
  }
}

// Initial call to set up the skills
updateSkills();

// Update skills on window resize
window.addEventListener("resize", updateSkills);

skills();
