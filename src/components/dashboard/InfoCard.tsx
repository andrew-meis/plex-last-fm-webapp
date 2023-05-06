import { Box, SvgIcon, Typography } from '@mui/material';
import React from 'react';

type InfoCardProps = {
  color: string;
  icon: React.ReactNode;
  count: number | undefined;
  text: string;
}

const InfoCard = ({ color, icon, count, text }: InfoCardProps) => (
  <Box bgcolor={color} borderRadius="4px" display="flex" height="60px" m="4px">
    <SvgIcon
      sx={{ alignSelf: 'center', color: 'white', width: '1.6em', height: '1.6em', ml: '8px' }}
    >
      {icon}
    </SvgIcon>
    <Box alignSelf="center" color="white" ml="auto" mr="8px" textAlign="right">
      <Typography lineHeight={1} variant="h6">{count}</Typography>
      <Typography variant="caption">{text}</Typography>
    </Box>
  </Box>
);

export default InfoCard;
