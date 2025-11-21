// ConfirmationDialog.jsx
import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

const ConfirmationDialog = ({ open, title, description, loading, onConfirm, onCancel }) => (
  <Dialog 
    open={open} 
    onClose={onCancel} 
    maxWidth="xs" 
    fullWidth
    sx={{
      '& .MuiDialog-paper': {
        margin: { xs: '16px', sm: '32px' }, // Smaller margin on mobile
        maxHeight: { xs: '90vh', sm: 'none' }, // Limit height on mobile
        borderRadius: { xs: '12px', sm: '8px' }, // More rounded corners on mobile
      }
    }}
  >
    <DialogTitle 
      sx={{ 
        fontSize: { xs: '1.125rem', sm: '1.25rem' }, // Smaller font on mobile
        padding: { xs: '16px', sm: '24px 24px 20px' } // Adjust padding for mobile
      }}
    >
      {title}
    </DialogTitle>
    <DialogContent 
      sx={{ 
        padding: { xs: '0 16px 8px', sm: '0 24px 20px' } // Adjust padding for mobile
      }}
    >
      <Typography 
        variant="body1" 
        color="textSecondary"
        sx={{
          fontSize: { xs: '0.875rem', sm: '1rem' }, // Smaller text on mobile
          lineHeight: { xs: 1.4, sm: 1.5 }
        }}
      >
        {description}
      </Typography>
    </DialogContent>
    <DialogActions 
      sx={{ 
        padding: { xs: '8px 16px 16px', sm: '8px 24px 24px' }, // Adjust padding for mobile
        flexDirection: { xs: 'column-reverse', sm: 'row' }, // Stack buttons vertically on mobile
        gap: { xs: '8px', sm: '8px' }
      }}
    >
      <Button 
        onClick={onCancel} 
        disabled={loading} 
        color="inherit" 
        variant="outlined"
        sx={{
          width: { xs: '100%', sm: 'auto' }, // Full width on mobile
          minHeight: { xs: '44px', sm: '36px' } // Larger touch target on mobile
        }}
      >
        Cancel
      </Button>
      <Button 
        onClick={onConfirm} 
        disabled={loading} 
        variant="contained"
        sx={{
          width: { xs: '100%', sm: 'auto' }, // Full width on mobile
          minHeight: { xs: '44px', sm: '36px' }, // Larger touch target on mobile
          backgroundColor: '#ef4444', // Softer red (equivalent to red-500)
          '&:hover': {
            backgroundColor: '#dc2626', // Slightly darker on hover (red-600)
          },
          '&:disabled': {
            backgroundColor: '#fca5a5', // Lighter red when disabled (red-300)
          }
        }}
      >
        {loading ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);

ConfirmationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string,
  description: PropTypes.string,
  loading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmationDialog;
