/* eslint-disable no-unused-vars */
import React from 'react';
import YouTube from "react-youtube";
import './video.css';

const Video = () => {
  const opts = {
    height: '590',
    width: '968',
    borderRadius: "2rem",
    playerVars: { autoplay: 1 },
  };

  const videoReady = (event) => {
    event.target.pauseVideo();
  };

  return (
    <>
      <div>
        <div
          style={{
            maxWidth: "1200px",
            margin: "auto",
            marginTop: "12px",
            minHeight: "30vh",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <YouTube
            videoId="e1jkA-ee_aY"
            opts={opts}
            onReady={videoReady}
          />
        </div>
      </div>
    </>
  );
};
export default Video;
