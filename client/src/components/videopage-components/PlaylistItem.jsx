/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React from 'react';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

export default function PlaylistItem({ videoId, thumbnail, name, owner }) {
  return (
    <ListItem
      sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center', 
        height: '250px',
      }}
    >
      <ListItemAvatar>
        <Avatar
         alt={`Thumbnail for video ID: ${videoId}`}
         src={thumbnail}
         variant="square"
         sx={{ width: 280, height: 200 }} />
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography
            variant="h6"  // Set the variant to control primary text appearance
            sx={{ fontSize: '20px', color: 'black' }}  // Custom font size and color for primary text
          >
            {name}
          </Typography>
        }
        secondary={
          <Typography
            component="span"
            variant="body2"
            sx={{ 
              color: 'text.primary', 
              fontSize: '16px', // Custom font size for secondary text
              display: 'block',
              marginTop: '4px'  // Add margin for spacing
            }}
          >
            {owner}
          </Typography>
        }
        sx={{
          textAlign: 'left',
          marginLeft: '20px',  // Adjust the spacing between avatar and text
        }}
      />
    </ListItem>
  );
}
