/* eslint-disable no-unused-vars */
import React from 'react';
import './videopage.css';
import Video from './Video';
import VideoDisplay from './VideoDisplay';
import WatchHistory from './WatchHistory';
import PlaylistSidebar from './PlaylistSidebar';

function VideoPage() {
  return (
      <div className="video-page">
         < VideoDisplay />
         < PlaylistSidebar />
      </div>

  );
}

export default VideoPage;
