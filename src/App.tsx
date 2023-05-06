import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';

const App = () => {
  const [title, setTitle] = useState('');

  return (
    <Box
      bgcolor="#fefefe"
      borderBottom="1px dashed #ddd"
      borderLeft="1px dashed #ddd"
      borderRight="1px dashed #ddd"
      height="fit-content"
      margin="auto"
      maxWidth="lg"
      minHeight="80vh"
    >
      <Navbar />
      <Typography
        lineHeight={2}
        marginX={2}
        variant="h4"
      >
        {title}
      </Typography>
      <Outlet context={{ setTitle }} />
    </Box>
  );
};

export default App;
