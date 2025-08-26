import React, { useRef, useCallback } from 'react';
import { Box, Container, Grid } from '@mui/material';
import { RecoilRoot } from 'recoil';
import { SWRConfig } from 'swr';
import PaneA from '@/components/PaneA';
import ItemDetailForm from '@/components/ItemDetailForm';
import type { DetailFormHandle, AutoSaveReason } from '@/lib/types';

const HomePage: React.FC = () => {
  const detailRef = useRef<DetailFormHandle>(null);

  const autoSaveGate = useCallback(async (reason: AutoSaveReason): Promise<boolean> => {
    if (!detailRef.current) return true;
    
    const result = await detailRef.current.saveIfDirty(reason);
    return result === 'saved' || result === 'noop';
  }, []);

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <RecoilRoot>
        <Container maxWidth="xl">
          <Box py={2}>
            <h1>React Autosave Sample</h1>
            <Grid container spacing={2} sx={{ height: '80vh' }}>
              <Grid item xs={6}>
                <Box border={1} borderColor="grey.300" borderRadius={1} height="100%">
                  <PaneA autoSaveGate={autoSaveGate} />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box border={1} borderColor="grey.300" borderRadius={1} height="100%">
                  <ItemDetailForm ref={detailRef} />
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </RecoilRoot>
    </SWRConfig>
  );
};

export default HomePage;