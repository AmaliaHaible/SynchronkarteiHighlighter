// Put all the javascript code here, that you want to execute after page load.

const isMovie = window.location.pathname.includes("/film/");
const isSeries = window.location.pathname.includes("/serie/");
const mediaId = window.location.pathname.split("/").pop();
const mediaTitle = document.querySelector("h1").textContent;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function createMediaStar() {
  const header = document.querySelector("h1");
  const star = document.createElement("span");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  let media = await getMedia();
  // if (media && media.includes(window.location.pathname)) {
  //   svg.setAttribute("fill", "yellow");
  // } else {
  //   svg.setAttribute("fill", "none"); // default fill
  // }
  // console.log(svg);
  // svg.setAttribute("width", "24");
  // svg.setAttribute("height", "24");
  // svg.setAttribute("viewBox", "0 0 24 24");
  // svg.setAttribute("stroke", "black");
  // svg.setAttribute("stroke-width", "2");
  //
  // const polygon = document.createElementNS(
  //   "http://www.w3.org/2000/svg",
  //   "polygon",
  // );
  // polygon.setAttribute(
  //   "points",
  //   "12,2 15,11 24,11 17,16 20,24 12,19 4,24 7,16 0,11 9,11",
  // );
  //
  // svg.appendChild(polygon);
  // svg.id = "media-star";
  // svg.dataset.mediaLink = window.location.pathname;
  // console.log(svg.dataset.mediaLink );
  // svg.addEventListener("click", callbackToggleMediaFavorite);
  // header.insertBefore(svg, header.firstChild);
  // console.log(svg);

  star.className = "media-star";
  star.innerHTML = "☆";
  if (media && media.includes(window.location.pathname)) {
    star.innerHTML = "★";
  }
  // header.appendChild(star);
  star.dataset.mediaLink = window.location.pathname;

  star.addEventListener("click", callbackToggleMediaFavorite);
  header.insertBefore(star, header.firstChild);
  // console.log(star);
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

    // speakerCell.appendChild(star);
    speakerCell.insertBefore(star, speakerCell.firstChild);

    // Add hover tooltip
    speakerLink.addEventListener("mouseenter", (e) => {
      showSpeakerTooltip(e, speakerId);
    });
    speakerLink.addEventListener("mouseleave", () => {
      hideTooltip();
    });

    // Click handler
    star.addEventListener("click", callbackToggleSpeakerFavorite);
  }
}

async function showSpeakerTooltip(e, speakerId) {
  hideTooltipInstant(); // Remove existing tooltip

  // Create tooltip
  const tooltip = document.createElement("div");
  tooltip.className = "speaker-tooltip";
  let content = "";
  let data = await getSpeaker(speakerId);

  if (data) {
    content += `<table class="synchronkarteiTable"><tbody>`;
    for (const line of data) {
      content += `<tr><td>${line[0]}</td><td><a href=${line[2]}>${line[1]}</a></td></tr>`;
    }
    // content += `</tbody></table>`;
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
    // console.log("rolename ", rolename["textContent"]);
    let links = element.querySelectorAll("a");
    for (let vlink of links) {
      // console.log("link ", vlink, vlink.href);
      if (vlink.href.includes("/film") || vlink.href.includes("/serie")) {
        // console.log("rolename, link", rolename, vlink);
        return [rolename["textContent"], vlink["href"], vlink["innerText"]];
      }
    }
    console.log("OOOPS");
  } else {
    // console.log(element);
    // console.log("NOT FOUND, ", element.firstChild["textContent"].trim().slice(4).split("\n")[0], element.firstChild);
    // console.log(element.children[0]);
    return [
      element.firstChild["textContent"].trim().slice(4).split("\n")[0],
      element.children[0]["href"],
      element.children[0]["innerText"],
    ];
  }
}

// Hide tooltip
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

  // let data = await getSpeaker(event.target.dataset.speakerId);
  // console.log(data);
}

async function callbackToggleMediaFavorite(event) {
  let res = await toggleMediaEntry(event.target.dataset.mediaLink);
  // console.log("callbackToggleMediaFavorite res", res);
  if (res) {
    event.target.innerHTML = "★";
  } else {
    event.target.innerHTML = "☆";
  }
}
async function toggleSpeakerEntry(speaker, entry) {
  if (!speaker || !entry) {
    console.log("ToggleSpeakerEntry called invalidly", speaker, entry);
    return;
  }
  let store = await browser.storage.local.get("lists");
  let lists = store.lists || {};
  // console.log("store: " + store, " lists: ", lists);

  if (!lists[speaker]) {
    lists[speaker] = [];
  }

  const sublistStr = JSON.stringify(entry);
  // console.log(lists[speaker]);
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
      delete lists[speaker]; // optional cleanup
    }
  }
  // console.log("ToggleSpeakerEntry, new state:", lists[speaker]);

  await browser.storage.local.set({ lists });
  return res;
}

async function toggleMediaEntry(entry) {
  if (!entry) {
    console.log("ToggleMediaEntry called invalidly", entry);
    return;
  }
  // console.log("ToggleMediaEntry called with ", entry);
  let store = await browser.storage.local.get("media");
  let media = store.media;
  if (!media) {
    media = [];
  }
  let res = false;
  const index = media.findIndex((s) => entry === s);
  // console.log("ToggleMediaEntry current state, index ", media, index);
  if (index === -1) {
    media.push(entry);
    res = true;
  } else {
    media.splice(index, 1);
  }
  await browser.storage.local.set({ media });
  // console.log("ToggleMediaEntry, new state, retval: ", media, res);
  return res;
}

async function getMedia() {
  let store = await browser.storage.local.get("media");
  let media = store.media;
  return media;
}

// Get all sublists for a key
async function getSpeaker(speaker) {
  let store = await browser.storage.local.get("lists");
  let lists = store.lists;
  // console.log(lists.lists)
  return lists && lists[speaker] ? lists[speaker] : null;
}

if (isMovie || isSeries) {
  createSpeakerStars();
  createMediaStar();
}
