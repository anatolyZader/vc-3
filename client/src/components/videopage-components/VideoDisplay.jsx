/* eslint-disable no-unused-vars */
import React from 'react';
import './videodisplay.css';
import Video from './Video';
import PauseAnalyzeBtn from './PauseAnalyzeBtn';


function VideoDisplay() {
  return (
      <div className="video-display">
        < Video className="video" />
        < PauseAnalyzeBtn />
      </div>

  );
}

export default VideoDisplay;
