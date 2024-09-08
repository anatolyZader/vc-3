import * as React from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import VideoCard from './VideoCard';

export default function VideoLibrary() {
  const [videos, setVideos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Replace with actual API call
    fetch('https://api.example.com/videos') // Example API endpoint
      .then((response) => response.json())
      .then((data) => {
        setVideos(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching videos:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Box container spacing={3}> 
        {videos.map((video) => (
          <Box item xs={12} sm={6} md={4} lg={3} key={video.id}>
            <VideoCard video={video} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}