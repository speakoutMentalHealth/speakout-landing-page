// tracking-connection-snippets.js
// This file is NOT required by the website.
// It only stores the snippets you need to paste into your pages.

// e-library.html import:
import { trackBookOpen, trackBookDownload } from "./progress-tracker.js";

// e-library.html inside openBook(index), after const b = allBooks[index];
trackBookOpen(b);

// e-library.html after download.href = ...
download.onclick = () => trackBookDownload(b);


// speakhub.html import:
import { trackCourseStart } from "./progress-tracker.js";

// speakhub.html inside openCourse(index), after const c = allCourses[index];
trackCourseStart(c);

// speakhub.html after courseLink.href = ...
courseLink.onclick = () => trackCourseStart(c);


// kiddies.html import:
import { trackBookOpen, trackBookDownload, trackCourseStart } from "./progress-tracker.js";

// kiddies.html inside openItem(index), after const item = allItems[index];
if(item.sourceType === "course"){
  trackCourseStart(item);
}else{
  trackBookOpen(item);
}

// kiddies.html after main.href = ...
main.onclick = () => {
  if(item.sourceType === "course"){
    trackCourseStart(item);
  }else{
    trackBookOpen(item);
  }
};

// kiddies.html after extra.href = ...
extra.onclick = () => {
  if(item.sourceType === "course"){
    trackCourseStart(item);
  }else{
    trackBookDownload(item);
  }
};
