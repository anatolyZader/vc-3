/* eslint-disable no-useless-escape */
// youtubeDataAdapter.js
// based on 
const { google } = require('googleapis');
const fetch = require('node-fetch'); // Make sure to install node-fetch
const fs = require('fs');
const path = require('path');

class YoutubeDataAdapter {
  constructor(youtubeApiKey) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: youtubeApiKey
    });
  }

  // eslint-disable-next-line no-unused-vars
  fetchVideoData(videoYoutubeID) {
    // Fetch video data from YouTube API
    const id = 'mock id';
    const title = 'mock title';
    const author = 'mock author';
    const duration = 0;
    const description = 'mock description';
    const videoInfoDto = { id, title, author, duration, description };
    return videoInfoDto;
  }

  async getSubs(videoId) {
    const langCode = 'en';
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const text = await response.text();
    const json = JSON.parse(text.split('ytInitialPlayerResponse = ')[1].split(';var')[0]);
    const captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;

    const findCaptionUrl = x => captionTracks.find(y => y.vssId.indexOf(x) === 0)?.baseUrl;
    const firstChoice = findCaptionUrl(`.${langCode}`);
    const url = firstChoice ? firstChoice + "&fmt=json3" : (findCaptionUrl(".") || findCaptionUrl(`a.${langCode}`) || captionTracks[0].baseUrl) + "&fmt=json3&tlang=" + langCode;

    const subsResponse = await fetch(url);
    const subsJson = await subsResponse.json();

    return subsJson.events.map(event => ({
      ...event,
      text: event.segs?.map(seg => seg.utf8)?.join(" ")?.replace(/\n/g, ' ')?.replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')?.trim() || ''
    }));
  }

  async logSubs(videoId, langCode) {
    const subs = await this.getSubs(videoId, langCode);
    const text = subs.map(sub => sub.text).join('\n');
    console.log(text);
    return text;
  }

  async downloadTranscript(videoId, langCode = 'en') {
    const text = await this.logSubs(videoId, langCode);
    const filePath = path.join(__dirname, 'subs.txt');
    fs.writeFileSync(filePath, text);
    return filePath;
  }
}

module.exports = YoutubeDataAdapter;
