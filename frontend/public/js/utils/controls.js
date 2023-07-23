document.addEventListener("DOMContentLoaded", () => {
  let tabs = document.querySelectorAll(".tabs");
  M.Tabs.init(tabs);

  let fabs = document.querySelectorAll(".fixed-action-btn");
  M.FloatingActionButton.init(fabs, {
    direction: "bottom",
    hoverEnabled: false,
  });

  let modals = document.querySelectorAll(".modal");
  M.Modal.init(modals, {
    opacity: 0.49,
  });

  let dropdowns = document.querySelectorAll(".dropdown");
  M.Dropdown.init(dropdowns, { 
    coverTrigger: false 
  });

  let selects = document.querySelectorAll("select");
  M.FormSelect.init(selects, { 
    coverTrigger: false 
  });

  let tooltips = document.querySelectorAll(".tooltipped");
  M.Tooltip.init(tooltips, {
    enterDelay: 0,
    exitDelay: 0,
    inDuration: 100,
    outDuration: 100,
    position: 'left'
  });

  for (const toggle of document.getElementsByClassName('toggles-content')) {
    toggle.addEventListener('click', () => {
      const toggeable = document.getElementById(toggle.getAttribute('target'));
      
      const icon = toggle.querySelector("i"); 
      if (icon.textContent === "arrow_drop_down") {
        icon.textContent = "arrow_drop_up";
      } else {
        icon.textContent = "arrow_drop_down";
      }
      toggeable.classList.toggle('closed');
    });
  }

  for (const toggle of document.getElementsByClassName('toggle-map')) {
    toggle.addEventListener('click', () => {
      document.querySelector('#' + toggle.getAttribute('target') + '-container .minimap-view-container').classList.toggle('scale-out');
    });
  }

});

const sidebarToggles = document.getElementsByClassName("toggles-sidebar");
const btnToggleSideBar = document.getElementById("btnToggleSideBar");

function slideIn() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("bar-sliding-out");
  sidebar.classList.add("bar-sliding-in");

  const icon = document.getElementById("iconToggleSideBar");
  icon.classList.remove("icon-sliding-out");
  icon.classList.add("icon-sliding-in");
}

function slideOut() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("bar-sliding-in");
  sidebar.classList.add("bar-sliding-out");

  const icon = document.getElementById("iconToggleSideBar");
  icon.classList.remove("icon-sliding-in");
  icon.classList.add("icon-sliding-out");
}

function toggleSidebar() {
  if (btnToggleSideBar.classList.contains("active")) {
    slideOut();
  } else {
    slideIn();
  }
  btnToggleSideBar.classList.toggle("active");
  
  setTimeout(() => {
    document.dispatchEvent(new CustomEvent("reinit-minimap"));
  }, 250); // wait for animation to finish
}

function setTabFromDirectControl(srcID, toggleIfOpen=true) {
  if (document.getElementById(srcID).classList.contains("active") && toggleIfOpen) {
    toggleSidebar();
  } else {
    const tabs = document.querySelector(".tabs");
    M.Tabs.getInstance(tabs).select(srcID);
    !btnToggleSideBar.classList.contains("active") && toggleSidebar();
  }
}

function showRepairsTab(toggleIfOpen=true) {  
  setTabFromDirectControl("sidebarRepairs", toggleIfOpen);
}

function showSettingsTab(toggleIfOpen=true) {
  setTabFromDirectControl("sidebarSettings", toggleIfOpen);
}

for (const c of sidebarToggles) {
  c.addEventListener("click", toggleSidebar);
}

const settingsSidebar = document.getElementById("sidebarSettings");
const settingsButton = document.getElementById("showSettingsMenuButton");

if (settingsSidebar) { 
  settingsButton.addEventListener("click", showSettingsTab);
} else {
  settingsButton.style.display = "none";
}

function startRedrawCSS() {
  document.querySelectorAll('.svg-pan-zoom-control').forEach(e => e.classList.add("redraw"));
}

function finishRedrawCSS() {
  document.querySelectorAll('.svg-pan-zoom-control').forEach(e => e.classList.remove("redraw"));
  document.dispatchEvent(new CustomEvent("reinit-minimap"));
}

function resizable(resizer) {
  const direction = resizer.getAttribute('data-direction') || 'horizontal';
  const prevSibling = resizer.previousElementSibling;
  const nextSibling = resizer.nextElementSibling;

  // The current position of mouse
  let x = 0;
  let y = 0;
  let prevSiblingHeight = 0;
  let prevSiblingWidth = 0;

  // Handle the mousedown event
  // that's triggered when user drags the resizer
  const mouseDownHandler = function (e) {
      // Get the current mouse position
      x = e.clientX;
      y = e.clientY;
      const rect = prevSibling.getBoundingClientRect();
      prevSiblingHeight = rect.height;
      prevSiblingWidth = rect.width;

      // Attach the listeners to `document`
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
  };

  const mouseMoveHandler = function (e) {
      // How far the mouse has been moved
      const dx = e.clientX - x;
      const dy = e.clientY - y;

      switch (direction) {
          case 'vertical':
              const h =
                  ((prevSiblingHeight + dy) * 100) /
                  resizer.parentNode.getBoundingClientRect().height;
              prevSibling.style.height = `${h}%`;
              break;
          case 'horizontal':
          default:
              const w =
                  ((prevSiblingWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;
              prevSibling.style.width = `${w}%`;
              break;
      }

      const cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      resizer.style.cursor = cursor;
      document.body.style.cursor = cursor;

      prevSibling.style.userSelect = 'none';
      prevSibling.style.pointerEvents = 'none';

      nextSibling.style.userSelect = 'none';
      nextSibling.style.pointerEvents = 'none';
      startRedrawCSS();
  };

  const mouseUpHandler = function () {
      resizer.style.removeProperty('cursor');
      document.body.style.removeProperty('cursor');

      prevSibling.style.removeProperty('user-select');
      prevSibling.style.removeProperty('pointer-events');

      nextSibling.style.removeProperty('user-select');
      nextSibling.style.removeProperty('pointer-events');

      // Remove the handlers of `mousemove` and `mouseup`
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      finishRedrawCSS();  
  };

  document.onkeydown = function(e) {
    if (e.altKey) { // option for mac, must be disabled on windows
      e.preventDefault();
    }
  }
  document.onkeyup = function(e) {
    startRedrawCSS();
    const which = e.which || e.buttons;
    if ( (e.ctrlKey || e.altKey) && which == 39) {
      prevSibling.style.width = '100%';
    } else if ( (e.ctrlKey || e.altKey) && which == 37) {
      prevSibling.style.width = '0%';
    }
    finishRedrawCSS();
  };

  // Attach the handler
  resizer.addEventListener('mousedown', mouseDownHandler);
};

// Query all resizers
document.querySelectorAll('.resizer').forEach(function (ele) {
  resizable(ele);
});

// redirection for demos
async function loadExample(name, id) {
  document.getElementById("examples").classList.add("hidden");
  document.getElementById("generating-example").classList.remove("hidden");
  
  const response = await fetch("/create?example=" + name + "&id=" + id);
  console.log(response)
  console.log(response.ok)
  if (response.ok) {
    window.location.href = "/?id=" + id;
  } else {
    document.getElementById("generating-example").innerHTML = "Something went wrong. Please reload this page and try again. If the problem persists, feel free to contact the authors";
  }
}
