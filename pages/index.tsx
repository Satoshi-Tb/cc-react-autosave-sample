import React from 'react';
import { Container, Box, Button, Typography } from '@mui/material';
import Link from 'next/link';

const HomePage: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Typography variant="h2" component="h1" gutterBottom>
          React Autosave Sample
        </Typography>
        <Typography variant="body1" paragraph>
          このアプリケーションでは、2つの異なる方法で自動保存機能を実装しています：
        </Typography>
        
        <Box display="flex" flexDirection="column" gap={2} mt={4}>
          <Link href="/forward-ref" passHref>
            <Button variant="contained" size="large" component="a">
              forwardRef + useImperativeHandle 版
            </Button>
          </Link>
          <Typography variant="body2" color="textSecondary" ml={2}>
            Recoil を使った状態管理と、forwardRef で画面間通信を実装
          </Typography>
          
          <Link href="/context-api" passHref>
            <Button variant="contained" size="large" component="a" color="secondary">
              Context API 版
            </Button>
          </Link>
          <Typography variant="body2" color="textSecondary" ml={2}>
            Context API を使って画面間の自動保存通信を実装
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default HomePage;