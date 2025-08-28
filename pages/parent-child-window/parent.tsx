import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Box, Container, Button, Typography, Alert } from '@mui/material';
import Link from 'next/link';

type SaveResult = 'saved' | 'noop' | 'error';

type SaveRequest = {
  type: 'SAVE_REQUEST';
  requestId: string;
};

type SaveResponse = {
  type: 'SAVE_RESPONSE';
  requestId: string;
  result: SaveResult;
};

type PostMessageData = SaveRequest | SaveResponse;

const ParentPage: React.FC = () => {
  const childWindowRef = useRef<Window | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isChildOpen, setIsChildOpen] = useState(false);

  // Clean up child window on unmount
  useEffect(() => {
    return () => {
      if (childWindowRef.current && !childWindowRef.current.closed) {
        childWindowRef.current.close();
      }
    };
  }, []);

  // Open child window
  const openChildWindow = useCallback(() => {
    if (childWindowRef.current && !childWindowRef.current.closed) {
      childWindowRef.current.focus();
      return;
    }

    const childUrl = `/parent-child-window/child`;
    const childWindow = window.open(
      childUrl,
      'childWindow',
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );

    if (childWindow) {
      childWindowRef.current = childWindow;
      setIsChildOpen(true);
      setStatus('子ウィンドウを開きました');

      // Monitor child window close
      const checkClosed = setInterval(() => {
        if (childWindow.closed) {
          clearInterval(checkClosed);
          setIsChildOpen(false);
          setStatus('子ウィンドウが閉じられました');
          childWindowRef.current = null;
        }
      }, 1000);
    } else {
      setStatus('子ウィンドウの開閉に失敗しました');
    }
  }, []);

  // Send save request to child window
  const requestSave = useCallback(async (): Promise<SaveResult> => {
    if (!childWindowRef.current || childWindowRef.current.closed) {
      throw new Error('子ウィンドウが開かれていません');
    }

    const requestId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const request: SaveRequest = {
      type: 'SAVE_REQUEST',
      requestId
    };

    return new Promise<SaveResult>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      
      const handleMessage = (event: MessageEvent<PostMessageData>) => {
        if (event.data.type === 'SAVE_RESPONSE' && event.data.requestId === requestId) {
          clearTimeout(timeoutId);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.result);
        }
      };

      // Set up timeout (5 seconds)
      timeoutId = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        reject(new Error('保存リクエストがタイムアウトしました'));
      }, 5000);

      // Listen for response
      window.addEventListener('message', handleMessage);

      // Send request
      childWindowRef.current!.postMessage(request, window.location.origin);
    });
  }, []);

  // Handle save button click
  const handleSave = useCallback(async () => {
    try {
      setStatus('保存リクエストを送信中...');
      const result = await requestSave();
      
      switch (result) {
        case 'saved':
          setStatus('✅ 保存が完了しました');
          break;
        case 'noop':
          setStatus('ℹ️ 保存する変更がありませんでした');
          break;
        case 'error':
          setStatus('❌ 保存中にエラーが発生しました');
          break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      setStatus(`❌ ${message}`);
    }
  }, [requestSave]);

  return (
    <Container maxWidth="lg">
      <Box py={2}>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Typography variant="h4" component="h1">
            親ウィンドウ（画面A）
          </Typography>
          <Link href="/" passHref>
            <Button variant="outlined" size="small" component="a">
              トップに戻る
            </Button>
          </Link>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            postMessage APIによる同期的な保存処理のテスト
          </Typography>
          <Typography variant="body2" color="text.secondary">
            子ウィンドウを開き、「保存実行」ボタンで子ウィンドウの保存処理を同期的に実行します。
          </Typography>
        </Box>

        <Box display="flex" gap={2} mb={3}>
          <Button 
            variant="contained" 
            onClick={openChildWindow}
          >
            子ウィンドウを開く
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSave}
            disabled={!isChildOpen}
          >
            保存実行（子ウィンドウに送信）
          </Button>
        </Box>

        {status && (
          <Alert 
            severity={
              status.includes('✅') ? 'success' :
              status.includes('ℹ️') ? 'info' :
              status.includes('❌') ? 'error' : 'info'
            }
            sx={{ mb: 2 }}
          >
            {status}
          </Alert>
        )}

        <Box>
          <Typography variant="h6" gutterBottom>
            実装仕様:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>postMessage APIを使用した親子ウィンドウ間通信</li>
            <li>親から子へ同期的な保存リクエスト送信（await対応）</li>
            <li>5秒のタイムアウト処理</li>
            <li>保存結果: saved / noop / error</li>
            <li>イベントリスナーの自動クリーンアップ</li>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default ParentPage;