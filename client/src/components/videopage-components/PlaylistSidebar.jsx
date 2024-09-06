/* eslint-disable no-unused-vars */
import './playlistsidebar.css';
import React, { useEffect, useState } from 'react';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import PlaylistItem from './PlaylistItem'; // Import the PlaylistItem component

export default function PlaylistSidebar() {
  const [videos, setVideos] = useState([]);

  // Fetch video info from an API when the component mounts
  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('https://api.example.com/videos'); // Replace with your API endpoint
        const data = await response.json();
        setVideos(data); // Assuming the API returns an array of video info
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    }

    fetchVideos();
  }, []);

  return (
    <List sx={{ width: 700, maxWidth: 700, bgcolor: 'background.paper' }}>
      {videos.map((video) => (
        <React.Fragment key={video.id}>
          <PlaylistItem videoId={video.id} thumbnail={video.thumbnail} name={video.name} owner={video.owner}/> {/* Pass videoId as prop */}
          <Divider variant="inset" component="li" />
        </React.Fragment>
      ))}
    </List>
  );
}
