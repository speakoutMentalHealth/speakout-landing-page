import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("SpeakOut TV uses a real search form, video-first recommendations and channel navigation",()=>{
  const html=read("tv.html");
  assert.match(html,/class="tv-ios youth-tv tv-clean"/);
  assert.match(html,/class="tv-search-form" role="search" method="get" action="tv-search\.html"/);
  assert.match(html,/name="q"/);
  assert.match(html,/id="for-you"/);
  assert.match(html,/id="tell-my-story"/);
  assert.ok(html.indexOf('id="for-you"')<html.indexOf('id="featured"'));
  assert.ok(html.indexOf('id="tell-my-story"')<html.indexOf('id="featured"'));
  assert.match(html,/href="pages\/tell-my-story\.html"/);
  assert.match(html,/css\/tv\/video-first\.css/);
});
test("Video-first styles are responsive without losing existing controls",()=>{
  const css=read("css/tv/video-first.css");
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/#for-you \.content-rail/);
  assert.match(css,/\.youth-nav/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/@media\(min-width:1050px\)/);
  const js=read("js/speakout-tv.js");
  for (const name of ["loadTvEpisodes","playEpisode","renderForYou","renderShelf","routeTvHash"]) assert.ok(js.includes(name),name);
});
test("Tell My Story has a channel header, tabs, film and managed interview collection",()=>{
  const page=read("pages/tell-my-story.html");
  const css=read("css/tv/tell-my-story-channel.css");
  const loader=read("js/tell-my-story-page.js");
  for (const id of ["shift","interviews","about","tmsContentGrid","tmsContentStatus"])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(page,/SHIFT: Do What Moves You/);
  assert.match(page,/https:\/\/www\.tellmystory\.org\/films\/shift/);
  assert.match(page,/private support conversations are never recorded/i);
  assert.match(page,/js\/account-controls\.js/);
  assert.match(css,/tms-channel-banner/);
  assert.match(css,/tms-card-thumb/);
  assert.match(loader,/loadTvEpisodes/);
});
test("Browse, Watch, Series and Listen share the video-first theme",()=>{
  const css=read("css/tv/video-subpages.css");
  assert.match(css,/\.discovery-media-grid/);
  assert.match(css,/\.watch-player-shell/);
  assert.match(css,/\.listen-library-grid/);
  for (const path of ["tv-search.html","watch.html","show.html","radio.html"]){
    const html=read(path);
    assert.match(html,/tv-clean tv-video-subpage/);
    assert.match(html,/css\/tv\/video-subpages\.css/);
    assert.match(html,/js\/account-controls\.js/);
  }
});
test("PWA includes updated styles and protected interview page",()=>{
  const sw=read("tv-sw.js");
  assert.match(sw,/speakout-tv-v20/);
  for(const asset of ["./css/tv/video-first.css","./css/tv/video-subpages.css","./css/tv/tell-my-story-channel.css","./pages/tell-my-story.html","./js/tell-my-story-page.js"])
    assert.ok(sw.includes(asset),asset);
});
