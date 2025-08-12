
// Core idea:
// When watching with dub, i always wonder where i know that voice from.
// This extension allows me to mark roles as recognizable
// And mark movies/series as seen
// I dont want to always show everything, thats why i also mark specific roles
// So i can mark something like Peter Griffin without marking everyone that every spoke something in Family Guy
//
// Technical 
// I keep track of a list of movie/series ids
// and of specific roles, as [germanSpeaker, roleName, series/movie_id]
// Displaying the roles is easy, but getting all movies/series is more annoying, so i just check their profile
// I display everything in a small popup table
// This is my first extension and for parts of it i got some AI help 
// but thats just because i never worked on extensions/javascript at all

const isMovie = window.location.pathname.includes("/film/");
const isSeries = window.location.pathname.includes("/serie/");
const mediaId = window.location.pathname.split("/").pop();
const mediaTitle = document.querySelector("h1").textContent;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function createMediaStar() {
  const header = document.querySelector("h1");
  const star = document.createElement("span");
  let media = await getMedia();

  star.className = "media-star";
  star.innerHTML = "☆";
  if (media && media.includes(window.location.pathname)) {
    star.innerHTML = "★";
  }
  star.dataset.mediaLink = window.location.pathname;

  star.addEventListener("click", callbackToggleMediaFavorite);
  header.insertBefore(star, header.firstChild);
}

async function createSpeakerStars() {
  const rows = document.querySelectorAll("table.table tbody tr");

  for (const row of rows) {
    const speakerCell = row.cells[1];
    const roleCell = row.cells[2];
    if (!speakerCell || !roleCell) return;

    const speakerLink = speakerCell.querySelector("a");
    if (!speakerLink) return; // Skip rows without speakers

    const speakerId = speakerLink.href.split("/")[4];
    const role = roleCell.textContent;

    const star = document.createElement("span");
    star.className = "favorite-star";
    star.innerHTML = "☆";
    star.dataset.speakerId = speakerId;
    star.dataset.role = role;
    star.dataset.media = mediaTitle;
    star.dataset.mediaLink = window.location.pathname;

    let speakerdata = await getSpeaker(speakerId);
    if (speakerdata) {
      let sublistStr = JSON.stringify([
        role,
        mediaTitle,
        window.location.pathname,
      ]);
      const index = speakerdata.findIndex(
        (s) => JSON.stringify(s) === sublistStr,
      );
      if (index != -1) {
        // console.log(role);
        star.innerHTML = "★";
      }
    }

    speakerCell.insertBefore(star, speakerCell.firstChild);

    speakerLink.addEventListener("mouseenter", (e) => {
      showSpeakerTooltip(e, speakerId);
    });
    speakerLink.addEventListener("mouseleave", () => {
      hideTooltip();
    });

    star.addEventListener("click", callbackToggleSpeakerFavorite);
  }
}

async function showSpeakerTooltip(e, speakerId) {
  hideTooltipInstant(); // Remove existing tooltip

  const tooltip = document.createElement("div");
  tooltip.className = "speaker-tooltip";
  let content = "";
  let data = await getSpeaker(speakerId);

  if (data) {
    content += `<table class="synchronkarteiTable"><tbody>`;
    for (const line of data) {
      content += `<tr><td>${line[0]}</td><td><a href=${line[2]}>${line[1]}</a></td></tr>`;
    }
  }

  if (e.shiftKey) {
    let media = await getMedia();
    let speakerhtml = await fetch(e.target.href);
    let parser = new DOMParser();
    let speakerdoc = parser.parseFromString(
      await speakerhtml.text(),
      "text/html",
    );
    let roles = speakerdoc.querySelectorAll("div.page ul li");
    let filteredNodes = Array.from(roles).filter((node) => {
      return Array.from(node.querySelectorAll("a[href]")).some((link) =>
        media.some((allowed) => link.href.includes(allowed)),
      );
    });
    let parsedNodes = await Promise.all(
      filteredNodes.map((node) => parseListElement(node)),
    );

    if (parsedNodes && parsedNodes.length>0) {
      if (!content) content += `<table class="synchronkarteiTable"><tbody>`;
      for (const node of parsedNodes) {
        content += `<tr class="seenRow"><td>${node[0]}</td><td><a href=${node[1]}>${node[2]}</a></td></tr>`;
      }
    }
  }

  if (!content) return;
  content += `</tbody></table>`;
  tooltip.mouseIsOver = false;
  tooltip.onmouseover = function () {
    this.mouseIsOver = true;
  };
  tooltip.onmouseout = function () {
    this.mouseIsOver = false;
    hideTooltip();
  };
  tooltip.innerHTML = content;
  let stylesheet = document.createElement("style");
  stylesheet.textContent = `
  table.synchronkarteiTable tr:first-child {
    border-top: 0;
  }
  table.synchronkarteiTable tr {
    border-top: 1px solid #ddd;
  }
  table.synchronkarteiTable tr td:first-child {
    padding-left: 0px;
  }
  table.synchronkarteiTable tr td {
    padding: 3px 0px 3px 10px;
  }
  .table-separator {
    height: 5px;
    background-color: #ccc; /* or transparent */
  }
  .seenRow {
    background-color: #eee;
  }
`;
  tooltip.appendChild(stylesheet);

  tooltip.style.position = "fixed";
  tooltip.style.zIndex = 9999;
  tooltip.style.background = "white";
  tooltip.style.border = "1px solid #ccc";
  tooltip.style.padding = "6px";
  tooltip.style.borderRadius = "4px";
  tooltip.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

  document.body.appendChild(tooltip);

  // Position tooltip
  const rect = e.target.getBoundingClientRect();
  const padding = 10;
  let left = rect.left;
  let top = rect.top - tooltip.offsetHeight - padding;

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

async function parseListElement(element) {
  let rolename = element.querySelector("em");
  if (rolename) {
    let links = element.querySelectorAll("a");
    for (let vlink of links) {
      if (vlink.href.includes("/film") || vlink.href.includes("/serie")) {
        return [rolename["textContent"], vlink["href"], vlink["innerText"]];
      }
    }
    console.log("Synchronkartei Highlighter: Could not parse row.", element);
  } else {
    return [
      element.firstChild["textContent"].trim().slice(4).split("\n")[0],
      element.children[0]["href"],
      element.children[0]["innerText"],
    ];
  }
}

async function hideTooltip() {
  const tooltip = document.querySelector(".speaker-tooltip");
  await delay(500);
  if (tooltip && !tooltip.mouseIsOver) tooltip.remove();
}

async function hideTooltipInstant() {
  const tooltip = document.querySelector(".speaker-tooltip");
  if (tooltip) tooltip.remove();
}

async function callbackToggleSpeakerFavorite(event) {
  let res = await toggleSpeakerEntry(event.target.dataset.speakerId, [
    event.target.dataset.role,
    event.target.dataset.media,
    event.target.dataset.mediaLink,
  ]);
  if (res) {
    event.target.innerHTML = "★";
  } else {
    event.target.innerHTML = "☆";
  }
}

async function callbackToggleMediaFavorite(event) {
  let res = await toggleMediaEntry(event.target.dataset.mediaLink);
  if (res) {
    event.target.innerHTML = "★";
  } else {
    event.target.innerHTML = "☆";
  }
}
async function toggleSpeakerEntry(speaker, entry) {
  if (!speaker || !entry) {
    console.log("Synchronkartei Highlighter: ToggleSpeakerEntry called invalidly", speaker, entry);
    return;
  }
  let store = await browser.storage.local.get("lists");
  let lists = store.lists || {};

  if (!lists[speaker]) {
    lists[speaker] = [];
  }

  const sublistStr = JSON.stringify(entry);
  const index = lists[speaker].findIndex(
    (s) => JSON.stringify(s) === sublistStr,
  );
  let res = false;
  if (index === -1) {
    lists[speaker].push(entry);
    res = true;
  } else {
    lists[speaker].splice(index, 1);
    if (lists[speaker].length === 0) {
      delete lists[speaker];
    }
  }

  await browser.storage.local.set({ lists });
  return res;
}

async function toggleMediaEntry(entry) {
  if (!entry) {
    console.log("Synchronkartei Highlighter: ToggleMediaEntry called invalidly", entry);
    return;
  }
  let store = await browser.storage.local.get("media");
  let media = store.media;
  if (!media) {
    media = [];
  }
  let res = false;
  const index = media.findIndex((s) => entry === s);
  if (index === -1) {
    media.push(entry);
    res = true;
  } else {
    media.splice(index, 1);
  }
  await browser.storage.local.set({ media });
  return res;
}

async function getMedia() {
  let store = await browser.storage.local.get("media");
  let media = store.media;
  return media;
}

async function getSpeaker(speaker) {
  let store = await browser.storage.local.get("lists");
  let lists = store.lists;
  return lists && lists[speaker] ? lists[speaker] : null;
}

// main body
if (isMovie || isSeries) {
  createSpeakerStars();
  createMediaStar();
}
